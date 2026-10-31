import * as stylex from "@stylexjs/stylex";
import { Button, Layout, Slider, Widget } from "@ui";
import { useSelector } from "@tanstack/react-store";
import { shallow } from "@tanstack/store";
import {
  memo,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { t } from "../i18n/index.ts";
import { imageDocumentStore } from "../state/image-document.ts";
import { a11y } from "../styles/a11y.ts";
import { navigator } from "../styles/stage.ts";
import {
  useViewport,
  useViewportSelector,
  useWidgetFrame,
} from "../state/use-viewport.ts";
import {
  formatZoomPercent,
  minimapLayout,
  minimapToContent,
  pointInFrame,
  sliderToZoom,
  zoomToSlider,
  type MinimapLayout,
} from "../state/viewport.ts";

export const NavigatorPanel = memo(function NavigatorPanel() {
  const helpId = useId();
  const frame = useWidgetFrame("navigator");
  const { keys } = useViewport();

  return (
    <Widget.Panel
      {...frame}
      renderAs="aside"
      resizable
      minWidth={180}
      minHeight={200}
      resizeLabel={t("resizePanel")}
      sx={navigator.panel}
      data-navigator=""
      aria-label={t("navigator")}
      aria-describedby={helpId}
    >
      <Widget.Header label={t("dragNavigator")}>{t("navigator")}</Widget.Header>
      <p {...stylex.props(a11y.visuallyHidden)} id={helpId}>
        {t("navigatorHelp", {
          pan: keys.pan,
          zoomIn: keys["zoom-in"],
          zoomOut: keys["zoom-out"],
        })}
      </p>
      <Widget.Container>
        <Minimap />
        <ZoomControls />
      </Widget.Container>
    </Widget.Panel>
  );
});

const ZoomControls = memo(function ZoomControls() {
  const zoom = useViewportSelector((state) => state.zoom);
  const { actions, keys } = useViewport();

  return (
    <Layout.Stack gap="sm" px="lg" sx={navigator.controls}>
      <Layout.Stack direction="row" align="center" gap="sm">
        <Button.Root
          sx={navigator.step}
          type="button"
          aria-label={t("zoomOut")}
          title={`${t("zoomOut")} (${keys["zoom-out"]})`}
          onClick={() => actions.zoomOut()}
        >
          <Button.Text>−</Button.Text>
        </Button.Root>
        <Slider.Root
          min={0}
          max={1000}
          step={1}
          value={zoomToSlider(zoom)}
          sx={navigator.slider}
          onValueChange={(value) => actions.zoomTo(sliderToZoom(value))}
        >
          <Slider.Control>
            <Slider.Track>
              <Slider.Indicator />
              <Slider.Thumb
                aria-label={t("zoomPercent")}
                aria-valuetext={formatZoomPercent(zoom)}
              />
            </Slider.Track>
          </Slider.Control>
        </Slider.Root>
        <Button.Root
          sx={navigator.step}
          type="button"
          aria-label={t("zoomIn")}
          title={`${t("zoomIn")} (${keys["zoom-in"]})`}
          onClick={() => actions.zoomIn()}
        >
          <Button.Text>+</Button.Text>
        </Button.Root>
      </Layout.Stack>
      <Layout.Stack direction="row" align="center" gap="sm">
        <ZoomField />
        <Button.Root
          variant="secondary"
          size="sm"
          sx={navigator.command}
          type="button"
          aria-label={t("fitWindow")}
          title={`${t("fitWindow")} (${keys.fit})`}
          onClick={() => actions.fit()}
        >
          <Button.Text>{t("fitShort")}</Button.Text>
        </Button.Root>
        <Button.Root
          variant="secondary"
          size="sm"
          sx={navigator.command}
          type="button"
          aria-label={t("actualSize")}
          title={`${t("actualSize")} (${keys["actual-size"]})`}
          onClick={() => actions.actualSize()}
        >
          <Button.Text>1:1</Button.Text>
        </Button.Root>
      </Layout.Stack>
    </Layout.Stack>
  );
});

const Minimap = memo(function Minimap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: number;
    x: number;
    y: number;
    scale: number;
    zoom: number;
  } | null>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const { actions, keys, getState } = useViewport();
  const view = useViewportSelector(
    (state) => ({
      zoom: state.zoom,
      panX: state.panX,
      panY: state.panY,
      viewWidth: state.viewWidth,
      viewHeight: state.viewHeight,
      contentWidth: state.contentWidth,
      contentHeight: state.contentHeight,
      panning: state.userAction === "minimap",
    }),
    { compare: shallow },
  );
  const imageUrl = useSelector(imageDocumentStore, (state) =>
    state.status === "ready" ? state.objectUrl : null,
  );
  const layout = minimapLayout(view, mapSize.width, mapSize.height);
  const panning = view.panning;

  useLayoutEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const publish = () => {
      setMapSize({ width: map.clientWidth, height: map.clientHeight });
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(map);
    return () => observer.disconnect();
  }, []);

  const endDrag = (pointerId: number) => {
    if (!dragRef.current || dragRef.current.id !== pointerId) return;
    dragRef.current = null;
    if (getState().userAction === "minimap") actions.setUserAction("idle");
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const frame = minimapLayout(getState(), rect.width, rect.height);
    if (!frame) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!pointInFrame(frame, localX, localY)) {
      const content = minimapToContent(frame, localX, localY);
      actions.centerOn(content.x, content.y);
    }
    const state = getState();
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scale: frame.scale,
      zoom: state.zoom,
    };
    actions.setUserAction("minimap");
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId || drag.scale === 0) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    actions.panBy(
      (-dx / drag.scale) * drag.zoom,
      (-dy / drag.scale) * drag.zoom,
    );
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 80 : 40;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      actions.panBy(step, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      actions.panBy(-step, 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      actions.panBy(0, step);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      actions.panBy(0, -step);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      actions.zoomIn();
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      actions.zoomOut();
    }
  };

  return (
    <div
      {...stylex.props(navigator.map, navigator.focusable)}
      ref={mapRef}
      data-grabbing={panning ? "" : undefined}
      role="application"
      tabIndex={0}
      aria-label={t("minimap")}
      aria-keyshortcuts={`${keys.pan} ArrowUp ArrowDown ArrowLeft ArrowRight`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => endDrag(event.pointerId)}
      onPointerCancel={(event) => endDrag(event.pointerId)}
      onLostPointerCapture={(event) => endDrag(event.pointerId)}
      onKeyDown={onKeyDown}
    >
      {layout ? <MapPicture layout={layout} imageUrl={imageUrl} /> : null}
    </div>
  );
});

function MapPicture({
  layout,
  imageUrl,
}: {
  layout: MinimapLayout;
  imageUrl: string | null;
}) {
  const picture = {
    left: layout.contentX,
    top: layout.contentY,
    width: layout.contentW,
    height: layout.contentH,
  };
  const frame = stylex.props(navigator.frame);
  const thumb = stylex.props(imageUrl ? navigator.thumb : navigator.swatch);
  return (
    <>
      {imageUrl ? (
        <img
          className={thumb.className}
          style={{ ...thumb.style, ...picture }}
          src={imageUrl}
          alt=""
          draggable={false}
        />
      ) : (
        <div
          className={thumb.className}
          style={{ ...thumb.style, ...picture }}
        />
      )}
      <div
        className={frame.className}
        style={{
          ...frame.style,
          left: layout.frameX,
          top: layout.frameY,
          width: Math.max(layout.frameW, 2),
          height: Math.max(layout.frameH, 2),
        }}
      />
    </>
  );
}

function ZoomField() {
  const zoom = useViewportSelector((state) => state.zoom);
  const { actions } = useViewport();
  const [draft, setDraft] = useState<string | null>(null);
  const skipCommit = useRef(false);
  const dirty = useRef(false);
  const shown = draft ?? formatZoomPercent(zoom);

  const commit = (raw: string | null) => {
    if (raw == null) return;
    const value = Number(raw.replace("%", "").replace(",", ".").trim());
    if (!Number.isFinite(value) || value <= 0) return;
    actions.zoomTo(value / 100);
  };

  return (
    <input
      {...stylex.props(navigator.percent, navigator.focusable)}
      value={shown}
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      aria-label={t("zoomPercent")}
      onFocus={(event) => {
        const input = event.currentTarget;
        dirty.current = false;
        setDraft(formatZoomPercent(zoom).replace("%", ""));
        requestAnimationFrame(() => input.select());
      }}
      onChange={(event) => {
        dirty.current = true;
        setDraft(event.target.value);
      }}
      onBlur={() => {
        if (skipCommit.current) {
          skipCommit.current = false;
          dirty.current = false;
          setDraft(null);
          return;
        }
        if (dirty.current) commit(draft);
        dirty.current = false;
        setDraft(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          event.preventDefault();
          skipCommit.current = true;
          setDraft(null);
          event.currentTarget.blur();
        }
      }}
    />
  );
}
