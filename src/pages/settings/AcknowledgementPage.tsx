import {
    Focusable,
  } from "decky-frontend-lib";
  import { VFC } from "react";
  
  
  const AcknowledgementPage: VFC = () => {
    return (
        <Focusable>
            <p>DeckyTerminal was made possible by following Opensource projects:</p>
            <ul>
                <li><b>Websockets</b>: a Websocket Server implementation in Python (BSD-3 Clause License)</li>
                <li><b>Xterm.js</b>: a xterm compliant web terminal (MIT License)</li>
            </ul>
            <p>&nbsp;</p>
            <p>The source code of this plugin is available at:</p>
            <p>https://github.com/Alex4386/decky-terminal</p>
        </Focusable>
    );
  };
  
  export default AcknowledgementPage;
  