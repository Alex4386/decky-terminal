from websockets import server
import random
import asyncio
from .terminal import Terminal
from typing import List, Dict

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

    # TERMINAL CREATION =====================================
    def create_terminal(self, id: str, cmdline: str = "/bin/bash"):
        if self._terminal_sessions.get(id) is None:
            self._terminal_sessions[id] = Terminal(cmdline)
    
    async def remove_terminal(self, id: str):
        if self._terminal_sessions.get(id) is not None:
            terminal: Terminal = self._terminal_sessions[id]
            await terminal.shutdown()
            del self._terminal_sessions[id]
    
    def get_terminal(self, id) -> Terminal:
        return self._terminal_sessions[id]
    
    def get_terminal_ids(self) -> List[str]:
        return self._terminal_sessions.keys()
    
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
        
        self._kill_all_terminals()
        self._server_cleanup()
        self._server_port = -1

    # SERVER HANDLER ========================================
    async def handler(self, ws: server.WebSocketServerProtocol, path: str):
        if path.startswith("/v1/terminals/"):
            splitted = path.split("?", 1)

            target_path = splitted[0]
            query_string = None if len(splitted) == 1 else splitted[1]
            
            # TODO: This parsing mechanism sucks - make it better
            terminal_id = target_path.replace("/v1/terminals/", "", 1)
            return await self.terminal_handler(ws, terminal_id)
        elif path == "/echo":
            return await self.echo_handler(ws)
        else:
            await ws.close()
        
    async def terminal_handler(self, ws: server.WebSocketServerProtocol, id: str):
        terminal = self.get_terminal(id)

        if terminal is not None:
            terminal.add_subscriber(ws)
            await ws.wait_closed()
            terminal._remove_subscriber(ws)
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

