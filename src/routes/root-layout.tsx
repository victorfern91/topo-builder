import * as stylex from "@stylexjs/stylex";
import { Outlet } from "@tanstack/react-router";
import { SettingsNotice } from "../components/settings-notice.tsx";
import { TopBar } from "../components/top-bar.tsx";
import { ViewportProvider } from "../state/viewport-provider.tsx";
import { Layout, Tokens } from "@ui";

const styles = stylex.create({
  app: {
    height: "100%",
    minHeight: 0,
    backgroundColor: Tokens.color.neutral[800],
  },
});

export function RootLayout() {
  return (
    <SettingsNotice>
      <ViewportProvider>
        <Layout.Stack sx={styles.app}>
          <TopBar />
          <Outlet />
        </Layout.Stack>
      </ViewportProvider>
    </SettingsNotice>
  );
}
