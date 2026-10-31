import * as stylex from "@stylexjs/stylex";
import { Layout } from "@ui";
import { shallow } from "@tanstack/store";
import { useSelector } from "@tanstack/react-store";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { t } from "../i18n/index.ts";
import {
  clearLineHover,
  hoverLine,
  lineGestureActive,
  pointerDownLine,
  pointerMoveLine,
  pointerUpLine,
  viewToContent,
} from "../state/line-editor.ts";
import {
  anchorMark,
  clearAnchorMark,
  deleteAnchor,
  deleteLastAnchor,
  finishLine,
  hitTest,
  insertAnchor,
  lineHoverStore,
  lineStore,
  pointOnLine,
  selectAnchor,
  setAnchorMark,
  type LineHit,
} from "../state/lines.ts";
import { magnetReach, type PointMark } from "../state/point-marks.ts";
import {
  activeTool,
  applyToolClick,
  applyToolMove,
  selectGroup,
  toolCursor,
  toolDrawsLine,
  toolEditsLine,
  toolStore,
  toolUsesMove,
  type ToolId,
} from "../state/tools.ts";
import {
  isPlainDelete,
  wheelDelta,
  zoomFactorFromWheel,
  type ContentPlacement,
} from "../state/viewport.ts";
import { useViewport, useViewportSelector } from "../state/use-viewport.ts";
import { stage } from "../styles/stage.ts";
import { LayersPanel } from "./layers-panel.tsx";
import { LineCanvas } from "./line-canvas.tsx";
import { NavigatorPanel } from "./navigator-panel.tsx";
import { PointMenu, type PointMenuState } from "./point-menu.tsx";
import { ToolSidebar } from "./tool-sidebar.tsx";

const DRAG_SLOP = 3;

type ArtboardStageProps = {
  contentKey: string;
  placement: ContentPlacement;
  navigator?: boolean;
  children: ReactNode;
};

type StageMotion = {
  zoom: number;
  panX: number;
  panY: number;
  grabbing: boolean;
  placed: boolean;
  crisp: boolean;
};

type StageDrag = {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
  tool: ToolId;
  forcePan: boolean;
  line: boolean;
};

export function ArtboardStage({
  contentKey,
  placement,
  navigator = false,
  children,
}: ArtboardStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<StageDrag | null>(null);
  const [pointMenu, setPointMenuState] = useState<PointMenuState | null>(null);
  const pointMenuRef = useRef<PointMenuState | null>(null);
  const setPointMenu = useCallback((next: PointMenuState | null) => {
    pointMenuRef.current = next;
    setPointMenuState(next);
  }, []);
  const closePointMenu = useCallback(() => setPointMenu(null), [setPointMenu]);
  const { actions, getState } = useViewport();
  const tool = useSelector(toolStore, activeTool);
  const editingLine = useSelector(
    lineStore,
    (state) => state.activeId !== null,
  );
  const spaceHeld = useViewportSelector((state) => state.spaceHeld);
  const motion = useViewportSelector(
    (state): StageMotion => ({
      zoom: state.zoom,
      panX: state.panX,
      panY: state.panY,
      grabbing: state.userAction === "pan",
      placed: state.fittedKey === contentKey && contentKey !== "",
      crisp: state.zoom >= 3,
    }),
    { compare: shallow },
  );

  useLayoutEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const publish = () => {
      actions.resizeView(node.clientWidth, node.clientHeight);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(node);
    return () => observer.disconnect();
  }, [actions]);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    const publish = () => {
      actions.resizeContent(
        contentKey,
        node.offsetWidth,
        node.offsetHeight,
        placement,
      );
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(node);
    return () => observer.disconnect();
  }, [actions, contentKey, placement]);

  useLayoutEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const apply = () => {
      const cursor = stageCursor(
        motion.grabbing || spaceHeld,
        tool,
        lineHoverStore.get(),
      );
      if (node.dataset.cursor === cursor) return;
      node.dataset.cursor = cursor;
    };
    apply();
    const hover = lineHoverStore.subscribe(apply);
    return () => hover.unsubscribe();
  }, [motion.grabbing, spaceHeld, tool]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      const target = event.target;
      const onNavigator =
        target instanceof Element &&
        Boolean(target.closest("[data-navigator]"));
      const onTools =
        target instanceof Element && Boolean(target.closest("[data-tools]"));
      const onLayers =
        target instanceof Element && Boolean(target.closest("[data-layers]"));
      const onMenu =
        target instanceof Element &&
        Boolean(target.closest("[data-point-menu]"));
      if (onLayers) return;
      if (onMenu) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      if (onTools) return;
      const zooming =
        onNavigator || event.ctrlKey || event.metaKey || event.altKey;
      if (zooming) {
        const rect = node.getBoundingClientRect();
        const origin = onNavigator
          ? "center"
          : { x: event.clientX - rect.left, y: event.clientY - rect.top };
        actions.zoomBy(
          zoomFactorFromWheel(event.deltaY, event.deltaMode),
          origin,
        );
        return;
      }
      actions.panBy(
        -wheelDelta(event.deltaX, event.deltaMode),
        -wheelDelta(event.deltaY, event.deltaMode),
      );
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [actions]);

  useEffect(() => {
    if (!toolDrawsLine(tool) && !toolEditsLine(tool) && !editingLine) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.isComposing ||
        event.altKey ||
        event.metaKey ||
        event.ctrlKey
      )
        return;
      if (pointMenuRef.current) return;
      const target = event.target;
      const naming =
        target instanceof Element && Boolean(target.closest("[data-layers]"));
      if (isTypingTarget(target) && !naming) return;
      event.preventDefault();
      if (naming && target instanceof HTMLElement) target.blur();
      const drag = dragRef.current;
      dragRef.current = null;
      const node = stageRef.current;
      if (drag && node?.hasPointerCapture(drag.id))
        node.releasePointerCapture(drag.id);
      pointerUpLine();
      const drawing = toolDrawsLine(activeTool(toolStore.get()));
      finishLine();
      if (drawing) selectGroup("edit");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingLine, getState, tool]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const onMove = (event: PointerEvent) => {
      if (lineGestureActive()) return;
      if (
        !toolEditsLine(activeTool(toolStore.get())) ||
        isChromeTarget(event.target)
      ) {
        clearLineHover();
        return;
      }
      const view = getState();
      const point = viewToContent(
        event.clientX,
        event.clientY,
        node.getBoundingClientRect(),
        view.panX,
        view.panY,
        view.zoom,
      );
      hoverLine(point.x, point.y, view.zoom);
    };
    const onLeave = () => clearLineHover();
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        lineGestureActive() ||
        !isPlainDelete(event) ||
        isTypingTarget(event.target)
      )
        return;
      if (pointMenuRef.current) return;
      const state = lineStore.get();
      if (state.activeId !== null && state.anchorIndex !== null) {
        event.preventDefault();
        deleteAnchor(state.activeId, state.anchorIndex);
        return;
      }
      const toolId = activeTool(toolStore.get());
      if (toolDrawsLine(toolId)) {
        event.preventDefault();
        deleteLastAnchor();
        return;
      }
      if (!toolEditsLine(toolId) || !state.activeId) return;
      const hover = lineHoverStore.get();
      const hovered =
        hover?.type === "anchor" && hover.layerId === state.activeId
          ? hover.index
          : null;
      if (hovered === null) return;
      event.preventDefault();
      deleteAnchor(state.activeId, hovered);
    };
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("keydown", onKeyDown, true);
      clearLineHover();
    };
  }, [getState, tool]);

  const endDrag = (pointerId: number) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== pointerId) return;
    if (drag.line) pointerUpLine();
    else if (!drag.moved) {
      const active = drag.forcePan ? "pan" : drag.tool;
      if (active !== "pan") {
        applyToolClick(active, actions, { x: drag.originX, y: drag.originY });
      }
    }
    dragRef.current = null;
    if (getState().userAction === "pan") actions.setUserAction("idle");
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    if (
      isNavigatorTarget(event.target) ||
      isToolsTarget(event.target) ||
      isLayersTarget(event.target) ||
      isPointMenuTarget(event.target) ||
      isInteractiveTarget(event.target)
    ) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const view = getState();
    const forcePan = event.button === 1 || view.spaceHeld;
    const toolId = activeTool(toolStore.get());
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    let claimed = false;
    if (!forcePan) {
      const point = viewToContent(
        event.clientX,
        event.clientY,
        rect,
        view.panX,
        view.panY,
        view.zoom,
      );
      const kind = toolDrawsLine(toolId)
        ? toolId
        : toolEditsLine(toolId)
          ? "edit"
          : null;
      claimed = pointerDownLine(point.x, point.y, view.zoom, kind);
      if (claimed) blurLayerName();
    }
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      originX: event.clientX - rect.left,
      originY: event.clientY - rect.top,
      moved: false,
      tool: toolId,
      forcePan,
      line: claimed,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.line) {
      const stageNode = stageRef.current;
      if (!stageNode) return;
      const view = getState();
      const point = viewToContent(
        event.clientX,
        event.clientY,
        stageNode.getBoundingClientRect(),
        view.panX,
        view.panY,
        view.zoom,
      );
      pointerMoveLine(point.x, point.y, view.zoom);
      return;
    }
    const travel = Math.hypot(
      event.clientX - drag.startX,
      event.clientY - drag.startY,
    );
    if (!drag.moved && travel < DRAG_SLOP) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    drag.moved = true;
    const active = drag.forcePan ? "pan" : drag.tool;
    if (!toolUsesMove(active) || (dx === 0 && dy === 0)) return;
    if (active === "pan" && getState().userAction !== "pan")
      actions.setUserAction("pan");
    applyToolMove(active, actions, dx, dy, {
      x: drag.originX,
      y: drag.originY,
    });
  };

  const onContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (isPointMenuTarget(event.target) || lineGestureActive()) return;
    if (
      isNavigatorTarget(event.target) ||
      isToolsTarget(event.target) ||
      isLayersTarget(event.target)
    ) {
      setPointMenu(null);
      return;
    }
    if (!toolEditsLine(activeTool(toolStore.get()))) {
      setPointMenu(null);
      return;
    }
    const node = stageRef.current;
    if (!node) return;
    const view = getState();
    const point = viewToContent(
      event.clientX,
      event.clientY,
      node.getBoundingClientRect(),
      view.panX,
      view.panY,
      view.zoom,
    );
    const hit = hitTest(lineStore.get(), point.x, point.y, view.zoom);
    if (hit?.type === "anchor") {
      event.preventDefault();
      selectAnchor(hit.layerId, hit.index);
      setPointMenu({
        x: event.clientX,
        y: event.clientY,
        layerId: hit.layerId,
        deleteIndex: hit.index,
        insert: null,
      });
      return;
    }
    const selectedId = lineStore.get().activeId;
    if (hit?.type === "stroke" && hit.layerId === selectedId) {
      const insert = pointOnLine(hit.layerId, point.x, point.y);
      if (insert) {
        event.preventDefault();
        setPointMenu({
          x: event.clientX,
          y: event.clientY,
          layerId: hit.layerId,
          deleteIndex: null,
          insert,
        });
        return;
      }
    }
    setPointMenu(null);
  };

  const content = stylex.props(stage.content);

  return (
    <Layout.Box
      grow
      shrink
      basis="0%"
      sx={stage.root}
      ref={stageRef}
      role="region"
      aria-label={t("artboard")}
      aria-keyshortcuts="Control+Equal Control+Minus Control+Digit0 Control+Digit1 Space"
      data-grabbing={motion.grabbing ? "" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => endDrag(event.pointerId)}
      onPointerCancel={(event) => endDrag(event.pointerId)}
      onLostPointerCapture={(event) => endDrag(event.pointerId)}
      onContextMenu={onContextMenu}
      onDragStart={(event) => event.preventDefault()}
    >
      <div
        ref={contentRef}
        className={content.className}
        data-crisp={motion.crisp ? "" : undefined}
        style={{
          ...content.style,
          transform: `translate3d(${motion.panX}px, ${motion.panY}px, 0) scale(${motion.zoom})`,
          visibility: motion.placed ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
      <LineCanvas />
      <LayersPanel />
      <ToolSidebar />
      {navigator ? <NavigatorPanel /> : null}
      {pointMenu ? (
        <PointMenuFrame menu={pointMenu} onClose={closePointMenu} />
      ) : null}
    </Layout.Box>
  );
}

const PointMenuFrame = memo(function PointMenuFrame({
  menu,
  onClose,
}: {
  menu: PointMenuState;
  onClose: () => void;
}) {
  const { getState } = useViewport();
  const index = menu.deleteIndex;
  return (
    <PointMenu
      x={menu.x}
      y={menu.y}
      mark={index === null ? null : anchorMark(menu.layerId, index)}
      onDelete={
        index === null
          ? null
          : () => {
              deleteAnchor(menu.layerId, index);
              onClose();
            }
      }
      onAdd={
        menu.insert
          ? () => {
              const insert = menu.insert;
              if (!insert) return;
              insertAnchor(
                menu.layerId,
                insert.index,
                insert.x,
                insert.y,
                magnetReach(getState().zoom, lineStore.get().scale),
              );
              onClose();
            }
          : null
      }
      onMark={
        index === null
          ? null
          : (mark) => {
              applyPointMark(menu.layerId, index, mark, getState().zoom);
              onClose();
            }
      }
      onClose={onClose}
    />
  );
});

function applyPointMark(
  layerId: string,
  index: number,
  mark: PointMark,
  zoom: number,
): void {
  if (anchorMark(layerId, index) === mark) {
    clearAnchorMark(layerId, index);
    return;
  }
  setAnchorMark(layerId, index, mark, magnetReach(zoom, lineStore.get().scale));
}

function stageCursor(
  panning: boolean,
  tool: ToolId,
  hover: LineHit | null,
): string {
  if (panning) return "grab";
  if (!toolEditsLine(tool)) return toolCursor(tool);
  if (hover?.type === "anchor") return "move";
  if (hover?.type === "stroke") return "pointer";
  return toolCursor(tool);
}

function isLayersTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("[data-layers]"));
}

function isChromeTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("[data-widget], [data-point-menu]"))
  );
}

function isPointMenuTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element && Boolean(target.closest("[data-point-menu]"))
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLInputElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function blurLayerName(): void {
  const activeElement = document.activeElement;
  if (
    activeElement instanceof HTMLElement &&
    activeElement.closest("[data-layers]")
  )
    activeElement.blur();
}

function isNavigatorTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element && Boolean(target.closest("[data-navigator]"))
  );
}

function isToolsTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("[data-tools]"));
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("button, a, input, textarea, select, label"))
  );
}
