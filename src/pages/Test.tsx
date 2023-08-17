import {
  DialogButton,
  Router,
} from "decky-frontend-lib";
import { VFC } from "react";


const DeckyPluginRouterTest: VFC = () => {
  return (
    <div style={{ marginTop: "50px", color: "white" }}>
      Hello World! This is a test page to test Router
      <DialogButton onClick={() => Router.NavigateToLibraryTab()}>
        Go to Library
      </DialogButton>
    </div>
  );
};

export default DeckyPluginRouterTest;
