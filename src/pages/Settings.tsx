import {
  SidebarNavigation,
} from "@decky/ui";
import { VFC } from "react";
import AcknowledgementPage from "./settings/AcknowledgementPage";
import SettingsPage from "./settings/SettingsPage";
import ExtraKeysPage from "./settings/ExtraKeysPage";


const Settings: VFC = () => {
  return (
    <SidebarNavigation
      title="Decky Terminal"
      showTitle={true}
      pages={[
        {
          title: "Settings",
          content: <SettingsPage />
        },
        {
          title: "Extra Keys",
          content: <ExtraKeysPage />
        },
        {
          title: "Acknowledgement",
          content: <AcknowledgementPage />
        }
      ]}
    />
  );
};

export default Settings;
