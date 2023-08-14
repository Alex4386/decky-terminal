import {
  DialogButton,
  Router,
  SteamSpinner,
  useParams,
  ServerAPI,
} from "decky-frontend-lib";
import { VFC, useRef, useState, useEffect } from "react";
import { Terminal as XTermTerminal } from 'xterm';
import { AttachAddon } from "xterm-addon-attach";
import { FitAddon } from 'xterm-addon-fit';

import logo from "../../assets/logo.png";
import TerminalGlobal from "../common/global";
import XTermCSS from "../common/xterm_css";

const Terminal: VFC = () => {

  // I can't find RouteComponentParams :skull:
  const { id } = useParams() as any;
  const [loaded, setLoaded] = useState(false);


  // Create a ref to hold the xterm instance
  const xtermRef = useRef<XTermTerminal | null>(null);
  const xtermDiv = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fitAddon = new FitAddon()

  const connectIO = async () => {
    console.log('ConnectIO Triggered!');
    const serverAPI = TerminalGlobal.getServer()
    const result = await serverAPI.callPluginMethod<{}, number>("get_server_port", {});
    console.log('result', result)

    if (result.success) {
      console.log(result.result)
      const url = new URL('ws://localhost:'+result.result+'/v1/terminals/'+id);
      const ws = new WebSocket(url);

      wsRef.current = ws;

      const attachAddon = new AttachAddon(ws);
      xtermRef.current?.loadAddon(attachAddon);

      xtermRef.current?.loadAddon(fitAddon);
      fitAddon.fit()
      
      // Set the loaded state to true after xterm is initialized
      setLoaded(true);
      xtermRef.current?.open(xtermDiv.current as HTMLDivElement);
    }
  };

  useEffect(() => {
    if (!loaded) {
      // Initialize xterm instance and attach it to a DOM element
      const xterm = new XTermTerminal({
        //scrollback: 0,
        rows: 18,
      });
      xtermRef.current = xterm;

      console.log('xterm configured')
      connectIO()
    }

    // Clean up function
    return () => {
      // Dispose xterm instance when component is unmounted
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }

      if (wsRef.current) {
        wsRef.current.close()
      }
    };
  }, []);

  if (!loaded) return <SteamSpinner />

  return (
    <div style={{ marginTop: "25px", color: "white" }}>
      <XTermCSS />
      <h1>{id}</h1>
      <div ref={xtermDiv} style={{ height: "400px" }}></div>
    </div>
  );
};

export default Terminal;
