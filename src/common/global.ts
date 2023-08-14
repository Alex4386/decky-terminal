import { ServerAPI } from "decky-frontend-lib";

class TerminalGlobal {
    // singleton serverAPI
    private static serverAPI: ServerAPI

    static setServer(serverAPI: ServerAPI) {
        this.serverAPI = serverAPI
    }

    static getServer(): ServerAPI {
        return this.serverAPI
    }
}

export default TerminalGlobal;
