import {
  ButtonItem,
  definePlugin,
  DialogButton,
  Menu,
  MenuItem,
  Field,
  Focusable,
  PanelSection,
  PanelSectionRow,
  Router,
  ServerAPI,
  showContextMenu,
  staticClasses,
} from "decky-frontend-lib";
import { useState, VFC } from "react";
import logo from "../assets/logo.png";
import { FaPlus, FaTimesCircle } from "react-icons/fa";
import TerminalGlobal from "./common/global";

// interface AddMethodArgs {
//   left: number;
//   right: number;
// }

interface TerminalResult {
  id: string;
  pid?: number;
  exitcode?: number;
  is_started: boolean;
  is_completed: boolean;
}

const SidePanel: VFC = ({}) => {
  // 

  // const onClick = async () => {
  //   const result = await serverAPI.callPluginMethod<AddMethodArgs, number>(
  //     "add",
  //     {
  //       left: 2,
  //       right: 2,
  //     }
  //   );
  //   if (result.success) {
  //     setResult(result.result);
  //   }
  // };

  const [result, setResult] = useState<TerminalResult[]>([]);

  const getTerminals = async () => {
    const serverAPI = TerminalGlobal.getServer();

    const result = await serverAPI.callPluginMethod<{}, TerminalResult[]>(
      "get_terminals",
      {}
    );
    console.log('Fetched Terminal', result);

    if (result.success) {
      setResult(result.result)
    } 
  }

  const createTerminal = async () => {
    const serverAPI = TerminalGlobal.getServer();

    const result = await serverAPI.callPluginMethod<{}, boolean>(
      "create_terminal",
      {}
    );

    if (result.success) {
      if (result.result) {
        await getTerminals()
      }
    } 
  }

  const removeTerminal = async (id: string) => {
    const serverAPI = TerminalGlobal.getServer();

    const result = await serverAPI.callPluginMethod<{}, boolean>(
      "remove_terminal",
      { id }
    );

    if (result.success) {
      if (result.result) {
        await getTerminals()
      }
    } 
  }

  useState(() => {
    getTerminals()
  });

  return <div style={{ boxSizing: 'border-box', padding: '0 .5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <DialogButton onClick={createTerminal}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem'}}>
          <FaPlus />
          <span>Add Terminal</span>
        </div></DialogButton>
    </div>
    <PanelSection title="Active Terminals">
      <PanelSectionRow>
        {
          result.map((terminal) => 
            <Field>
              <Focusable style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <DialogButton
                  onClick={() => {
                    Router.CloseSideMenus();
                    Router.Navigate("/terminals/"+terminal.id);
                  }}
                >
                  { terminal.id }
                </DialogButton>

                <DialogButton
                  onClick={() => {
                    removeTerminal(terminal.id)
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '10px',
                    maxWidth: '40px',
                    minWidth: 'auto',
                    marginLeft: '.5em',
                  }}
                >
                  <FaTimesCircle />
                </DialogButton>
              </Focusable>
            </Field>
          )
        }
      </PanelSectionRow>
    </PanelSection>
  </div>;
};

export default SidePanel;