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
import { IDisposable, Terminal as XTermTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
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

  const xtermOnDataRef = useRef<IDisposable | null>(null);

  const sendInput = async (input: string) => {
    await call<[terminal_id: string, input: string], void>("send_terminal_input", id, input);
    console.log('sending Input:', input);
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
    try {
      console.log('connectIO started');
      const xterm = xtermRef.current as XTermTerminal;
      if (!xterm) {
        throw new Error('xterm not initialized');
      }

      console.log('Getting config...');
      const localConfig = await getConfig()
      console.log('Config received:', localConfig);

      // First open xterm if not already open
      if (!xterm.element) {
        if (!xtermDiv.current) {
          throw new Error('xtermDiv not available');
        }
        console.log('Opening xterm first...');
        await xterm.open(xtermDiv.current);
        xterm.write('--- xterm test message ---\r\n');
      }

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

        // The loading of the config will resize the terminal
        // so we need to call fitToScreen again
        fitToScreen();
      }

      console.log('Getting terminal...');
      const terminalResult = await call<[terminal_id: string], number>("get_terminal", id);
      if (terminalResult === null) {
        xterm?.write("--- Terminal Not Found ---");
        window.location.href = '/';
        return;
      }
      console.log('Terminal result:', { terminalResult, id });

      if ((terminalResult as any)?.title) {
        const title = (terminalResult as any)?.title;
        setTitle(title)
      }

      console.log('Setting up xterm event handlers...');
      xterm.onTitleChange((title: string) => {
        console.log('Title changed:', title);
        setTitle(title)
        updateTitle(title)
      });

      // Debug: Log when event handler is attached
      console.log('Detaching onData handler if it exists...');
      if (xtermOnDataRef.current) {
        xtermOnDataRef.current.dispose();
        xtermOnDataRef.current = null;
      }

      console.log('Attaching onData handler...');
      xtermOnDataRef.current = xterm.onData((data: string) => {
        console.log('xterm onData triggered:', data);
        sendInput(data);
      });
      console.log('onData handler attached');

      // Set up event listener for terminal output first
      const unsubscribe = addEventListener<[string]>(`terminal_output#${id}`, function terminalOutput(data) {
        console.log('Terminal output:', data);
        xterm.write(data);
      });

      // Then subscribe to terminal and request initial buffer
      console.log('Subscribing to terminal...');
      const res = await call<[terminal_id: string], void>("subscribe_terminal", id);
      console.log('Terminal subscription:', res);

      // Request initial buffer
      await call<[terminal_id: string], void>("send_terminal_buffer", id);

      eventListenerRef.current = unsubscribe;
      console.log('Terminal setup complete');

    } catch (error) {
      console.error('connectIO error:', error);
      throw error; // Re-throw to be caught by wrappedConnectIO
    }

    // Set the loaded state to true after xterm is initialized
    setLoaded(true);
  };

  // Initialize xterm and set up size handling
  const initializeTerminal = async () => {
    console.log('Initializing terminal...');
    const xterm = xtermRef.current as XTermTerminal;
    if (!xterm) {
      console.error('No xterm instance available');
      return;
    }

    const div = xtermDiv.current;
    if (!div) {
      console.error('No terminal div available');
      return;
    }
    
    // 1. Set up FitAddon first so it's ready when terminal opens
    console.log('Setting up FitAddon...');
    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    
    // 2. Open terminal and verify it's ready
    console.log('Opening xterm...');
    await xterm.open(div);
    console.log('xterm opened, element:', xterm.element);
    
    // 3. Configure initial size and focus
    console.log('Configuring terminal size...');
    fitToScreen(); // This uses FitAddon to calculate proper dimensions
    
    // 4. Set up resize handler BEFORE setting window size to avoid race condition
    xterm.onResize((e) => {
      console.log('Terminal resized:', e.rows, e.cols);
      setWindowSize(e.rows, e.cols);
    });
    
    // 5. Set initial window size
    await setWindowSize(xterm.rows, xterm.cols);
    
    // 6. Focus terminal after everything is set up
    xterm.focus();
    console.log('Terminal initialization complete');
    
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

  // First effect creates xterm instance
  useEffect(() => {
    console.log('Creating xterm instance');
    const xterm = new XTermTerminal({
      //scrollback: 0,
      allowProposedApi: true,
      cursorBlink: true,

      rows: 10,
    });

    console.log('XTermTerminal instance created');
    xtermRef.current = xterm;

    return () => {
      // Dispose xterm instance when component is unmounted
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
    }
  }, []);


  // Track initialization state
  const initializedRef = useRef(false);
  const initializedIdRef = useRef("");

  // For handling 
  useEffect(() => {
    const connectTerminal = async () => {
      console.log('Checking initialization state:', initializedRef.current);
      if (initializedRef.current) {
        if (id === initializedIdRef.current) {
          console.log('Terminal already initialized');
          return;
        }

        console.log('Terminal already initialized with different ID, reinitializing...');
      }
      
      console.log('Checking refs:', { xtermRef: !!xtermRef.current, xtermDiv: !!xtermDiv.current });
      if (xtermRef.current && xtermDiv.current) {
        console.log('Both refs ready, initializing terminal...');
        initializedRef.current = true;
        initializedIdRef.current = id;
        await initializeTerminal();
        await wrappedConnectIO();
      }
    };
    connectTerminal();

    // Clean up function for handling unmount
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

      if (xtermRef.current) {
        // first clear the xterm
        xtermRef.current.clear();
      }

      setFullScreen(false)
    };
  }, [id, xtermRef.current, xtermDiv.current]);


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

  // Track FitAddon instance globally so we don't create multiple instances
  const fitAddonRef = useRef<FitAddon | null>(null);

  const fitToScreen = (_fullScreen?: boolean) => {
    const isFullScreen = _fullScreen === undefined ? fullScreen : _fullScreen;
    
    if (xtermRef.current) {
      const xterm = xtermRef.current;

      // Use existing FitAddon or create new one
      if (!fitAddonRef.current) {
        console.log('Creating new FitAddon');
        fitAddonRef.current = new FitAddon();
        xterm.loadAddon(fitAddonRef.current);
      }

      const res = fitAddonRef.current.proposeDimensions();
      if (res?.rows && res.cols) {
        const fontSize = xterm.options.fontSize ?? 12;
        const colOffset = (Math.ceil(30 / fontSize));
        const newCols = isFullScreen ? res.cols - colOffset : res.cols + colOffset;
        let newRows = isFullScreen ? res.rows - 1 : res.rows;

        if (config?.extra_keys) {
          newRows -= 3;
        }
        
        console.log('Resizing terminal:', {newCols, newRows, isFullScreen});
        xterm.resize(newCols, newRows);
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
        <Focusable onClick={openKeyboard} style={{boxSizing: 'content-box', overflow: 'hidden'}}>
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
                      <IconDialogButton onClick={() => sendInput('\x1b[1P')}>F1</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('\x1b[1Q')}>F2</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('\x1b[1R')}>F3</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('\x1b[1S')}>F4</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('\x1b[15~')}>F5</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('\x1b[17~')}>F6</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('\x1b[18~')}>F7</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('\x1b[19~')}>F8</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('\x1b[20~')}>F9</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('\x1b[21~')}>F10</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('\x1b[23~')}>F11</IconDialogButton>
                      <IconDialogButton onClick={() => sendInput('\x1b[24~')}>F12</IconDialogButton>
                    </div>
                }

                {
                  openFunctionRow ? 
                  <IconDialogButton onClick={() => setOpenFunctionRow(false)}><FaChevronCircleLeft /></IconDialogButton> :
                  <IconDialogButton onClick={() => setOpenFunctionRow(true)}>Fn</IconDialogButton>

                }
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '.5rem'}}>
                <IconDialogButton onClick={() => sendInput('\x1b[D')}><FaArrowLeft /></IconDialogButton>
                <IconDialogButton onClick={() => sendInput('\x1b[A')}><FaArrowUp /></IconDialogButton>
                <IconDialogButton onClick={() => sendInput('\x1b[B')}><FaArrowDown /></IconDialogButton>
                <IconDialogButton onClick={() => sendInput('\x1b[C')}><FaArrowRight /></IconDialogButton>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '.5rem'}}>
                <IconDialogButton onClick={() => sendInput('\x03')}>^C</IconDialogButton>
                <IconDialogButton onClick={() => sendInput('\x04')}>^D</IconDialogButton>
                <IconDialogButton onClick={() => sendInput('\x12')}>^R</IconDialogButton>
                <IconDialogButton onClick={() => sendInput('\x1a')}>^Z</IconDialogButton>
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
