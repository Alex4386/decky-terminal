import {
  DialogButton,
  Router,
  useParams,
} from "decky-frontend-lib";
import { VFC } from "react";

import logo from "../../assets/logo.png";
import XTermCSS from "../common/xterm_css";

const Terminals: VFC = () => {

  // I can't find RouteComponentParams :skull:
  const { id } = useParams() as any;

  return (
    <div style={{ marginTop: "50px", color: "white" }}>
      <XTermCSS />
      terminal id {id}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <img src={logo} />
      </div>
      <DialogButton onClick={() => Router.NavigateToLibraryTab()}>
        Go to Library
      </DialogButton>
    </div>
  );
};

export default Terminals;
