import sys
import asyncio

try:
    import decky_plugin
except ImportError:
    pass

try:
    from decky_terminal import DeckyTerminal
except Exception as e:
    print('[DeckyTerminal] Import Failed:', type(e), e)
    raise e

class Plugin:
    decky_terminal = DeckyTerminal()

    async def is_server_running(self) -> bool:
        return Plugin.decky_terminal.is_running()

    async def get_server_port(self) -> int:
        return Plugin.decky_terminal.get_server_port()

    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        #decky_plugin.logger.info("Hello World!")
        await Plugin.decky_terminal.start_server()

        Plugin.decky_terminal.create_terminal("testterm")

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

        Plugin.decky_terminal.create_terminal('testterm')
        print('testterm created.')

#plugin = Plugin()
#loop = asyncio.get_event_loop()
#asyncio.ensure_future(plugin._internal_test(), loop=loop)
#loop.run_forever()
