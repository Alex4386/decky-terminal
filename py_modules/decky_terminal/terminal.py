import asyncio
import collections
import os
import pty
import signal
import struct
import termios
import decky
import uuid
from typing import List

from .common import Common

class Terminal:
    id: str = str(uuid.uuid4())
    _sync_size: int = 1000
    encoding = "utf-8"

    is_shell: bool = True
    cmdline: str = None
    process: asyncio.subprocess.Process = None

    master_fd: int
    slave_fd: int

    buffer: collections.deque = None
    stdin_buffer: collections.deque = None

    cols: int = 80
    rows: int = 24

    flags: dict = dict()
    is_subscribed: bool = False

    title: str = ""
    _title_cache: bytes = b""

    _optimize_clears: bool = True
    _baud_rate: int = 38400

    def __init__(self, id: str, cmdline: str, is_shell: bool = True, **kwargs):
        self.id = id
        self.cmdline = cmdline  # TODO: maybe raise ValueError? cmdline can't meaningfully be None or undefined since it must be available for _start_process

        self.is_shell = is_shell
        self.buffer = collections.deque([], maxlen=self._baud_rate)
        self.stdin_buffer = collections.deque([], maxlen=self._baud_rate)
        self.is_subscribed = False

        self.flags = kwargs
        decky.logger.info("[terminal][INFO][%s] New terminal instance created.", self.id)

    def _calculate_sync_size(self):
        size = self.cols * self.rows
        if size < 1000:
            return 1000
        else:
            return size * 5
        
    # INPUT HANDLER ========================================
    async def send_input(self, data: str):
        self.stdin_buffer.append(bytes(data, self.encoding))
        
    # SUBSCRIPTION =========================================
    def subscribe(self):
        self.is_subscribed = True

    def unsubscribe(self):
        self.is_subscribed = False

    # SERIALIZE ============================================
    def serialize(self) -> dict:
        data = dict(
            is_started=self._is_process_started(),
            is_completed=self._is_process_completed(),
        )

        if self.process is not None:
            data["pid"] = self.process.pid

            if self.process.returncode is not None:
                data["exitcode"] = self.process.returncode

        # self.title is not None, whitespace or empty
        if self.title is not None and self.title.strip():
            data["title"] = self.title

        return data

    # CONTROL ==============================================
    async def start(self):
        decky.logger.info("[terminal][INFO][%s] Starting shell.", self.id)
        await self._start_process()

    async def shutdown(self):
        self._kill_process()

    async def change_window_size(self, rows: int, cols: int):
        if self._is_process_alive():
            await self._change_pty_size(rows, cols)
            await self.process.send_signal(signal.SIGWINCH)
            await self._write_stdin(f"\x1b[8;{rows};{cols}t".encode(self.encoding))

    async def _change_pty_size(self, rows: int, cols: int):
        self.rows = rows
        self.cols = cols

        try:
            import fcntl
            if self.master_fd is not None:
                new_size = struct.pack("HHHH", rows, cols, 0, 0)
                await Common._run_async(
                    fcntl.ioctl, self.master_fd, termios.TIOCSWINSZ, new_size
                )

            if self.slave_fd is not None:
                new_size = struct.pack("HHHH", rows, cols, 0, 0)
                await Common._run_async(
                    fcntl.ioctl, self.slave_fd, termios.TIOCSWINSZ, new_size
                )
        except Exception as e:
            # Windows? Maybe not a tty?
            pass

    # WORKERS ==============================================
    async def _process_subscriber(self):
        while self._is_process_alive():
            while len(self.stdin_buffer) > 0:
                try:
                    # pop the buffers and flush into the process
                    await self._write_stdin(self.stdin_buffer.popleft())
                except Exception as e:
                    decky.logger.exception("[terminal][EXCEPTION][%s] Exception during process subscriber: %s", self.id, e)
            
            try:
                await asyncio.sleep(0.01)
            except:
                pass

    # PROCESS CONTROL =======================================
    def get_terminal_env(self):
        result = dict(os.environ)

        # Disable Steam internal library paths since it interferes with applications.
        # TODO: Add option to enable Steam-internal libraries
        if "LD_LIBRARY_PATH" in result:
            del result["LD_LIBRARY_PATH"]

        result.update({
            "TERM": "xterm-256color",
            "PWD": result["HOME"],
            "SSH_TTY": os.ttyname(self.slave_fd),
            "LINES": str(self.rows),
            "COLUMNS": str(self.cols),
            "XDG_RUNTIME_DIR": f"/run/user/{os.getuid()}"
        })

        if self.cmdline is not None and self.is_shell:
            result["SHELL"] = self.cmdline

        if self.flags.get("use_display"):
            result["DISPLAY"] = ":0"

        return result
    
    def _handle_preexec_fn(self):
        os.setsid()

        # mark as interactive
        try:
            import fcntl
            if self.slave_fd is not None:
                fcntl.ioctl(self.slave_fd, termios.TIOCSCTTY, 0)
        except Exception as e:
            pass


    async def _start_process(self):
        self.master_fd, self.slave_fd = pty.openpty()

        await self._change_pty_size(self.rows, self.cols)
        self.process = await asyncio.create_subprocess_exec(
            self.cmdline,
            preexec_fn=self._handle_preexec_fn,
            stdout=self.slave_fd,
            stderr=self.slave_fd,
            stdin=self.slave_fd,
            env=self.get_terminal_env(),
            cwd=os.getenv("HOME"),
        )

        asyncio.ensure_future(self._read_output_loop())
        asyncio.ensure_future(self._process_subscriber())

    def _kill_process(self):
        if self._is_process_alive():
            self.process.kill()

        try:
            os.close(self.master_fd)
            os.close(self.slave_fd)
        except Exception as e:
            decky.logger.exception("[terminal][EXCEPTION][%s] Exception during kill process: %s", self.id, e)

    # BROADCAST =============================================
    async def broadcast_subscribers(self, data: bytes):
        if self.is_subscribed:
            await decky.emit("terminal_output#"+self.id, data.decode())

    async def send_current_buffer(self):
        await self.broadcast_subscribers(bytes(self.buffer))

    # IS ALIVE ==============================================
    def _is_process_started(self):
        return self.process is not None

    def _is_process_alive(self):
        return self._is_process_started() and self.process.returncode is None

    def _is_process_completed(self):
        return self._is_process_started() and self.process.returncode is not None

    # OPTIMIZATION ==========================================
    def _detect_ansi_clear_and_remove_prepends(self, chars: bytes) -> bytes:
        clear_sequences = [
            b"\x1b[H\x1b[2J",  # Cursor home + clear screen
            b"\x1b[2J",        # Clear screen
            b"\x1b[3J",        # Clear scrollback
        ]

        last_index = -1
        matched_seq = None

        for seq in clear_sequences:
            idx = chars.rfind(seq)
            if idx > last_index:
                last_index = idx
                matched_seq = seq

        if last_index != -1:
            self.buffer.clear()
            return chars[last_index:]  # Return data from the last clear sequence

        return chars

    # PROCESS CONTROL =======================================
    async def _write_stdin(self, input: bytes):
        await Common._run_async(os.write, self.master_fd, input)

    async def _read_output(self) -> bytes:
        output = await Common._run_async(
            os.read, self.master_fd, self._calculate_sync_size()
        )
        if len(output) > 0:
            self._put_buffer(output)
            await self.broadcast_subscribers(output)
            return output

    async def _read_output_loop(self):
        while self._is_process_alive():
            try:
                await self._read_output()
            except Exception as e:
                decky.logger.exception("[terminal][EXCEPTION][%s] Exception during output read: %s", self.id, e)
                pass

            # Workaround for yielding to the event loop
            # TODO: properly implement a more efficient way to broadcast output via event driven mechanism
            await asyncio.sleep(0.01)

    def _put_buffer(self, chars: bytes):
        self._process_title(chars)

        if self._optimize_clears:
            chars = self._detect_ansi_clear_and_remove_prepends(chars)
        
        for i in chars:
            self.buffer.append(i)

    def _process_title(self, chars: bytes):
        try:
            idx = chars.rindex(b"\x21]")

            validity_check = (48 <= chars[idx + 2] <= 50) and (chars[idx + 3] == 59)
            if not validity_check:
                return

            try:
                final_idx = chars.rindex(b"\x07", idx + 4)
                self.title = str(chars[idx + 4 : final_idx])
            except:
                pass
        except:
            pass
