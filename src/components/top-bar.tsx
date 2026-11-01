import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  Button,
  Input,
  Layout,
  Popover,
  Select,
  Slider,
  Tokens,
} from "@ui";
import { useSelector } from "@tanstack/react-store";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { formatPixelSize, formatScale, t } from "../i18n/index.ts";
import { a11y } from "../styles/a11y.ts";
import {
  blocksHistoryCommand,
  hasUnsavedHistory,
  historyCommand,
  historyStore,
  redo,
  undo,
} from "../state/history.ts";
import { GRADE_SYSTEMS, type GradeSystem } from "../state/grade.ts";
import { lineStore, setDrawScale } from "../state/lines.ts";
import { preferencesStore, setGradeSystem } from "../state/preferences.ts";
import {
  IMAGE_FILE_ACCEPT,
  imageDocumentStore,
  openImageFile,
  registerImageFilePicker,
  requestImageFilePicker,
} from "../state/image-document.ts";
import {
  primaryModifier,
  sliderToZoom,
  zoomToSlider,
} from "../state/viewport.ts";

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
    if (file) openImageFile(file);
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
      <FileMenu />
      <EditMenu />
      <ViewMenu />
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

function FileMenu() {
  const shortcutLabel = applePlatform() ? "⌘O" : "Ctrl+O";
  return (
    <Popover.Root>
      <Popover.Trigger sx={styles.barButton}>{t("file")}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start">
          <Popover.Popup>
            <Popover.Close onClick={requestImageFilePicker}>
              <span>{t("openEllipsis")}</span>
              <span {...stylex.props(styles.kbd)}>{shortcutLabel}</span>
            </Popover.Close>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function EditMenu() {
  const history = useSelector(historyStore, (state) => state);
  const apple = applePlatform();
  const undoShortcut = apple ? "⌘Z" : "Ctrl+Z";
  const redoShortcut = apple ? "⌘⇧Z" : "Ctrl+Y";
  return (
    <Popover.Root>
      <Popover.Trigger sx={styles.barButton}>{t("edit")}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start">
          <Popover.Popup>
            <Popover.Close disabled={!history.canUndo} onClick={undo}>
              <span>{t("undo")}</span>
              <span {...stylex.props(styles.kbd)}>{undoShortcut}</span>
            </Popover.Close>
            <Popover.Close disabled={!history.canRedo} onClick={redo}>
              <span>{t("redo")}</span>
              <span {...stylex.props(styles.kbd)}>{redoShortcut}</span>
            </Popover.Close>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ViewMenu() {
  return (
    <Popover.Root>
      <Popover.Trigger sx={styles.barButton}>{t("view")}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start">
          <Popover.Popup sx={styles.viewPopup}>
            <ScaleBar />
            <GradeSystemOptions />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function HistoryButtons() {
  const canUndo = useSelector(historyStore, (state) => state.canUndo);
  const canRedo = useSelector(historyStore, (state) => state.canRedo);
  const apple = applePlatform();
  const undoShortcut = apple ? "⌘Z" : "Ctrl+Z";
  const redoShortcut = apple ? "⌘⇧Z" : "Ctrl+Y";
  return (
    <Layout.Stack direction="row" align="center" gap="xxs" sx={styles.history}>
      <Button.Root
        type="button"
        aria-label={t("undo")}
        title={`${t("undo")} (${undoShortcut})`}
        disabled={!canUndo}
        sx={styles.iconButton}
        onClick={undo}
      >
        <Button.Icon id="undo" />
      </Button.Root>
      <Button.Root
        type="button"
        aria-label={t("redo")}
        title={`${t("redo")} (${redoShortcut})`}
        disabled={!canRedo}
        sx={styles.iconButton}
        onClick={redo}
      >
        <Button.Icon id="redo" />
      </Button.Root>
    </Layout.Stack>
  );
}

function ScaleBar() {
  const ready = useSelector(
    imageDocumentStore,
    (state) => state.status === "ready",
  );
  const scale = useSelector(lineStore, (state) => state.scale);
  if (!ready) return null;
  return (
    <Slider.Root
      min={0}
      max={1000}
      step={1}
      value={zoomToSlider(scale)}
      label={t("scale")}
      readout={formatScale(scale)}
      sx={styles.scaleRow}
      controlSx={styles.scaleControl}
      readoutSx={styles.scaleReadout}
      onValueChange={(value) => setDrawScale(sliderToZoom(value))}
    />
  );
}

function GradeSystemOptions() {
  const system = useSelector(preferencesStore, (state) => state.gradeSystem);
  return (
    <Layout.Stack gap="xs" sx={styles.gradeField}>
      <span {...stylex.props(styles.gradeLabel)}>{t("gradeSystem")}</span>
      <Select.Root<GradeSystem>
        value={system}
        onValueChange={(next) => {
          if (next) setGradeSystem(next);
        }}
      >
        <Select.Trigger aria-label={t("gradeSystem")} sx={styles.gradeTrigger}>
          <Select.Value>{(value) => gradeSystemLabel(value)}</Select.Value>
          <Select.Icon />
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner sideOffset={4}>
            <Select.Popup>
              <Select.List>
                {GRADE_SYSTEMS.map((id) => (
                  <Select.Item key={id} value={id} label={gradeSystemLabel(id)}>
                    <Select.ItemIndicator />
                    <Select.ItemText>{gradeSystemLabel(id)}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </Layout.Stack>
  );
}

function gradeSystemLabel(system: GradeSystem | null): string {
  return t(system === "yds" ? "americanGrade" : "frenchGrade");
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

function applePlatform(): boolean {
  return /\b(Mac|iPhone|iPad|iPod)\b/i.test(navigator.userAgent);
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
  barButton: {
    appearance: "none",
    borderWidth: 0,
    backgroundColor: {
      default: "transparent",
      ":hover": Tokens.color.white[8],
      "[data-popup-open]": Tokens.color.white[8],
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
  kbd: {
    color: {
      default: Tokens.color.neutral[400],
      [stylex.when.ancestor(":hover")]: "inherit",
      [stylex.when.ancestor(":focus-visible")]: "inherit",
    },
  },
  viewPopup: {
    minWidth: 280,
    gap: Tokens.spacing.xxs,
  },
  scaleRow: {
    width: "100%",
    paddingBlock: Tokens.spacing.sm,
    paddingInline: Tokens.spacing.lg,
  },
  scaleControl: {
    width: 120,
    flexGrow: 1,
    flexShrink: 1,
  },
  scaleReadout: {
    width: 42,
    textAlign: "end",
  },
  gradeField: {
    paddingBlock: Tokens.spacing.sm,
    paddingInline: Tokens.spacing.lg,
  },
  gradeLabel: {
    fontSize: 13,
    color: Tokens.color.neutral[400],
  },
  gradeTrigger: {
    width: "100%",
  },
});
