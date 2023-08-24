import {
    Dropdown,
    Focusable, SteamSpinner, TextField, staticClasses,
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

    const appendConfig = async (config: Record<string, any>) => {
        const serverAPI = TerminalGlobal.getServer()
        const configApplied = await serverAPI.callPluginMethod<{
            config: Record<string, any>
        }, string[]>("get_config", {
            config,
        });

        if (configApplied.success) {
            getConfig()
        }
    }

    const setShell = async (shell: string) => {
        const serverAPI = TerminalGlobal.getServer()
        const configured = await serverAPI.callPluginMethod<{
            shell: string
        }, string[]>("set_default_shell", { shell });
        if (configured.success) {
            setConfig({
                ...config,
                default_shell: shell,
            })
        }
    }

    const setFont = async (fontFamily: string) => {
        await appendConfig({
            font_family: fontFamily,
        })
    }

    const setFontSize = async (fontSize: number) => {
        await appendConfig({
            font_size: fontSize,
        })
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
            <Focusable
                style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                    <div className={staticClasses.Text}>Font Family</div>
                    <div className={staticClasses.Label}>Change the font of the terminal</div>
                </div>
                <div style={{ minWidth: '150px' }}>
                    <TextField
                        disabled={false}
                        onChange={(e) => {setFont(e.target.value)}} />
                </div>
            </Focusable>
            <Focusable
                style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                    <div className={staticClasses.Text}>Font Size</div>
                    <div className={staticClasses.Label}>Change the font size of the terminal</div>
                </div>
                <div style={{ minWidth: '150px' }}>
                    <TextField
                        disabled={false}
                        mustBeNumeric={true}
                        onChange={(e) => {!isNaN(parseInt(e.target.value)) ? setFontSize(parseInt(e.target.value)) : undefined}} />
                </div>
            </Focusable>
        </Focusable>
    );
  };
  
  export default SettingsPage;
  