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
import { FaExpand, FaGamepad, FaKeyboard, FaTerminal, FaTimesCircle } from "react-icons/fa";

const Terminal: VFC = () => {

  // I can't find RouteComponentParams :skull:
  const { id } = useParams() as any;
  const [loaded, setLoaded] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [config, setConfig] = useState<Record<string, any> | null>(null);
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

  const getConfig = async (): Promise<Record<string, any>|undefined> => {
    const serverAPI = TerminalGlobal.getServer()
    const config = await serverAPI.callPluginMethod<{}, string[]>("get_config", {});
    console.log('getConfig', config);
    if (config.success) {
        setConfig(config.result)

        return config.result;
    }

    return;
  }

  const updateTitle = async (title: string): Promise<Record<string, any>|undefined> => {
    const serverAPI = TerminalGlobal.getServer()
    await serverAPI.callPluginMethod<{ id: string, title: string }, string[]>("set_terminal_title", { id, title });

    return;
  }

  const connectIO = async () => {
    console.log('ConnectIO Triggered!');
    prevId = id;
    setTitle(id);

    const xterm = xtermRef.current

    const serverAPI = TerminalGlobal.getServer()
    const localConfig = await getConfig()
    console.log('config', config, 'localConfig', localConfig);
    if (localConfig && xterm) {
      if (localConfig.__version__ === 1) {
        if (localConfig.font_family?.trim()) {
          xterm.options.fontFamily = localConfig.font_family;
        }

        if (localConfig.font_size) {
          const fs = parseInt(localConfig.font_size);
          if (!isNaN(fs) && fs > 0) {
            xterm.options.fontSize = fs;
          }
        }

        console.log('xterm.options', xterm.options)
      }
    }

    const terminalResult = await serverAPI.callPluginMethod<{
      id: string
    }, number>("get_terminal", { id });
    if (terminalResult.success) {
      if (terminalResult.result === null) {
        xterm?.write("--- Terminal Not Found ---");
        history.back();
      }
      if ((terminalResult.result as any)?.title) {
        const title = (terminalResult.result as any)?.title;
        setTitle(title)
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
        xterm?.write("\r\n--- Terminal Disconnected ---")
      }

      if (xterm) {
        xterm.onTitleChange((title) => {
          setTitle(title)
          updateTitle(title)
        })
      }
      
      const attachAddon = new AttachAddon(ws);
      xterm?.loadAddon(attachAddon);

      // Set the loaded state to true after xterm is initialized
      setLoaded(true);

      await xterm?.open(xtermDiv.current as HTMLDivElement);
      // wait for it!
      await (new Promise<void>((res) => setTimeout(res, 1)));
      fitToScreen()

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
    if (config?.disable_virtual_keyboard) {
      setFocusToTerminal();
      return;
    }

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
    }, 100)
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

  const fitToScreen = (_fullScreen?: boolean) => {
    const isFullScreen = _fullScreen === undefined ? fullScreen : _fullScreen
    
    if (xtermRef.current) {
      const xterm = xtermRef.current

      const fitAddon = new FitAddon()
      xtermRef.current.loadAddon(fitAddon)
      const res = fitAddon.proposeDimensions();
      if (res?.rows && res.cols) {
        const colOffset = (Math.ceil(30 / xterm.options.fontSize));
        if (isFullScreen) xterm.resize(res.cols - colOffset, res.rows - 1)
        else xterm.resize(res.cols + colOffset, res.rows)
        //
      }

      console.log('triggered fit!', xtermRef.current?.cols, xtermRef.current?.rows)
    }
  }

  const startFullScreen = () => {
    setFullScreen(true);
    //handleResize()
    setTimeout(() => {
      try {
        fitToScreen(true)
      } catch(e) {
        console.error(e)
      }
    }, 0);
  }

  const gamepadHandler = (evt: GamepadEvent) => {
    if (config?.use_dpad) {
      console.log('gamepadEvent', evt);
      evt.preventDefault();

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
        if (config?.use_dpad && !fullScreen) {
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
    <Focusable noFocusRing={true} onGamepadDirection={gamepadHandler} style={{ margin: 0, padding: 0, paddingTop: "2.5rem", color: "white", width: '100vw' }}>
      <div style={{padding: fullScreen ? "0" : "0 1rem", }}>
        <XTermCSS />
        {
          (!fullScreen) ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'}}>
            <h1 style={{ margin: '1rem 0'}}>{title}</h1>
            <Focusable style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem' }}>
              {
                !config?.disable_virtual_keyboard ? 
                  <DialogButton style={{ minWidth: '1rem' }} onClick={openKeyboard}><FaKeyboard /></DialogButton> :
                  <DialogButton style={{ minWidth: '1rem' }} onClick={setFocusToTerminal}><FaTerminal /></DialogButton>
              }
              <DialogButton style={{ minWidth: '1rem' }} onClick={startFullScreen}><FaExpand /></DialogButton>
            </Focusable>
          </div> : <div></div>
        }
        
        {
          config?.disable_virtual_keyboard && fullScreen ?
          <DialogButton style={{ visibility: 'hidden', zIndex: -10, position: 'absolute' }} onClick={setFocusToTerminal}></DialogButton> :
            <ModifiedTextField ref={fakeInputRef} disabled={config?.disable_virtual_keyboard ?? false} style={{ display: 'none' }} onClick={setFocusToTerminal} />
        }
        <Focusable onClick={openKeyboard} style={{boxSizing: 'content-box'}}>
          <div ref={xtermDiv} style={{ width: '100%', maxWidth: '100vw', margin: 0, background: '#000', padding: 0, height: fullScreen ? "calc(100vh - 5rem)" : "calc(100vh - 11rem)" }}></div>
        </Focusable>
      </div>
    </Focusable>
  );
};

export default Terminal;
