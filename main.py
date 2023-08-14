import os

# STOP!
# This is stub file. This will be replaced by defaults/main.py on build time

# The decky plugin module is located at decky-loader/plugin
# For easy intellisense checkout the decky-loader code one directory up
# or add the `decky-loader/plugin` path to `python.analysis.extraPaths` in `.vscode/settings.json`
import decky_plugin

class Plugin:
    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        decky_plugin.logger.info("Hello World!")

    # Function called first during the unload process, utilize this to handle your plugin being removed
    async def _unload(self):
        decky_plugin.logger.info("Goodbye World!")
        pass

    # Migrations that should be performed before entering `_main()`.
    async def _migration(self):
        pass
