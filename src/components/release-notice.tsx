import { useEffect, useState } from "react";
import { Alert, Layout, Toast } from "@ui";
import { t } from "../i18n/index.ts";
import { hasUnsavedHistory } from "../state/history.ts";
import {
  CHECK_EVERY,
  claimRelease,
  reloadApp,
  remoteBuild,
  unloadAllowed,
} from "../state/release.ts";
import { primaryModifier } from "../state/viewport.ts";

/** Warns once per production deploy, and before a reload that drops history. */
export function ReleaseNotice() {
  const manager = Toast.useToastManager();
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPageReload(event) || !hasUnsavedHistory()) return;
      event.preventDefault();
      setUnsavedOpen(true);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (unloadAllowed() || !hasUnsavedHistory()) return;
      event.preventDefault();
      event.returnValue = "unsaved";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    let stopped = false;

    const check = async () => {
      const remote = await remoteBuild();
      if (stopped || remote == null || !claimRelease(remote)) return;
      manager.add({
        id: "release",
        title: t("releaseTitle"),
        description: t("releaseBody"),
        type: "warning",
        priority: "high",
        timeout: 0,
        actionProps: {
          children: t("reload"),
          onClick: () => {
            if (hasUnsavedHistory()) {
              setUnsavedOpen(true);
              return;
            }
            reloadApp();
          },
        },
      });
    };

    const onSimulate = () => {
      void check();
    };
    import.meta.hot?.on("topo:release", onSimulate);

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    void check();

    if (!import.meta.env.PROD) {
      return () => {
        stopped = true;
        import.meta.hot?.off("topo:release", onSimulate);
        document.removeEventListener("visibilitychange", onVisible);
      };
    }

    const timer = window.setInterval(() => {
      void check();
    }, CHECK_EVERY);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      import.meta.hot?.off("topo:release", onSimulate);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [manager]);

  return (
    <Alert.Root open={unsavedOpen} onOpenChange={setUnsavedOpen}>
      <Alert.Portal>
        <Alert.Backdrop />
        <Alert.Popup>
          <Alert.Title>{t("unsavedTitle")}</Alert.Title>
          <Alert.Description>{t("unsavedBody")}</Alert.Description>
          <Layout.Stack direction="row" justify="end" gap="md">
            <Alert.Close>{t("stay")}</Alert.Close>
            <Alert.Close tone="warning" onClick={reloadApp}>
              {t("reload")}
            </Alert.Close>
          </Layout.Stack>
        </Alert.Popup>
      </Alert.Portal>
    </Alert.Root>
  );
}

function isPageReload(event: KeyboardEvent): boolean {
  if (event.isComposing || event.altKey) return false;
  if (event.key === "F5") return true;
  return event.key.toLowerCase() === "r" && primaryModifier(event);
}
