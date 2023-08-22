import {
  DialogButton,
  GamepadEvent,
  SteamSpinner,
  useParams,
  TextField,
  Focusable,
  GamepadButton,
  Field,
} from "decky-frontend-lib";
import { VFC, useRef, useState, useEffect } from "react";
import { Terminal as XTermTerminal } from 'xterm';
import { AttachAddon } from "xterm-addon-attach";
import { FitAddon } from 'xterm-addon-fit';
import TerminalGlobal from "../common/global";
import XTermCSS from "../common/xterm_css";
import { FaExpand, FaGamepad, FaKeyboard, FaTimesCircle } from "react-icons/fa";

const Terminal: VFC = () => {

  // I can't find RouteComponentParams :skull:
  const { id } = useParams() as any;
  const [loaded, setLoaded] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [useGamepad, setUseGamepad] = useState(false);
  let prevId: string|undefined = undefined;

  // Create a ref to hold the xterm instance
  const xtermRef = useRef<XTermTerminal | null>(null);
  const xtermDiv = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fakeInputRef = useRef<typeof TextField | null>(null);

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

    const xterm = xtermRef.current

    const serverAPI = TerminalGlobal.getServer()
    const terminalResult = await serverAPI.callPluginMethod<{
      id: string
    }, number>("get_terminal", { id });
    if (terminalResult.success) {
      if (terminalResult.result === null) {
        xterm?.write("--- Terminal Not Found ---");
        history.back();
      }
    }

    const result = await serverAPI.callPluginMethod<{}, number>("get_server_port", {});
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
      ws.onclose = () => {
        xterm?.write("--- Terminal Disconnected ---")
      }
      
      const attachAddon = new AttachAddon(ws);
      xterm?.loadAddon(attachAddon);

      // Set the loaded state to true after xterm is initialized
      setLoaded(true);

      await xterm?.open(xtermDiv.current as HTMLDivElement);
      // wait for it!
      await (new Promise<void>((res) => setTimeout(res, 1)));


      const fitAddon = new FitAddon()
      xterm?.loadAddon(fitAddon);

      fitAddon.fit()

      if (xterm) {
        xterm.onResize((e) => {
          console.log('Resize triggered to ', xterm)
          setWindowSize(e.rows, e.cols);
        });

        await setWindowSize(xterm.rows, xterm.cols);
      }
      
      if (fakeInputRef.current) {
        const inputBox = (fakeInputRef.current as any).m_elInput as HTMLInputElement;
        if (inputBox.tabIndex !== -1) {
          inputBox.tabIndex = -1;
          inputBox.addEventListener("click", (e) => {
            setFocusToTerminal();
          })
        }
      }
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
    });
    xtermRef.current = xterm;
    
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

      setFullScreen(false)
    };
  }, [ id ]);

  const startFullScreen = () => {
    setFullScreen(true);
    //handleResize()
    setTimeout(() => {
      try {
        console.log('triggering fit!')
        if (xtermRef.current) {
          const xterm = xtermRef.current
          const fitAddon = new FitAddon()
          xtermRef.current.loadAddon(fitAddon)
          const res = fitAddon.proposeDimensions();
          if (res?.rows && res.cols) {
            xterm.resize(res.cols - 3, res.rows - 1)
          }
        }
        console.log('triggered fit!', xtermRef.current?.cols, xtermRef.current?.rows)
      } catch(e) {
        console.error(e)
      }
    }, 0);
  }

  const gamepadHandler = (evt: GamepadEvent) => {
    if (useGamepad || fullScreen) {
      console.log('gamepadEvent', evt);

      let command: string | undefined = undefined;
      switch (evt.detail.button) {
        case GamepadButton.DIR_UP:
          command = '\x1b[A';
          break;
        case GamepadButton.DIR_DOWN:
          command = '\x1b[B';
          break;
        case GamepadButton.DIR_RIGHT:
          command = '\x1b[C';
          break;
        case GamepadButton.DIR_LEFT:
          command = '\x1b[D';
          break;
      }

      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED && command) {
        wsRef.current.send(command)

        // refocus xterm
        if (useGamepad && !fullScreen) {
          setTimeout(() => {
            if (xtermRef.current) {
              xtermRef.current.focus()
            }
          }, 100)
        }
      }
    }
  }

  const ModifiedTextField = TextField as any;
  if (!loaded) return <SteamSpinner />

  return (
    <Focusable noFocusRing={true} onGamepadDirection={gamepadHandler} style={{ paddingTop: "2.5rem", color: "white" }}>
      <div style={{padding: fullScreen ? "0" : "0 1rem", }}>
        <XTermCSS />
        {
          (!fullScreen) ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'}}>
            <h1 style={{ margin: '1rem 0'}}>{id}</h1>
            <Focusable style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem' }}>
              <DialogButton style={{ minWidth: '1rem' }} onClick={() => setUseGamepad(!useGamepad)}>{!useGamepad ? <FaGamepad /> : <FaTimesCircle />}</DialogButton>
              <DialogButton style={{ minWidth: '1rem' }} onClick={openKeyboard}><FaKeyboard /></DialogButton>
              <DialogButton style={{ minWidth: '1rem' }} onClick={startFullScreen}><FaExpand /></DialogButton>
            </Focusable>
          </div> : <div></div>
        }
        
        <ModifiedTextField ref={fakeInputRef} style={{ display: 'none' }} onClick={setFocusToTerminal} />
        <div ref={xtermDiv} tabIndex={0} onClick={openKeyboard} style={{ background: '#000', padding: '0', height: fullScreen ? "calc(100vh - 5rem)" : "calc(100vh - 11rem)" }}></div>
      </div>
    </Focusable>
  );
};

export default Terminal;
