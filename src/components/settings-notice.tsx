import * as stylex from "@stylexjs/stylex";
import { Toast } from "@base-ui/react/toast";
import { useEffect, type ReactNode } from "react";
import { t } from "../i18n/index.ts";
import { preferencesSchemaReset } from "../state/preferences.ts";
import { Layout, Tokens } from "@ui";

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
    <Toast.Viewport
      {...stylex.props(styles.viewport)}
      aria-label={t("notifications")}
    >
      {toasts.map((toast) => (
        <Toast.Root
          key={toast.id}
          toast={toast}
          {...stylex.props(styles.toast)}
        >
          <Toast.Content {...stylex.props(styles.content)}>
            <Layout.Stack
              direction="row"
              align="center"
              justify="space-between"
              gap="xl"
            >
              <Toast.Title {...stylex.props(styles.title)} />
              <Toast.Close {...stylex.props(styles.close)}>
                {t("dismiss")}
              </Toast.Close>
            </Layout.Stack>
            <Toast.Description {...stylex.props(styles.description)} />
          </Toast.Content>
        </Toast.Root>
      ))}
    </Toast.Viewport>
  );
}

const styles = stylex.create({
  viewport: {
    position: "fixed",
    right: Tokens.spacing.xxxl,
    bottom: Tokens.spacing.xxxl,
    zIndex: 40,
    display: "flex",
    flexDirection: "column",
    gap: Tokens.spacing.md,
    width: "min(360px, calc(100vw - 32px))",
    margin: Tokens.spacing.none,
    padding: Tokens.spacing.none,
    outlineWidth: {
      default: 0,
      ":focus-visible": 2,
    },
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    outlineColor: {
      default: "transparent",
      ":focus-visible": Tokens.color.blue[100],
    },
    outlineOffset: 2,
    pointerEvents: "none",
  },
  toast: {
    width: "100%",
    pointerEvents: "auto",
    backgroundColor: Tokens.color.neutral[750],
    color: Tokens.color.neutral[100],
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: Tokens.color.neutral[950],
    borderRadius: 6,
    boxShadow: `0 12px 28px ${Tokens.color.black[45]}`,
    opacity: {
      default: 1,
      "[data-starting-style]": 0,
      "[data-ending-style]": 0,
    },
    transform: {
      default: "translateY(0)",
      "[data-starting-style]": "translateY(8px)",
      "[data-ending-style]": "translateY(8px)",
    },
    transitionProperty: "opacity, transform",
    transitionDuration: {
      default: "180ms",
      [Tokens.media.reduceMotion]: "0s",
    },
    transitionTimingFunction: "ease",
    outlineWidth: {
      default: 0,
      ":focus-visible": 2,
    },
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    outlineColor: {
      default: "transparent",
      ":focus-visible": Tokens.color.blue[100],
    },
    outlineOffset: 2,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: Tokens.spacing.sm,
    padding: Tokens.spacing.xl,
  },
  title: {
    margin: Tokens.spacing.none,
    fontSize: 14,
    fontWeight: 650,
    lineHeight: 1.3,
  },
  description: {
    margin: Tokens.spacing.none,
    fontSize: 13,
    lineHeight: 1.4,
    color: Tokens.color.neutral[400],
  },
  close: {
    appearance: "none",
    flexGrow: 0,
    flexShrink: 0,
    borderWidth: 0,
    backgroundColor: {
      default: "transparent",
      ":hover": Tokens.color.white[8],
    },
    color: "inherit",
    height: Tokens.size.md,
    paddingBlock: Tokens.spacing.none,
    paddingInline: Tokens.spacing.lg,
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 13,
    outlineWidth: {
      default: 0,
      ":focus-visible": 2,
    },
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    outlineColor: {
      default: "transparent",
      ":focus-visible": Tokens.color.blue[100],
    },
    outlineOffset: 1,
  },
});
