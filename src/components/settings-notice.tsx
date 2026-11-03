import { useEffect, type ReactNode } from "react";
import { Layout, Toast, Tooltip } from "@ui";
import { t } from "../i18n/index.ts";
import { preferencesSchemaReset } from "../state/preferences.ts";
import { ReleaseNotice } from "./release-notice.tsx";

export function SettingsNotice({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider>
      <Tooltip.Provider delay={400}>
        {children}
        <SchemaResetToast />
        <ReleaseNotice />
        <Toast.Portal>
          <ToastList />
        </Toast.Portal>
      </Tooltip.Provider>
    </Toast.Provider>
  );
}

function SchemaResetToast() {
  const manager = Toast.useToastManager();

  useEffect(() => {
    if (!preferencesSchemaReset) return;
    const id = manager.add({
      title: t("settingsResetTitle"),
      description: t("settingsResetBody"),
      priority: "high",
      timeout: 0,
    });
    return () => {
      manager.close(id);
    };
  }, [manager]);

  return null;
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return (
    <Toast.Viewport aria-label={t("notifications")}>
      {toasts.map((toast) => (
        <Toast.Root key={toast.id} toast={toast}>
          <Toast.Content>
            <Layout.Stack direction="row" align="start" gap="lg">
              <Toast.Icon type={toast.type} />
              <Layout.Stack gap="sm" grow>
                <Layout.Stack
                  direction="row"
                  align="center"
                  justify="space-between"
                  gap="xl"
                >
                  <Toast.Title />
                  <Toast.Close>{t("dismiss")}</Toast.Close>
                </Layout.Stack>
                <Toast.Description />
                {toast.actionProps ? (
                  <Layout.Stack direction="row" justify="end">
                    <Toast.Action />
                  </Layout.Stack>
                ) : null}
              </Layout.Stack>
            </Layout.Stack>
          </Toast.Content>
        </Toast.Root>
      ))}
    </Toast.Viewport>
  );
}
