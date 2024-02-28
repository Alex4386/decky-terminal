import asyncio
import collections
import fcntl
import os
import pty
import signal
import struct
import termios
from typing import List

from websockets import WebSocketServerProtocol

from .common import Common


class Terminal:
    _sync_size: int = 1000

    is_shell: bool = True
    cmdline: str = None
    process: asyncio.subprocess.Process = None

    master_fd: int
    slave_fd: int

    subscribers: List[WebSocketServerProtocol]
    buffer: collections.deque = None

    cols: int = 80
    rows: int = 24

    flags: dict = dict()

    title: str = ""
    _title_cache: bytes = b""

    def __init__(self, cmdline: str, is_shell: bool = True, **kwargs):
        self.cmdline = cmdline  # TODO: maybe raise ValueError? cmdline can't meaningfully be None or undefined since it must be available for _start_process

        self.is_shell = is_shell
        self.buffer = collections.deque([], maxlen=4096)
        self.subscribers = []

        self.flags = kwargs

    def _calculate_sync_size(self):
        size = self.cols * self.rows
        if size < 1000:
            return 1000
        else:
            return size * 5

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
        await self._start_process()

    async def shutdown(self):
        self._kill_process()
        await self.close_subscribers()
        self.subscribers = []

    async def change_window_size(self, rows: int, cols: int):
        if self._is_process_alive():
            await self._change_pty_size(rows, cols)
            await self.process.send_signal(signal.SIGWINCH)
            await self._write_stdin(f"\x1b[8;{rows};{cols}t".encode("utf-8"))

    async def _change_pty_size(self, rows: int, cols: int):
        self.rows = rows
        self.cols = cols

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

    # WORKERS ==============================================
    async def _process_subscriber(self, ws: WebSocketServerProtocol):
        await ws.send(bytes(self.buffer))
        if not self._is_process_started():
            await self.start()

        while not ws.closed:
            try:
                data = await ws.recv()
                if isinstance(data, str):
                    data = data.encode("utf-8")

                await self._write_stdin(data)
            except Exception as e:
                print("Exception", e)

            await asyncio.sleep(0)

    # PROCESS CONTROL =======================================
    def get_terminal_env(self):
        result = dict(os.environ)

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

    async def _start_process(self):
        self.master_fd, self.slave_fd = pty.openpty()

        await self._change_pty_size(self.rows, self.cols)
        self.process = await asyncio.create_subprocess_exec(
            self.cmdline,
            preexec_fn=os.setsid,
            stdout=self.slave_fd,
            stderr=self.slave_fd,
            stdin=self.slave_fd,
            env=self.get_terminal_env(),
            cwd=os.getenv("HOME"),
        )

        asyncio.ensure_future(self._read_output_loop())

    def _kill_process(self):
        if self._is_process_alive():
            self.process.kill()

        try:
            os.close(self.master_fd)
            os.close(self.slave_fd)
        except Exception as e:
            print(e)

    # WEBSOCKET =============================================
    def add_subscriber(self, ws: WebSocketServerProtocol):
        if not self.is_subscriber(ws):
            self.subscribers.append(ws)
            asyncio.ensure_future(self._process_subscriber(ws))

    def is_subscriber(self, ws: WebSocketServerProtocol):
        try:
            self.subscribers.index(ws)
            return True
        except ValueError:
            return False

    # WEBSOCKET - INTERNAL ==================================
    async def _remove_subscriber(self, ws: WebSocketServerProtocol):
        # Internal only!
        if self.is_subscriber(ws):
            self.subscribers.remove(ws)
            if not ws.closed:
                await ws.close()

    # BROADCAST =============================================
    async def broadcast_subscribers(self, data: bytes):
        closed = []
        for ws in self.subscribers:
            if ws.closed:
                closed.append(ws)
                continue
            await ws.send(data)

        for ws in closed:
            await self._remove_subscriber(ws)

    async def close_subscribers(self):
        for ws in self.subscribers:
            await self._remove_subscriber(ws)

    # IS ALIVE ==============================================
    def _is_process_started(self):
        return self.process is not None

    def _is_process_alive(self):
        return self._is_process_started() and self.process.returncode is None

    def _is_process_completed(self):
        return self._is_process_started() and self.process.returncode

    # PROCESS CONTROL =======================================
    async def _write_stdin(self, input: bytes):
        await Common._run_async(os.write, self.master_fd, input)
        await Common._run_async(os.fsync, self.master_fd)

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
                print(e)
                pass

            await asyncio.sleep(0)

    def _put_buffer(self, chars: bytes):
        for i in chars:
            self.buffer.append(i)
        self._process_title(chars)

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
