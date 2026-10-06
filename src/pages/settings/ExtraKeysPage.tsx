import { call } from "@decky/api";
import {
    DialogButton,
    Focusable, SteamSpinner, TextField, staticClasses,
  } from "@decky/ui";
import { VFC, useEffect, useRef, useState } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
import { IconDialogButton } from "../../common/components";
import { CustomKey, decodeKeySequence, parseCustomKeys } from "../../common/keys";

const describeSequence = (send: string): string => {
    const decoded = decodeKeySequence(send);
    if (decoded.length === 0) return "(empty)";

    return Array.from(decoded)
        .map((char) => {
            const code = char.charCodeAt(0);
            if (code === 0x1b) return "ESC";
            if (code < 0x20 || code === 0x7f) return "0x" + code.toString(16).padStart(2, "0");
            return char;
        })
        .join(" ");
};

const ExtraKeysPage: VFC = () => {
    const [customKeys, setCustomKeys] = useState<CustomKey[] | null>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        (async () => {
            const config = await call<[], Record<string, any>>("get_config");
            setCustomKeys(parseCustomKeys(config?.custom_keys));
        })();

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        }
    }, []);

    // Debounced so typing in a field doesn't write the config on every keystroke
    const updateKeys = (keys: CustomKey[]) => {
        setCustomKeys(keys);

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            call<[config: Record<string, any>], boolean>("append_config", { custom_keys: keys });
        }, 500);
    };

    const updateKey = (index: number, key: Partial<CustomKey>) => {
        if (!customKeys) return;
        updateKeys(customKeys.map((k, i) => i === index ? { ...k, ...key } : k));
    };

    const addKey = () => {
        updateKeys([...(customKeys ?? []), { label: "", send: "" }]);
    };

    const removeKey = (index: number) => {
        if (!customKeys) return;
        updateKeys(customKeys.filter((_, i) => i !== index));
    };

    if (!customKeys) return <SteamSpinner />;
    return (
        <Focusable style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexDirection: 'column'}}>
            <div>
                <div className={staticClasses.Text}>Custom Keys</div>
                <div className={staticClasses.Label}>
                    Shown in the extra keys row when Extra keys is enabled.
                    Use <code>^X</code> for control keys, <code>\e</code> for escape, <code>\xHH</code> for hex and <code>\r</code> for enter.
                </div>
            </div>

            {
                customKeys.map((key, index) =>
                    <Focusable
                        key={index}
                        style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '120px' }}>
                            <TextField
                                label="Label"
                                value={key.label}
                                onChange={(e) => updateKey(index, { label: e.target.value })} />
                        </div>
                        <div style={{ flexGrow: 1 }}>
                            <TextField
                                label="Sends"
                                description={describeSequence(key.send)}
                                value={key.send}
                                onChange={(e) => updateKey(index, { send: e.target.value })} />
                        </div>
                        <IconDialogButton onClick={() => removeKey(index)}>
                            <FaTrash />
                        </IconDialogButton>
                    </Focusable>
                )
            }

            <Focusable>
                <DialogButton onClick={addKey}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem'}}>
                        <FaPlus />
                        <span>Add Key</span>
                    </div>
                </DialogButton>
            </Focusable>
        </Focusable>
    );
  };

  export default ExtraKeysPage;
