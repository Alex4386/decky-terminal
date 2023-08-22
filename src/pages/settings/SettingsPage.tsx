import {
    Dropdown,
    Focusable, staticClasses,
  } from "decky-frontend-lib";
  import { VFC } from "react";
  
  
  const SettingsPage: VFC = () => {
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
                        selectedOption={"/bin/bash"}
                        onChange={(e) => {console.log(e.data)}}
                        rgOptions={[{
                            label: "/bin/bash",
                            data: "/bin/bash"
                        }, {
                            label: "/bin/zsh",
                            data: "/bin/zsh"
                        }]} />
                </div>
            </Focusable>
        </Focusable>
    );
  };
  
  export default SettingsPage;
  