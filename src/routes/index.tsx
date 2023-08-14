import { RouterHook, ServerAPI } from "decky-frontend-lib";
import DeckyPluginRouterTest from "../pages/Test";
import Terminal from "../pages/Terminal";
import Terminals from "../pages/Terminals";
import { VFC } from "react";

export function registerRoutes(routerHook: RouterHook) {
    routerHook.addRoute('/terminals', Terminals, {
        exact: true,
    });

    routerHook.addRoute('/terminals/:id', Terminal, {
        exact: true,
    });

    routerHook.addRoute("/decky-plugin-test", DeckyPluginRouterTest, {
        exact: true,
    });
}

export function unregisterRoutes(routerHook: RouterHook) {
    routerHook.removeRoute('/terminals');
    routerHook.removeRoute('/terminals/:id');
    routerHook.removeRoute('/decky-plugin-test');
}