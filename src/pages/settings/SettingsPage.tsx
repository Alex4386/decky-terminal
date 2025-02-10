import { call } from "@decky/api";
import {
    Dropdown,
    Focusable, SteamSpinner, TextField, ToggleField, staticClasses,
  } from "@decky/ui";
import { VFC, useEffect, useState } from "react";
  

const SettingsPage: VFC = () => {
    const [config, setConfig] = useState<Record<string, any> | null>(null);
    const [shells, setShells] = useState<string[]>([]);

    const getShells = async () => {
        try {
            const shells = await call<[], string[]>("get_shells");
            setShells(shells);
        } catch(e) {
            setShells(["/bin/bash"])
        }
    }

    const getConfig = async () => {
        const result = await call<[], string[]>("get_config");
        setConfig(result);
    }

    const appendConfig = async (config: Record<string, any>) => {
        const result = await call<[config: Record<string, any>], string[]>("append_config", config);
        getConfig();
    }

    const setShell = async (shell: string) => {
        await call<[shell: string], string[]>("set_default_shell", shell);
        setConfig({
            ...config,
            default_shell: shell,
        });
    }

    const setFont = async (fontFamily: string) => {
        await appendConfig({
            font_family: fontFamily,
        })
    }

    const setFontSize = async (_fontSize: number|string) => {
        let fontSize: number | string = "";
        if (typeof _fontSize === 'string') {
            try { fontSize = parseInt(_fontSize as string, 10) } catch(e) {}
        }

        await appendConfig({
            font_size: fontSize,
        })
    }

    const setUseDpad = async (dpad: boolean) => {
        await appendConfig({
            use_dpad: dpad,
        })
    }

    const setDisableVirtualKeyboard = async (disabled: boolean) => {
        await appendConfig({
            disable_virtual_keyboard: disabled,
        })
    }

    const setHandheld = async (enabled: boolean) => {
        await appendConfig({
            handheld_mode: enabled,
        })
    }

    const setExtraKeys = async (enabled: boolean) => {
        await appendConfig({
            extra_keys: enabled,
        })
    }

    const setUseDisplay = async (enabled: boolean) => {
        await appendConfig({
            use_display: enabled,
        })
    }

    useEffect(() => {
        if (!shells || shells.length === 0) getShells();
        if (!config) getConfig();

        return () => {
        }
    })

    if (!config) return <SteamSpinner />;
    return (
        <Focusable style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexDirection: 'column'}}>
            <Focusable
                style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                    <div className={staticClasses.Text}>Default Shell</div>
                    <div className={staticClasses.Label}>Change the default shell of the terminal</div>
                </div>
                <div style={{ minWidth: '150px' }}>
                    <Dropdown
                        disabled={false}
                        selectedOption={config && config.default_shell ? config.default_shell : shells[0]}
                        onChange={(e) => {setShell(e.data)}}
                        rgOptions={shells.map((n) => ({ label: n, data: n }))} />
                </div>
            </Focusable>
            <Focusable
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                    <div className={staticClasses.Text}>Font Family</div>
                    <div className={staticClasses.Label}>Change the font of the terminal</div>
                </div>
                <div style={{ minWidth: '200px' }}>
                    <TextField
                        disabled={false}
                        value={config?.font_family ?? ""}
                        onChange={(e) => {setFont(e.target.value)}} />
                </div>
            </Focusable>
            <Focusable
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                    <div className={staticClasses.Text}>Font Size</div>
                    <div className={staticClasses.Label}>Change the font size of the terminal</div>
                </div>
                <div style={{ minWidth: '200px' }}>
                    <TextField
                        disabled={false}
                        mustBeNumeric={true}
                        value={config?.font_size ?? ""}
                        onChange={(e) => {setFontSize(e.target.value)}} />
                </div>
            </Focusable>
            <Focusable
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                    <div className={staticClasses.Text}>DPad Arrowkeys</div>
                    <div className={staticClasses.Label}>Use DPads as arrow key in terminal</div>
                </div>
                <div style={{ minWidth: '200px' }}>
                    <ToggleField
                        disabled={false}
                        checked={config?.use_dpad ?? false}
                        onChange={(e) => {setUseDpad(e)}}
                        bottomSeparator={"none"} />
                </div>
            </Focusable>
            <Focusable
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                    <div className={staticClasses.Text}>Disable Virtual Keyboard</div>
                    <div className={staticClasses.Label}>Use if you don't want virtual keyboard to popup when terminal is clicked or keyboard button is pressed</div>
                </div>
                <div style={{ minWidth: '200px' }}>
                    <ToggleField
                        disabled={false}
                        checked={config?.disable_virtual_keyboard ?? false}
                        onChange={(e) => {setDisableVirtualKeyboard(e)}}
                        bottomSeparator={"none"} />
                </div>
            </Focusable>
            <Focusable
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                    <div className={staticClasses.Text}>Handheld Mode</div>
                    <div className={staticClasses.Label}>Enabling this will pre-allocate the area used by virtual keyboard</div>
                </div>
                <div style={{ minWidth: '200px' }}>
                    <ToggleField
                        disabled={false}
                        checked={config?.handheld_mode ?? false}
                        onChange={(e) => {setHandheld(e)}}
                        bottomSeparator={"none"} />
                </div>
            </Focusable>
            <Focusable
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                    <div className={staticClasses.Text}>Enable Extra keys</div>
                    <div className={staticClasses.Label}>Add a row for arrow keys and Ctrl+C,D,Z</div>
                </div>
                <div style={{ minWidth: '200px' }}>
                    <ToggleField
                        disabled={false}
                        checked={config?.extra_keys ?? false}
                        onChange={(e) => {setExtraKeys(e)}}
                        bottomSeparator={"none"} />
                </div>
            </Focusable>
            {
                /*
                    <Focusable
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                        <div>
                            <div className={staticClasses.Text}>Use Display</div>
                            <div className={staticClasses.Label}>Set Display environment variable to allow GUI Applications to run</div>
                        </div>
                        <div style={{ minWidth: '200px' }}>
                            <ToggleField
                                disabled={false}
                                checked={config?.use_display ?? false}
                                onChange={(e) => {setUseDisplay(e)}}
                                bottomSeparator={"none"} />
                        </div>
                    </Focusable>
                */
            }
        </Focusable>
    );
  };
  
  export default SettingsPage;
  