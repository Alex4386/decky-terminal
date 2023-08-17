import {
  DialogButton,
  Router,
  SteamSpinner,
  useParams,
  TextField,
  Focusable,
} from "decky-frontend-lib";
import { VFC, useRef, useState, useEffect } from "react";
import { Terminal as XTermTerminal } from 'xterm';
import { AttachAddon } from "xterm-addon-attach";
import { FitAddon } from 'xterm-addon-fit';
import TerminalGlobal from "../common/global";
import XTermCSS from "../common/xterm_css";
import { FaKeyboard } from "react-icons/fa";

const Terminal: VFC = () => {

  // I can't find RouteComponentParams :skull:
  const { id } = useParams() as any;
  const [loaded, setLoaded] = useState(false);
  let prevId: string|undefined = undefined;

  // Create a ref to hold the xterm instance
  const xtermRef = useRef<XTermTerminal | null>(null);
  const xtermDiv = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fakeInputRef = useRef<typeof TextField | null>(null);

  const fitAddon = new FitAddon()

  const wrappedConnectIO = async () => {
    try {
      await connectIO()
    } catch(e) {
      console.error(e)
    }
  }

  const connectIO = async () => {
    console.log('ConnectIO Triggered!');
    prevId = id;

    const serverAPI = TerminalGlobal.getServer()
    const result = await serverAPI.callPluginMethod<{}, number>("get_server_port", {});
    
    const xterm = xtermRef.current
    if (xterm) {
      xterm.onResize((e) => {
        setWindowSize(e.rows, e.cols);
      });

      await setWindowSize(xterm.rows, xterm.cols);
    }

    if (result.success) {
      console.log('connectIO', result.result)

      const url = new URL('ws://127.0.0.1:'+result.result+'/v1/terminals/'+id);
      const ws = new WebSocket(url);

      if (wsRef.current !== null) {
        try {
          wsRef.current.close()
        } catch(e) {}
      }

      wsRef.current = ws;
      
      const attachAddon = new AttachAddon(ws);
      xterm?.loadAddon(attachAddon);
      
      // Set the loaded state to true after xterm is initialized
      setLoaded(true);
      if (fakeInputRef.current) {
        const inputBox = (fakeInputRef.current as any).m_elInput as HTMLInputElement;
        if (inputBox.tabIndex !== -1) {
          inputBox.tabIndex = -1;
          inputBox.addEventListener("click", (e) => {
            setFocusToTerminal();
          })
        }
      }
      xterm?.open(xtermDiv.current as HTMLDivElement);
    }
  };

  const setWindowSize = async (rows: number, cols: number) => {
    console.log('Setting WindowSize to', rows, cols);
    const serverAPI = TerminalGlobal.getServer()
    const result = await serverAPI.callPluginMethod<{
      id: string,
      rows: number,
      cols: number,
    }, number>("change_terminal_window_size", {
      id,
      rows,
      cols,
    });

    console.log('setWindowSize', result);
  }

  const openKeyboard = () => {
    console.error('openKeyboard triggered! DIRTY HACK IS NOW OUT IN WILD!');
    
    const fakeInput = fakeInputRef.current as any
    console.log('fakeInput', fakeInput)
    if (fakeInput?.m_elInput) {
      fakeInput.m_elInput.click()
    } else {
      fakeInput.click()
    }
  }

  const setFocusToTerminal = () => {
    setTimeout(() => {
      xtermRef.current?.focus()
    }, 500)
  }

  useEffect(() => {
    // Initialize xterm instance and attach it to a DOM element
    const xterm = new XTermTerminal({
      //scrollback: 0,
      rows: 18,
    });
    xtermRef.current = xterm;
    xtermRef.current?.loadAddon(fitAddon);

    console.log('xterm configured')
    wrappedConnectIO()

    // Clean up function
    return () => {
      // Dispose xterm instance when component is unmounted
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null;
      }
    };
  }, [ id ]);

  useEffect(() => {
    fitAddon.fit()
  });

  const ModifiedTextField = TextField as any;
  if (!loaded) return <SteamSpinner />

  return (
    <div style={{ padding: ".5rem 1rem", marginTop: "25px", color: "white" }}>
      <XTermCSS />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'}}>
        <h1>{id}</h1>
        <div style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem' }}>
          <DialogButton onClick={openKeyboard}><FaKeyboard /></DialogButton>
        </div>
      </div>
      <ModifiedTextField ref={fakeInputRef} style={{ display: 'none' }} onClick={setFocusToTerminal} />
      <div ref={xtermDiv} tabIndex={0} onClick={openKeyboard} style={{ height: "calc(100vh - 4.5rem)" }}></div>
    </div>
  );
};

export default Terminal;
