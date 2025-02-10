import asyncio
import json
import os
import platform
import random
import uuid
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from decky_plugin import DECKY_PLUGIN_SETTINGS_DIR

from .common import Common
from .terminal import Terminal
from .nato import phoneticize


class DeckyTerminal:
    _event_loop = None
    _terminal_sessions = dict()

    def __init__(self) -> None:
        self._event_loop = asyncio.get_event_loop()

    # GET_FETCH =============================================
    def is_running(self):
        # Deprecated
        return True

    # GET_SHELL =============================================
    async def get_shells(self) -> List[str]:
        if platform.system() == "Windows":
            return ["powershell", "cmd"]
        else:
            data = await Common.read_file("/etc/shells")
            if data is not None:
                shells = data.splitlines()
                shells = list(filter(self._is_unix_shell_path, shells))
                if shells:
                    return shells

            return ["/bin/sh"]

    def _is_unix_shell_path(self, path: str) -> bool:
        return path.startswith("/")

    # CONFIG ================================================
    def get_config_filename(self) -> str:
        return os.path.join(DECKY_PLUGIN_SETTINGS_DIR, "config.json")

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
    
    # SUBSCRIPTION ============================================
    async def subscribe(self, terminal_id: str) -> bool:
        term = self.get_terminal(terminal_id)         
        if term is not None:
            return term.subscribe()
        
        return False

    async def unsubscribe(self, terminal_id: str) -> bool:
        term = self.get_terminal(terminal_id)         
        if term is not None:
            return term.unsubscribe()
        
        return True

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
    async def create_terminal(self, terminal_id: str = None, cmdline: Optional[str] = None):
        if cmdline is None:
            cmdline = await self.get_default_shell()

        flags = await self._get_terminal_flags()

        if terminal_id is None:
            terminal_id = str(uuid.uuid4())

        if self._terminal_sessions.get(terminal_id) is None:
            self._terminal_sessions[terminal_id] = Terminal(terminal_id, cmdline, **flags)
            self._terminal_sessions[terminal_id].title = phoneticize(terminal_id[0:4])

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

    # TERMINAL CONTROL ======================================
    async def _kill_all_terminals(self):
        for _terminal in self._terminal_sessions.values():
            terminal: Terminal = _terminal
            await terminal.shutdown()

        self._terminal_sessions = dict()
