from typing import List, Optional
from decky_terminal import DeckyTerminal

import decky

class Plugin:
    decky_terminal = DeckyTerminal()

    async def is_running(self) -> bool:
        return Plugin.decky_terminal.is_running()

    async def get_terminals(self) -> List[dict]:
        terminals = Plugin.decky_terminal.get_terminals()
        output = []

        for terminal_id, terminal in terminals.items():
            result = terminal.serialize()
            result["id"] = terminal_id  # TODO: should a terminal own its ID?
            output.append(result)

        return output

    async def get_terminal(self, terminal_id: str) -> Optional[dict]:
        terminal = Plugin.decky_terminal.get_terminal(terminal_id)
        if terminal is None:
            return None

        return terminal.serialize()

    async def set_terminal_title(self, terminal_id: str, title: str) -> bool:
        Plugin.decky_terminal.set_terminal_title(terminal_id, title)

    async def create_terminal(self, terminal_id=None) -> bool:
        await Plugin.decky_terminal.create_terminal(terminal_id)
        return True

    async def remove_terminal(self, terminal_id) -> bool:
        try:
            await Plugin.decky_terminal.remove_terminal(terminal_id)
            return True
        except:
            return False
        
    async def send_terminal_input(self, terminal_id: str, data: str) -> bool:
        try:
            terminal = Plugin.decky_terminal.get_terminal(terminal_id)
            if terminal is not None:
                await terminal.send_input(data)
                return True
            return False
        except:
            return False

    async def send_terminal_buffer(self, terminal_id: str) -> bool:
        decky.logger.info("[terminal][INFO][%s] Received request to send terminal buffer.", terminal_id)
        try:
            terminal = Plugin.decky_terminal.get_terminal(terminal_id)
            if terminal is not None:
                await terminal.send_current_buffer()
                return True
            decky.logger.error("[terminal][ERROR][%s] Terminal not found.", terminal_id)
            return False
        except Exception as e:
            decky.logger.error("[terminal][ERROR][%s] Exception during send terminal buffer: %s", terminal_id, e)
            return False
        
    async def subscribe_terminal(self, terminal_id: str) -> bool:
        try:
            await Plugin.decky_terminal.subscribe(terminal_id)
            return True
        except:
            return False
    
    async def unsubscribe_terminal(self, terminal_id: str) -> bool:
        try:
            await Plugin.decky_terminal.unsubscribe(terminal_id)
            return True
        except:
            return False

    async def change_terminal_window_size(self, terminal_id, rows: int, cols: int) -> bool:
        try:
            terminal = Plugin.decky_terminal.get_terminal(terminal_id)
            if terminal is not None:
                await terminal.change_window_size(rows, cols)
                return True
            return False
        except:
            return False

    async def get_config(self) -> str:
        return await Plugin.decky_terminal.get_config()

    async def append_config(self, config: dict) -> str:
        return await Plugin.decky_terminal.append_config(config)

    async def get_shells(self) -> str:
        return await Plugin.decky_terminal.get_shells()

    async def get_default_shell(self) -> str:
        return await Plugin.decky_terminal.get_default_shell()

    async def set_default_shell(self, shell: str) -> bool:
        return await Plugin.decky_terminal.set_default_shell(shell)

    async def _main(self):
        pass

    async def _unload(self):
        pass

    async def _migration(self):
        pass
