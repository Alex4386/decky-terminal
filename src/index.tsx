import {
  definePlugin,
  staticClasses,
} from "@decky/ui";
import { FaTerminal } from "react-icons/fa";
import { registerRoutes, unregisterRoutes } from "./routes";
import SidePanel from "./panel";

export default definePlugin(() => {
  registerRoutes();

  return {
    name: "Decky Terminal",
    title: <div className={staticClasses.Title}>Decky Terminal</div>,
    content: <SidePanel />,
    icon: <FaTerminal />,
    onDismount() {
      unregisterRoutes()
    },
  };
});
