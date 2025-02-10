import {
  DialogButton,
  GamepadEvent,
  SteamSpinner,
  useParams,
  TextField,
  Focusable,
  GamepadButton,
  staticClasses,
} from "@decky/ui";
import { call, addEventListener, removeEventListener } from "@decky/api";
import { VFC, useRef, useState, useEffect } from "react";
import { Terminal as XTermTerminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import XTermCSS from "../common/xterm_css";
import { FaArrowDown, FaArrowLeft, FaArrowRight, FaArrowUp, FaChevronCircleLeft, FaExpand, FaKeyboard, FaTerminal } from "react-icons/fa";
import { IconDialogButton } from "../common/components";

const Terminal: VFC = () => {
  const { id } = useParams() as any;
  const [loaded, setLoaded] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [config, setConfig] = useState<Record<string, any> | null>(null);
  const [openFunctionRow, setOpenFunctionRow] = useState<boolean>(false);

  // Create a ref to hold the xterm instance
  const xtermRef = useRef<XTermTerminal | null>(null);
  const xtermDiv = useRef<HTMLDivElement | null>(null);
  const fakeInputRef = useRef<typeof TextField | null>(null);
  const eventListenerRef = useRef<Function | null>(null);

  const sendInput = async (input: string) => {
    await call<[terminal_id: string, input: string], void>("send_terminal_input", id, input);
  };

  const wrappedConnectIO = async () => {
    try {
      await connectIO()
    } catch(e) {
      console.error(e)
    }
  }

  const getConfig = async (): Promise<Record<string, any>|undefined> => {
    const config = await call<[], string[]>("get_config");
    setConfig(config);
    return config;
  }

  const updateTitle = async (title: string): Promise<void> => {
    await call<[terminal_id: string, title: string], string[]>("set_terminal_title", id, title);
  }

  const connectIO = async () => {
    const xterm = xtermRef.current
    const localConfig = await getConfig()

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
      }
    }

    const terminalResult = await call<[terminal_id: string], number>("get_terminal", id);
    if (terminalResult === null) {
      xterm?.write("--- Terminal Not Found ---");
      window.location.href = '/';
      return;
    }
    if ((terminalResult as any)?.title) {
      const title = (terminalResult as any)?.title;
      setTitle(title)
    }

    // subscribe to terminal
    await call<[terminal_id: string], void>("subscribe_terminal", id);

    if (xterm) {
      xterm.onTitleChange((title) => {
        setTitle(title)
        updateTitle(title)
      });

      xterm.onData((data) => {
        sendInput(data);
      });

      // Set up event listener for terminal output
      const unsubscribe = addEventListener<[ArrayBuffer]>(`terminal_output#${id}`, function terminalOutput(data) {
        xterm.write(new Uint8Array(data));
      });

      eventListenerRef.current = unsubscribe;
    }

    // Set the loaded state to true after xterm is initialized
    setLoaded(true);

    await xterm?.open(xtermDiv.current as HTMLDivElement);
    // wait for it!
    await (new Promise<void>((res) => setTimeout(res, 1)));
    fitToScreen()

    if (xterm) {
      xterm.onResize((e) => {
        setWindowSize(e.rows, e.cols);
      });

      await setWindowSize(xterm.rows, xterm.cols);
    }
    
    if (fakeInputRef.current) {
      const inputBox = (fakeInputRef.current as any).m_elInput as HTMLInputElement;
      if (inputBox.tabIndex !== -1) {
        inputBox.tabIndex = -1;
        inputBox.addEventListener("click", () => {
          setFocusToTerminal();
        })
      }
    }
  };

  const setWindowSize = async (rows: number, cols: number) => {
    await call<[terminal_id: string, rows: number, cols: number], number>(
      "change_terminal_window_size",
      id,
      rows,
      cols
    );
  }

  const openKeyboard = () => {
    if (config?.disable_virtual_keyboard) {
      setFocusToTerminal();
      return;
    }

    const fakeInput = fakeInputRef.current as any
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
    wrappedConnectIO()

    // Clean up function
    return () => {
      // Clean up event listener
      if (eventListenerRef.current) {
        removeEventListener(`terminal_output#${id}`, eventListenerRef.current as any);
        eventListenerRef.current = null;
      }

      try {
        // Unsubscribe from terminal
        call<[terminal_id: string], void>("unsubscribe_terminal", id);
      } catch(e) {
        console.error('unregister error', e)
      }

      // Dispose xterm instance when component is unmounted
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }

      setFullScreen(false)
    };
  }, [id]);

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
      }
    }
  }

  const startFullScreen = () => {
    setFullScreen(true);
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
      evt.preventDefault();

      let command: string | undefined = undefined;
      switch (evt.detail.button) {
        case GamepadButton.DIR_UP:
          command = '[A';
          break;
        case GamepadButton.DIR_DOWN:
          command = '[B';
          break;
        case GamepadButton.DIR_RIGHT:
          command = '[C';
          break;
        case GamepadButton.DIR_LEFT:
          command = '[D';
          break;
      }

      if (command) {
        sendInput(command);

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

  const getPadding = () => {
    let amount = 5;
    if (!fullScreen) {
      amount += 6;
    }

    if (config?.handheld_mode) {
      const row = 47;
      const allRows = row * 5;
      const padding = 3;

      const final = allRows + padding;

      // remove bottom bar padding
      amount -= 2.5;

      return 'calc('+amount+'em + '+final+'px)';
    }

    if (!fullScreen) {
      if (config?.extra_keys) {
        amount += 3;
      }
    }

    return amount+'em';
  };

  const ModifiedTextField = TextField as any;
  if (!loaded) return <SteamSpinner />

  return (
    <Focusable noFocusRing={true} onGamepadDirection={gamepadHandler} style={{ margin: 0, padding: 0, paddingTop: "2.5rem", color: "white", width: '100vw' }}>
      <div style={{padding: fullScreen ? "0" : "0 1rem", }}>
        <XTermCSS />
        {
          (!fullScreen) ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'}}>
            <h1 style={{ margin: '1rem 0', whiteSpace: 'nowrap', overflowX: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
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
          <div ref={xtermDiv} style={{ width: '100%', maxWidth: '100vw', margin: 0, background: '#000', padding: 0, height: "calc(100vh - "+getPadding()+")" }}></div>
        </Focusable>

        {
          (config?.extra_keys && (!fullScreen || config?.handheld_mode)) && 
            <Focusable style={{ overflowX: 'scroll', display: 'flex', gap: '1rem', padding: '.5rem', width: 'fit-content', maxWidth: 'calc(100% - 2rem)', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '.5rem' }}>
                <IconDialogButton onClick={() => sendInput('')}>Esc</IconDialogButton>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '.5rem'}}>
                {
                  openFunctionRow &&
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '.25rem'}}>
                      <IconDialogButton onClick={() => sendInput('[1P')}>F1</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('[1Q')}>F2</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('[1R')}>F3</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('[1S')}>F4</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('[15~')}>F5</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('[17~')}>F6</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('[18~')}>F7</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('[19~')}>F8</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('[20~')}>F9</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('[21~')}>F10</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('[23~')}>F11</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('[24~')}>F12</IconDialogButton>
                    </div>
                }

                {
                  openFunctionRow ? 
                  <IconDialogButton onClick={() => setOpenFunctionRow(false)}><FaChevronCircleLeft /></IconDialogButton> :
                  <IconDialogButton onClick={() => setOpenFunctionRow(true)}>Fn</IconDialogButton>

                }
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '.5rem'}}>
                <IconDialogButton onClick={() => sendInput('[D')}><FaArrowLeft /></IconDialogButton>
                <IconDialogButton onClick={() => sendInput('[A')}><FaArrowUp /></IconDialogButton>
                <IconDialogButton onClick={() => sendInput('[B')}><FaArrowDown /></IconDialogButton>
                <IconDialogButton onClick={() => sendInput('[C')}><FaArrowRight /></IconDialogButton>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '.5rem'}}>
                <IconDialogButton onClick={() => sendInput('')}>^C</IconDialogButton>
                <IconDialogButton onClick={() => sendInput('')}>^D</IconDialogButton>
                <IconDialogButton onClick={() => sendInput('')}>^R</IconDialogButton>
                <IconDialogButton onClick={() => sendInput('')}>^Z</IconDialogButton>
              </div>
            </Focusable>
        }

        {
          config?.handheld_mode &&
            <Focusable style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingTop: fullScreen ? '1em' : '2em' }}>
              <div className={staticClasses.Text}>Reserved for Virtual Keyboard</div>
              <div className={staticClasses.Label}>Disable Handheld mode to remove this padding</div>
            </Focusable>
        }
      </div>
    </Focusable>
  );
};

export default Terminal;
