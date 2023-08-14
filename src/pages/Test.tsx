import {
  DialogButton,
  Router,
} from "decky-frontend-lib";
import { VFC } from "react";

import logo from "../../assets/logo.png";


const DeckyPluginRouterTest: VFC = () => {
  return (
    <div style={{ marginTop: "50px", color: "white" }}>
      Hello World!
      <div style={{ display: "flex", justifyContent: "center" }}>
        <img src={logo} />
      </div>
      <DialogButton onClick={() => Router.NavigateToLibraryTab()}>
        Go to Library
      </DialogButton>
    </div>
  );
};

export default DeckyPluginRouterTest;
