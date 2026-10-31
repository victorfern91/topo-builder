import * as stylex from "@stylexjs/stylex";
import { Menu } from "@base-ui/react/menu";
import { Button, Layout, Tokens } from "@ui";
import { useSelector } from "@tanstack/react-store";
import {
  useEffect,
  useRef,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { formatPixelSize, formatScale, t } from "../i18n/index.ts";
import { a11y } from "../styles/a11y.ts";
import {
  DRAW_SCALE_MAX,
  DRAW_SCALE_MIN,
  drawScaleFromRatio,
  drawScaleRatio,
  lineStore,
  setDrawScale,
} from "../state/lines.ts";
import {
  IMAGE_FILE_ACCEPT,
  imageDocumentStore,
  openImageFile,
  registerImageFilePicker,
  requestImageFilePicker,
} from "../state/image-document.ts";
import { primaryModifier } from "../state/viewport.ts";

export function TopBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileName = useSelector(imageDocumentStore, (state) => state.fileName);
  const size = useSelector(imageDocumentStore, (state) => state.size);
  const shortcutLabel = applePlatform() ? "⌘O" : "Ctrl+O";
  const imageReady = useSelector(
    imageDocumentStore,
    (state) => state.status === "ready",
  );
  const scale = useSelector(lineStore, (state) => state.scale);

  useEffect(() => {
    document.title = fileName
      ? t("documentTitle", { fileName })
      : t("appTitle");
  }, [fileName]);

  useEffect(() => {
    return registerImageFilePicker(() => {
      inputRef.current?.click();
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
      inputRef.current?.click();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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
      <Menu.Root>
        <Menu.Trigger {...stylex.props(styles.barButton)}>
          {t("file")}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner
            {...stylex.props(styles.positioner)}
            sideOffset={6}
            align="start"
          >
            <Menu.Popup {...stylex.props(styles.popup)}>
              <Menu.Item
                {...stylex.props(styles.menuItem, stylex.defaultMarker())}
                onClick={() => inputRef.current?.click()}
              >
                <span>{t("openEllipsis")}</span>
                <span {...stylex.props(styles.kbd)}>{shortcutLabel}</span>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {imageReady ? <ScaleBar scale={scale} /> : null}
      <p {...stylex.props(styles.docTitle)} title={fileName ?? undefined}>
        {fileName ?? t("noDocument")}
      </p>
      <Layout.Box grow sx={styles.spacer} />
      {size ? (
        <p {...stylex.props(styles.dimensions)}>
          {formatPixelSize(size.width, size.height)}
        </p>
      ) : null}
      <Button.Root
        variant="primary"
        sx={styles.openButton}
        onClick={requestImageFilePicker}
      >
        <Button.Text>{t("open")}</Button.Text>
      </Button.Root>
      <input
        {...stylex.props(a11y.visuallyHidden)}
        ref={inputRef}
        type="file"
        accept={IMAGE_FILE_ACCEPT}
        aria-label={t("chooseImage")}
        onChange={onFileChange}
      />
    </header>
  );
}

function ScaleBar({ scale }: { scale: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const ratio = drawScaleRatio(scale);

  const setFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    setDrawScale(drawScaleFromRatio((clientX - rect.left) / rect.width));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setFromClientX(event.clientX);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    setFromClientX(event.clientX);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setDrawScale(drawScaleFromRatio(ratio + step));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setDrawScale(drawScaleFromRatio(ratio - step));
    } else if (event.key === "Home") {
      event.preventDefault();
      setDrawScale(DRAW_SCALE_MIN);
    } else if (event.key === "End") {
      event.preventDefault();
      setDrawScale(DRAW_SCALE_MAX);
    }
  };

  return (
    <Layout.Stack
      direction="row"
      align="center"
      gap="md"
      grow={false}
      shrink={false}
      sx={styles.scaleControl}
    >
      <span {...stylex.props(styles.scaleLabel)}>{t("scale")}</span>
      <Layout.Stack
        direction="row"
        align="center"
        sx={styles.scaleTrack}
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={t("scale")}
        aria-orientation="horizontal"
        aria-valuemin={Math.round(DRAW_SCALE_MIN * 100)}
        aria-valuemax={Math.round(DRAW_SCALE_MAX * 100)}
        aria-valuenow={Math.round(scale * 100)}
        aria-valuetext={formatScale(scale)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
      >
        <Layout.Box
          renderAs="span"
          display="block"
          sx={styles.scaleGroove}
          aria-hidden="true"
        >
          <Layout.Box
            renderAs="span"
            display="block"
            sx={styles.scaleFill}
            style={{ width: `${ratio * 100}%` }}
          />
        </Layout.Box>
      </Layout.Stack>
      <span {...stylex.props(styles.scaleReadout)}>{formatScale(scale)}</span>
    </Layout.Stack>
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
  positioner: {
    zIndex: 30,
  },
  popup: {
    minWidth: 220,
    padding: Tokens.spacing.xs,
    backgroundColor: Tokens.color.neutral[750],
    color: Tokens.color.neutral[100],
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: Tokens.color.neutral[950],
    borderRadius: 6,
    boxShadow: `0 8px 24px ${Tokens.color.black[45]}`,
    outlineStyle: "none",
  },
  menuItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: Tokens.spacing.xxxxl,
    paddingBlock: Tokens.spacing.sm,
    paddingInline: Tokens.spacing.lg,
    borderRadius: 4,
    fontSize: 13,
    lineHeight: 1.3,
    cursor: "default",
    outlineStyle: "none",
    userSelect: "none",
    backgroundColor: {
      default: "transparent",
      "[data-highlighted]": Tokens.color.blue[500],
    },
    color: {
      default: "inherit",
      "[data-highlighted]": Tokens.color.neutral[0],
    },
  },
  kbd: {
    color: {
      default: Tokens.color.neutral[400],
      [stylex.when.ancestor("[data-highlighted]")]: "inherit",
    },
  },
  scaleControl: {
    marginLeft: Tokens.spacing.md,
  },
  scaleLabel: {
    fontSize: 13,
    color: Tokens.color.neutral[400],
  },
  scaleTrack: {
    width: 120,
    height: 22,
    cursor: "pointer",
    touchAction: "none",
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
  scaleGroove: {
    width: "100%",
    height: Tokens.size.xxs,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: Tokens.color.neutral[850],
    pointerEvents: "none",
  },
  scaleFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: Tokens.color.blue[500],
  },
  scaleReadout: {
    width: 42,
    fontSize: 13,
    fontVariantNumeric: "tabular-nums",
    color: Tokens.color.neutral[400],
    textAlign: "end",
  },
});
