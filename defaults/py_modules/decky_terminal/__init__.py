import asyncio
import json
import os
import platform
import random
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from decky_plugin import DECKY_PLUGIN_SETTINGS_DIR
from websockets import server

from .common import Common
from .terminal import Terminal


class DeckyTerminal:
    _bind_address = "127.0.0.1"

    _server_port = -1
    _event_loop = None

    _server: server.WebSocketServer = None
    _server_future: asyncio.Future = None

    _terminal_sessions = dict()

    def __init__(self) -> None:
        self._event_loop = asyncio.get_event_loop()

    # GET_FETCH =============================================
    def is_running(self):
        return self._server_port > 0

    def get_server_port(self):
        return self._server_port

    # GET_SHELL =============================================
    async def get_shells(self) -> List[str]:
        if platform.system() == "Windows":
            return ["powershell", "cmd"]
        else:
            try:
                data = await Common.read_file("/etc/shells")
                if data is None:
                    raise IOError()

                shells = data.splitlines()
                shells = list(filter(self._is_unix_shell_path, shells))
                if len(shells) < 1:
                    return ["/bin/sh"]

                return shells
            except:
                return ["/bin/sh"]

    def _is_unix_shell_path(self, path: str) -> bool:
        return len(path) > 0 and path.startswith("/") and not path.isspace()

    # CONFIG ================================================
    def get_config_filename(self) -> str:
        return DECKY_PLUGIN_SETTINGS_DIR + os.sep + "config.json"

    async def get_config(self) -> dict:
        config = await self._get_config()
        if config is None:
            config = dict(
                __version__=1,
            )
            await self._write_config(config)

        return config

    async def append_config(self, new_config: Dict[str, Any]) -> bool:
        prev_config = await self._get_config()
        if prev_config is None:
            prev_config = dict(
                __version__=1,
            )

        config = Common.merge_dict(prev_config, new_config)
        return await self._write_config(config)

    async def get_default_shell(self) -> str:
        config = await self.get_config()

        if config is None:
            return (await self.get_shells())[0]

        shell = config.get("default_shell")
        if shell is None:
            return (await self.get_shells())[0]

        return shell

    async def set_default_shell(self, shell: str) -> bool:
        return await self.append_config(dict(default_shell=shell))

    # CONFIG - INTERNAL =======================================
    async def _get_config(self) -> Optional[dict]:
        try:
            data = await Common.read_file(self.get_config_filename())
            if data is None:
                raise IOError()

            return json.loads(data)
        except IOError:
            return None

    async def _write_config(self, config: dict) -> bool:
        return await Common.write_file(self.get_config_filename(), json.dumps(config))

    async def _get_terminal_flags(self) -> dict:
        flags = dict()
        config = await self._get_config()

        if config is not None:
            if config.get("use_display") is not None:
                use_display = config.get("use_display")
                if isinstance(use_display, bool):
                    flags["use_display"] = use_display

        return flags

    # TERMINAL CREATION =====================================
    async def create_terminal(self, terminal_id: str, cmdline: Optional[str] = None):
        if cmdline is None:
            cmdline = await self.get_default_shell()

        print("cmdline!!!!", cmdline)
        flags = await self._get_terminal_flags()

        if self._terminal_sessions.get(terminal_id) is None:
            self._terminal_sessions[terminal_id] = Terminal(cmdline, **flags)

    async def remove_terminal(self, terminal_id: str):
        if self._terminal_sessions.get(terminal_id) is not None:
            terminal: Terminal = self._terminal_sessions[terminal_id]
            await terminal.shutdown()
            del self._terminal_sessions[terminal_id]

    def get_terminal(self, terminal_id) -> Optional[Terminal]:
        return self._terminal_sessions.get(terminal_id)

    def get_terminal_ids(self) -> List[str]:
        return self._terminal_sessions.keys()

    def set_terminal_title(self, terminal_id, title):
        term = self.get_terminal(terminal_id)
        if term is not None:
            term.title = title

    def get_terminals(self) -> Dict[str, Terminal]:
        return self._terminal_sessions

    # SERVER CONTROL ========================================
    async def start_server(self) -> bool:
        if self.is_running():
            return False

        await self._start_server()
        asyncio.ensure_future(self._server_wait(), loop=self._event_loop)

    async def stop_server(self) -> bool:
        if not self.is_running():
            return False

        await self._kill_all_terminals()
        self._server_cleanup()
        self._server_port = -1

    # SERVER HANDLER ========================================
    async def handler(self, ws: server.WebSocketServerProtocol, path: str):
        if path.startswith("/v1/terminals/"):
            url = urlparse(path)
            terminal_id = url.path.split("/")[-1]
            return await self.terminal_handler(ws, terminal_id)
        elif path == "/echo":
            return await self.echo_handler(ws)
        else:
            await ws.close()

    async def terminal_handler(self, ws: server.WebSocketServerProtocol, terminal_id: str):
        terminal = self.get_terminal(terminal_id)

        if terminal is not None:
            terminal.add_subscriber(ws)
            await ws.wait_closed()
            await terminal._remove_subscriber(ws)
        else:
            await ws.close()

    async def echo_handler(self, ws: server.WebSocketServerProtocol):
        while not ws.closed:
            try:
                data = await ws.recv()
                await ws.send(data)
                await asyncio.sleep(0)
            except:
                pass

    # TERMINAL CONTROL ======================================
    async def _kill_all_terminals(self):
        for _terminal in self._terminal_sessions.values():
            terminal: Terminal = _terminal
            await terminal.shutdown()

        self._terminal_sessions = dict()

    # SERVER STUFF ============================================================
    async def _start_server(self):
        # terminate existing
        self._server_cleanup()

        port = self._get_random_port()
        ws_server = await server.serve(self.handler, self._bind_address, port)
        self._server_port = port
        self._server = ws_server

    async def _server_wait(self):
        future = asyncio.Future(loop=self._event_loop)
        self._server_future = future
        await future
        self._server_cleanup()

    def _server_cleanup(self):
        if self._server_future is not None:
            self._server_future.done()
            self._server_future = None

        if self._server is not None:
            self._server.close()
            self._server = None

    # UTILS =====================================================================
    def _get_random_port(self) -> int:
        return random.randint(10000, 19999)
