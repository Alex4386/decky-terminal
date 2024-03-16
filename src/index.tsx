import {
  definePlugin,
  ServerAPI,
  staticClasses,
} from "decky-frontend-lib";
import { FaTerminal } from "react-icons/fa";
import { registerRoutes, unregisterRoutes } from "./routes";
import SidePanel from "./panel";
import TerminalGlobal from "./common/global";

export default definePlugin((serverApi: ServerAPI) => {
  TerminalGlobal.setServer(serverApi);
  registerRoutes(serverApi.routerHook);

  return {
    title: <div className={staticClasses.Title}>Decky Terminal</div>,
    content: <SidePanel />,
    icon: <FaTerminal />,
    onDismount() {
      unregisterRoutes(serverApi.routerHook)
    },
  };
});
