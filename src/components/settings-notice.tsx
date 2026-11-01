import { useEffect, type ReactNode } from "react";
import { Layout, Toast } from "@ui";
import { t } from "../i18n/index.ts";
import { preferencesSchemaReset } from "../state/preferences.ts";

export function SettingsNotice({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider>
      {children}
      <SchemaResetToast />
      <Toast.Portal>
        <ToastList />
      </Toast.Portal>
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
          </Toast.Content>
        </Toast.Root>
      ))}
    </Toast.Viewport>
  );
}
