import * as stylex from "@stylexjs/stylex";
import { Menu } from "@base-ui/react/menu";
import { Button, Layout, Slider, Tokens } from "@ui";
import { useSelector } from "@tanstack/react-store";
import { useEffect, useRef, type ChangeEvent } from "react";
import { formatPixelSize, formatScale, t } from "../i18n/index.ts";
import { a11y } from "../styles/a11y.ts";
import { lineStore, setDrawScale } from "../state/lines.ts";
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
  return (
    <Slider.Root
      min={0}
      max={1000}
      step={1}
      value={zoomToSlider(scale)}
      sx={styles.scaleSlider}
      onValueChange={(value) => setDrawScale(sliderToZoom(value))}
    >
      <Slider.Label>{t("scale")}</Slider.Label>
      <Slider.Control sx={styles.scaleControl}>
        <Slider.Track>
          <Slider.Indicator />
          <Slider.Thumb aria-valuetext={formatScale(scale)} />
        </Slider.Track>
      </Slider.Control>
      <Slider.Value sx={styles.scaleReadout}>
        {() => formatScale(scale)}
      </Slider.Value>
    </Slider.Root>
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
  scaleSlider: {
    flexGrow: 0,
    flexShrink: 0,
    marginLeft: Tokens.spacing.md,
  },
  scaleControl: {
    width: 120,
    flexGrow: 0,
    flexShrink: 0,
  },
  scaleReadout: {
    width: 42,
    textAlign: "end",
  },
});
