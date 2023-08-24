import {
    Dropdown,
    Focusable, SteamSpinner, staticClasses,
  } from "decky-frontend-lib";
  import { VFC, useState } from "react";
import TerminalGlobal from "../../common/global";
  
  
  const SettingsPage: VFC = () => {
    const [config, setConfig] = useState<Record<string, any> | null>(null);
    const [shells, setShells] = useState(["/bin/bash"]);

    const getShells = async () => {
        const serverAPI = TerminalGlobal.getServer()
        const shells = await serverAPI.callPluginMethod<{}, string[]>("get_shells", {});
        if (shells.success) {
            setShells(shells.result)
        }
    }

    const getConfig = async () => {
        const serverAPI = TerminalGlobal.getServer()
        const config = await serverAPI.callPluginMethod<{}, string[]>("get_config", {});
        if (config.success) {
            setConfig(config.result)
        }
    }
    const setShell = async (shell: string) => {
        const serverAPI = TerminalGlobal.getServer()
        const configured = await serverAPI.callPluginMethod<{}, string[]>("set_default_shell", { shell });
        if (configured.success) {
            setConfig({
                ...config,
                default_shell: shell,
            })
        }
    }

    useState(() => {
        getShells();
        getConfig();

        return () => {
            setConfig(null);
        }
    })

    if (!config) return <SteamSpinner />;
    return (
        <Focusable style={{ display: 'flex', gap: '.5rem', flexDirection: 'column'}}>
            <Focusable
                style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                    <div className={staticClasses.Text}>Default Shell</div>
                    <div className={staticClasses.Label}>Change the default shell of the terminal</div>
                </div>
                <div style={{ minWidth: '150px' }}>
                    <Dropdown
                        disabled={false}
                        selectedOption={config?.default_shell ?? "/bin/bash"}
                        onChange={(e) => {setShell(e.data)}}
                        rgOptions={shells.map((n) => ({ label: n, data: n }))} />
                </div>
            </Focusable>
        </Focusable>
    );
  };
  
  export default SettingsPage;
  