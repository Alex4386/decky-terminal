import random
from typing import List, Optional
from decky_terminal import DeckyTerminal

class Plugin:
    decky_terminal = DeckyTerminal()

    async def is_server_running(self) -> bool:
        return Plugin.decky_terminal.is_running()

    async def get_server_port(self) -> int:
        return Plugin.decky_terminal.get_server_port()

    async def get_terminals(self) -> List[dict]:
        terminals = Plugin.decky_terminal.get_terminals()
        output = []

        for id, terminal in terminals.items():
            result = terminal.serialize()
            output.append(dict(
                id=id,
                **result,
            ))
        
        return output

    async def get_terminal(self, id: str) -> Optional[dict]:
        terminal = Plugin.decky_terminal.get_terminal(id)
        if terminal is None:
            return None
        
        return terminal.serialize()

    async def set_terminal_title(self, id: str, title: str) -> bool:
        Plugin.decky_terminal.set_terminal_title(id, title)

    async def create_terminal(self, id = None) -> bool:
        if id is None:
            id = "term_"+str(random.randint(100, 999))
        
        await Plugin.decky_terminal.create_terminal(id)
        return True

    async def remove_terminal(self, id) -> bool:
        try:
            await Plugin.decky_terminal.remove_terminal(id)
            return True
        except:
            return False

    async def change_terminal_window_size(self, id, rows: int, cols: int) -> bool:
        try:
            terminal = Plugin.decky_terminal.get_terminal(id)
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

    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        #decky_plugin.logger.info("Hello World!")
        await Plugin.decky_terminal.start_server()

    # Function called first during the unload process, utilize this to handle your plugin being removed
    async def _unload(self):
        #decky_plugin.logger.info("Goodbye World!")
        await Plugin.decky_terminal.stop_server()

    # Migrations that should be performed before entering `_main()`.
    async def _migration(self):
        pass

    async def _internal_test(self):
        await self._main()
        print(Plugin.decky_terminal.get_server_port())

        await Plugin.decky_terminal.create_terminal('testterm')
        print('testterm created.')

#plugin = Plugin()
#loop = asyncio.get_event_loop()
#asyncio.ensure_future(plugin._internal_test(), loop=loop)
#loop.run_forever()
