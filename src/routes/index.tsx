import { RouterHook } from "decky-frontend-lib";
import Settings from "../pages/Settings";
import Terminal from "../pages/Terminal";

export function registerRoutes(routerHook: RouterHook) {
    routerHook.addRoute('/terminals/:id', Terminal, {
        exact: true,
    });

    routerHook.addRoute("/decky-terminal/settings", Settings, {
        exact: true,
    });
}

export function unregisterRoutes(routerHook: RouterHook) {
    routerHook.removeRoute('/terminals/:id');
    routerHook.removeRoute('/decky-terminal/settings');
}
