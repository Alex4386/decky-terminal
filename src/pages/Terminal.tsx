import {
  DialogButton,
  Router,
  SteamSpinner,
  useParams,
  TextField,
  ButtonItem,
} from "decky-frontend-lib";
import { VFC, useRef, useState, useEffect } from "react";
import { Terminal as XTermTerminal } from 'xterm';
import { AttachAddon } from "xterm-addon-attach";
import { FitAddon } from 'xterm-addon-fit';

import logo from "../../assets/logo.png";
import TerminalGlobal from "../common/global";
import XTermCSS from "../common/xterm_css";
import { FaKeyboard } from "react-icons/fa";

const Terminal: VFC = () => {

  // I can't find RouteComponentParams :skull:
  const { id } = useParams() as any;
  const [loaded, setLoaded] = useState(false);


  // Create a ref to hold the xterm instance
  const xtermRef = useRef<XTermTerminal | null>(null);
  const xtermDiv = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fakeInputRef = useRef<typeof TextField | null>(null);

  const fitAddon = new FitAddon()

  const connectIO = async () => {
    console.log('ConnectIO Triggered!');
    const serverAPI = TerminalGlobal.getServer()
    const result = await serverAPI.callPluginMethod<{}, number>("get_server_port", {});
    console.log('result', result)

    if (result.success) {
      console.log(result.result)
      const url = new URL('ws://127.0.0.1:'+result.result+'/v1/terminals/'+id);
      const ws = new WebSocket(url);

      wsRef.current = ws;

      const attachAddon = new AttachAddon(ws);
      xtermRef.current?.loadAddon(attachAddon);
      
      // Set the loaded state to true after xterm is initialized
      setLoaded(true);
      xtermRef.current?.open(xtermDiv.current as HTMLDivElement);
    }
  };

  const openKeyboard = () => {
    console.error('openKeyboard triggered! DIRTY HACK IS NOW OUT IN WILD!');
    
    const fakeInput = fakeInputRef.current as any
    console.log('fakeInput', fakeInput)
    if (fakeInput?.m_elInput) {
      fakeInput.m_elInput.click()
    } else {
      fakeInput.click()
    }

    setTimeout(() => {
      xtermRef.current?.focus()
    }, 500)
  }

  useEffect(() => {
    if (!loaded) {
      // Initialize xterm instance and attach it to a DOM element
      const xterm = new XTermTerminal({
        //scrollback: 0,
        rows: 18,
      });
      xtermRef.current = xterm;
      xtermRef.current?.loadAddon(fitAddon);

      console.log('xterm configured')
      connectIO()
    }
    fitAddon.fit()

    // Clean up function
    return () => {
      // Dispose xterm instance when component is unmounted
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }

      if (wsRef.current) {
        wsRef.current.close()
      }

      setLoaded(false)
    };
  }, []);

  const ModifiedTextField = TextField as any
  if (!loaded) return <SteamSpinner />

  return (
    <div style={{ padding: ".5rem 1rem", marginTop: "25px", color: "white" }}>
      <XTermCSS />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'}}>
        <h1>{id}</h1>
        <div style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem' }}>
          <ButtonItem onClick={openKeyboard}><FaKeyboard /></ButtonItem>
        </div>
      </div>
      <ModifiedTextField ref={fakeInputRef} style={{ display: 'none' }} />
      <div ref={xtermDiv} onClick={openKeyboard} style={{ height: "calc(100vh - 3rem)" }}></div>
    </div>
  );
};

export default Terminal;
