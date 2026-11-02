import * as stylex from "@stylexjs/stylex";
import { Alert, Button, Input, Layout, Tokens } from "@ui";
import { useSelector } from "@tanstack/react-store";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { formatPixelSize, t } from "../i18n/index.ts";
import { a11y } from "../styles/a11y.ts";
import {
  blocksHistoryCommand,
  hasUnsavedHistory,
  historyCommand,
  historyStore,
  redo,
  undo,
} from "../state/history.ts";
import { isTopoFile, openTopoFile } from "../state/topo-file.ts";
import {
  IMAGE_FILE_ACCEPT,
  imageDocumentStore,
  openImageFile,
  registerImageFilePicker,
  requestImageFilePicker,
} from "../state/image-document.ts";
import { primaryModifier } from "../state/viewport.ts";
import { titleWithShortcut } from "../shortcuts.ts";
import { TopMenu } from "./top-menu/top-menu.tsx";

export function TopBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  const openPicker = () => {
    inputRef.current?.click();
  };

  useEffect(() => {
    return registerImageFilePicker(() => {
      if (hasUnsavedHistory()) {
        setDiscardOpen(true);
        return;
      }
      openPicker();
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!primaryModifier(event) || event.key.toLowerCase() !== "o") {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && target.type !== "file")
      ) {
        return;
      }
      event.preventDefault();
      requestImageFilePicker();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = historyCommand(event);
      if (!command || blocksHistoryCommand(event.target)) return;
      event.preventDefault();
      if (command === "undo") undo();
      else redo();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (isTopoFile(file)) void openTopoFile(file);
    else openImageFile(file);
  };

  return (
    <header {...stylex.props(styles.topbar)}>
      <Layout.Stack
        direction="row"
        align="center"
        gap="md"
        py="none"
        sx={styles.brand}
      >
        <span {...stylex.props(styles.brandMark)} aria-hidden="true" />
        Topo
      </Layout.Stack>
      <TopMenu />
      <HistoryButtons />
      <DocumentTitle />
      <Layout.Box grow sx={styles.spacer} />
      <PixelSize />
      <Button.Root
        variant="primary"
        sx={styles.openButton}
        onClick={requestImageFilePicker}
      >
        <Button.Text>{t("open")}</Button.Text>
      </Button.Root>
      <Input.Root
        sx={a11y.visuallyHidden}
        ref={inputRef}
        type="file"
        accept={IMAGE_FILE_ACCEPT}
        aria-label={t("chooseImage")}
        onChange={onFileChange}
      />
      <Alert.Root open={discardOpen} onOpenChange={setDiscardOpen}>
        <Alert.Portal>
          <Alert.Backdrop />
          <Alert.Popup>
            <Alert.Title>{t("unsavedTitle")}</Alert.Title>
            <Alert.Description>{t("unsavedOpenBody")}</Alert.Description>
            <Layout.Stack direction="row" justify="end" gap="md">
              <Alert.Close>{t("stay")}</Alert.Close>
              <Alert.Close tone="warning" onClick={openPicker}>
                {t("open")}
              </Alert.Close>
            </Layout.Stack>
          </Alert.Popup>
        </Alert.Portal>
      </Alert.Root>
    </header>
  );
}

function HistoryButtons() {
  const canUndo = useSelector(historyStore, (state) => state.canUndo);
  const canRedo = useSelector(historyStore, (state) => state.canRedo);
  return (
    <Layout.Stack direction="row" align="center" gap="xxs" sx={styles.history}>
      <Button.Root
        type="button"
        aria-label={t("undo")}
        title={titleWithShortcut(t("undo"), "undo")}
        disabled={!canUndo}
        sx={styles.iconButton}
        onClick={undo}
      >
        <Button.Icon id="undo" />
      </Button.Root>
      <Button.Root
        type="button"
        aria-label={t("redo")}
        title={titleWithShortcut(t("redo"), "redo")}
        disabled={!canRedo}
        sx={styles.iconButton}
        onClick={redo}
      >
        <Button.Icon id="redo" />
      </Button.Root>
    </Layout.Stack>
  );
}

function DocumentTitle() {
  const fileName = useSelector(imageDocumentStore, (state) => state.fileName);
  useEffect(() => {
    document.title = fileName
      ? t("documentTitle", { fileName })
      : t("appTitle");
  }, [fileName]);
  return (
    <p {...stylex.props(styles.docTitle)} title={fileName ?? undefined}>
      {fileName ?? t("noDocument")}
    </p>
  );
}

function PixelSize() {
  const size = useSelector(imageDocumentStore, (state) => state.size);
  if (!size) return null;
  return (
    <p {...stylex.props(styles.dimensions)}>
      {formatPixelSize(size.width, size.height)}
    </p>
  );
}

const styles = stylex.create({
  topbar: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: Tokens.spacing.xs,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
    height: {
      default: 42,
      [Tokens.media.narrow]: "auto",
    },
    minHeight: {
      default: null,
      [Tokens.media.narrow]: 42,
    },
    paddingBlock: {
      default: Tokens.spacing.none,
      [Tokens.media.narrow]: Tokens.spacing.sm,
    },
    paddingInline: Tokens.spacing.md,
    rowGap: {
      default: null,
      [Tokens.media.narrow]: Tokens.spacing.xxs,
    },
    flexWrap: {
      default: "nowrap",
      [Tokens.media.narrow]: "wrap",
    },
    backgroundColor: Tokens.color.neutral[600],
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: Tokens.color.neutral[850],
    color: Tokens.color.neutral[100],
  },
  brand: {
    paddingLeft: Tokens.spacing.xs,
    paddingRight: Tokens.spacing.md,
    fontSize: 14,
    fontWeight: 650,
    letterSpacing: "0.01em",
  },
  brandMark: {
    width: Tokens.size.xs,
    height: Tokens.size.xs,
    borderRadius: 2,
    backgroundColor: Tokens.color.blue[500],
    backgroundImage: `linear-gradient(${Tokens.color.neutral[0]}, ${Tokens.color.neutral[0]})`,
    backgroundPosition: "center",
    backgroundSize: "10px 8px",
    backgroundRepeat: "no-repeat",
    boxShadow: `0 0 0 1px ${Tokens.color.neutral[1000]}`,
  },
  openButton: {
    marginLeft: Tokens.spacing.xs,
  },
  history: {
    marginLeft: Tokens.spacing.xs,
  },
  iconButton: {
    width: Tokens.size.md,
    paddingInline: Tokens.spacing.none,
    borderRadius: 4,
  },
  docTitle: {
    position: {
      default: "absolute",
      [Tokens.media.narrow]: "static",
    },
    left: {
      default: "50%",
      [Tokens.media.narrow]: "auto",
    },
    order: {
      default: 0,
      [Tokens.media.narrow]: 5,
    },
    flexGrow: {
      default: 0,
      [Tokens.media.narrow]: 1,
    },
    flexShrink: 0,
    flexBasis: {
      default: "auto",
      [Tokens.media.narrow]: "100%",
    },
    maxWidth: {
      default: "min(46vw, 420px)",
      [Tokens.media.narrow]: "100%",
    },
    margin: Tokens.spacing.none,
    transform: {
      default: "translateX(-50%)",
      [Tokens.media.narrow]: "none",
    },
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 13,
    color: Tokens.color.neutral[200],
    pointerEvents: {
      default: "none",
      [Tokens.media.narrow]: "auto",
    },
    paddingTop: {
      default: Tokens.spacing.none,
      [Tokens.media.narrow]: Tokens.spacing.xxs,
    },
    paddingBottom: {
      default: Tokens.spacing.none,
      [Tokens.media.narrow]: Tokens.spacing.xs,
    },
    paddingInline: {
      default: Tokens.spacing.none,
      [Tokens.media.narrow]: Tokens.spacing.xs,
    },
    textAlign: {
      default: "start",
      [Tokens.media.narrow]: "left",
    },
  },
  spacer: {
    display: {
      default: "block",
      [Tokens.media.narrow]: "none",
    },
  },
  dimensions: {
    margin: Tokens.spacing.none,
    paddingInline: Tokens.spacing.md,
    fontSize: 13,
    fontVariantNumeric: "tabular-nums",
    color: Tokens.color.neutral[400],
    whiteSpace: "nowrap",
  },
});
