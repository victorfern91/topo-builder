import * as stylex from "@stylexjs/stylex";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Layout } from "../layout/index.ts";
import { Tokens } from "../tokens.stylex.ts";
import type {
  WidgetContainerProps,
  WidgetHeaderProps,
  WidgetMenuProps,
  WidgetPanelProps,
  WidgetSurface,
} from "./types.ts";

const DRAG_SLOP = 3;
const NUDGE = 8;
const NUDGE_FAST = 24;
const MIN_SIZE = 48;

type ResizeEdge = "e" | "s" | "se";

type DragSession = {
  id: number;
  x: number;
  y: number;
  originX: number;
  originY: number;
  moved: boolean;
};

type ResizeSession = {
  id: number;
  edge: ResizeEdge;
  x: number;
  y: number;
  width: number;
  height: number;
  moved: boolean;
};

type BoxSize = {
  width: number;
  height: number;
};

type WidgetDragValue = {
  dragging: boolean;
  x: number;
  y: number;
  onDragStart?: () => void;
  onMove: (x: number, y: number) => void;
  onDragEnd?: (moved: boolean) => void;
};

const WidgetDragContext = createContext<WidgetDragValue | null>(null);

/**
 * Floating panel. Place `Header` and `Container` inside it.
 * The header drags the panel; arrow keys nudge it.
 * Pass `resizable` to resize from the right edge, the bottom edge, and the corner.
 *
 * @example
 * ```tsx
 * import { Widget } from '@ui'
 *
 * <Widget.Panel x={x} y={y} onMove={move} onDragEnd={end} onResize={resize} resizable>
 *   <Widget.Header label="Drag to move">Layers</Widget.Header>
 *   <Widget.Container>{children}</Widget.Container>
 * </Widget.Panel>
 * ```
 */
export function WidgetPanel({
  renderAs = "div",
  ref,
  x,
  y,
  placed = true,
  dragging = false,
  resizable = false,
  minWidth = MIN_SIZE,
  minHeight = MIN_SIZE,
  resizeLabel = "Resize",
  onResize,
  onDragStart,
  onMove,
  onDragEnd,
  sx,
  className,
  style,
  children,
  onPointerDown,
  ...props
}: WidgetPanelProps) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState<BoxSize | null>(null);
  const surfaceRef = useCallback((next: HTMLElement | null) => {
    setNode(next);
  }, []);

  useLayoutEffect(() => {
    if (!node) return;
    const publish = () => {
      onResize?.(node.offsetWidth, node.offsetHeight);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, onResize]);

  useLayoutEffect(() => {
    if (typeof ref === "function") {
      const cleanup = ref(node);
      return () => {
        if (typeof cleanup === "function") cleanup();
        else void ref(null);
      };
    }
    if (!ref) return;
    ref.current = node;
    return () => {
      ref.current = null;
    };
  }, [node, ref]);

  const styled = stylex.props(styles.panel, sx);
  const mergedClass = [styled.className, className].filter(Boolean).join(" ");

  return (
    <WidgetDragContext.Provider
      value={{ dragging, x, y, onDragStart, onMove, onDragEnd }}
    >
      <WidgetFrame
        renderAs={renderAs}
        surfaceRef={surfaceRef}
        {...props}
        {...styled}
        className={mergedClass || undefined}
        data-widget=""
        data-dragging={dragging ? "" : undefined}
        style={{
          ...styled.style,
          ...style,
          transform: `translate3d(${x}px, ${y}px, 0)`,
          visibility: placed ? "visible" : "hidden",
          ...(size
            ? {
                width: size.width,
                height: size.height,
                maxWidth: "none",
                maxHeight: "none",
              }
            : null),
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          onPointerDown?.(event);
        }}
      >
        {children}
        {resizable ? (
          <WidgetResize
            label={resizeLabel}
            node={node}
            minWidth={minWidth}
            minHeight={minHeight}
            onResize={onResize}
            onSize={setSize}
          />
        ) : null}
      </WidgetFrame>
    </WidgetDragContext.Provider>
  );
}

function WidgetFrame({
  renderAs,
  surfaceRef,
  children,
  ...props
}: {
  renderAs: WidgetSurface;
  surfaceRef: (node: HTMLElement | null) => void;
  children?: ReactNode;
} & Omit<ComponentProps<"div">, "ref">) {
  if (renderAs === "aside") {
    return (
      <aside ref={surfaceRef} {...props}>
        {children}
      </aside>
    );
  }
  if (renderAs === "section") {
    return (
      <section ref={surfaceRef} {...props}>
        {children}
      </section>
    );
  }
  return (
    <div ref={surfaceRef} {...props}>
      {children}
    </div>
  );
}

/**
 * Drag handle. With `children`, a title row. Without, a compact grip bar.
 * Both show the same grip. Reads the drag session from the surrounding `Panel`.
 */
export function WidgetHeader({ label, children, sx }: WidgetHeaderProps) {
  const drag = useContext(WidgetDragContext);
  if (!drag) throw new Error("Widget.Header belongs inside Widget.Panel");
  const session = useRef<DragSession | null>(null);
  const titled = children != null && children !== false;
  const chrome = stylex.props(
    titled ? styles.header : styles.bar,
    styles.focusable,
    sx,
  );

  const endDrag = (pointerId: number) => {
    const current = session.current;
    if (!current || current.id !== pointerId) return;
    session.current = null;
    drag.onDragEnd?.(current.moved);
  };

  const shared = {
    "data-dragging": drag.dragging ? "" : undefined,
    role: "application" as const,
    tabIndex: 0,
    "aria-label": label,
    "aria-keyshortcuts": "ArrowUp ArrowDown ArrowLeft ArrowRight",
    className: chrome.className,
    style: chrome.style,
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      session.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        originX: drag.x,
        originY: drag.y,
        moved: false,
      };
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      const current = session.current;
      if (!current || current.id !== event.pointerId) return;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      if (!current.moved && Math.hypot(dx, dy) < DRAG_SLOP) return;
      if (!current.moved) drag.onDragStart?.();
      current.moved = true;
      drag.onMove(current.originX + dx, current.originY + dy);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) =>
      endDrag(event.pointerId),
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) =>
      endDrag(event.pointerId),
    onLostPointerCapture: (event: ReactPointerEvent<HTMLDivElement>) =>
      endDrag(event.pointerId),
    onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const step = event.shiftKey ? NUDGE_FAST : NUDGE;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        drag.onMove(drag.x - step, drag.y);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        drag.onMove(drag.x + step, drag.y);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        drag.onMove(drag.x, drag.y - step);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        drag.onMove(drag.x, drag.y + step);
      }
    },
  };

  const grip = <span {...stylex.props(styles.grip)} aria-hidden="true" />;

  if (!titled) {
    return (
      <Layout.Grid place="center" {...shared}>
        {grip}
      </Layout.Grid>
    );
  }

  return (
    <Layout.Stack
      direction="row"
      align="center"
      gap="md"
      grow={false}
      shrink={false}
      px="md"
      {...shared}
    >
      {grip}
      <span {...stylex.props(styles.title)}>{children}</span>
    </Layout.Stack>
  );
}

function WidgetResize({
  label,
  node,
  minWidth,
  minHeight,
  flush = false,
  bound = "parent",
  onResize,
  onSize,
}: {
  label: string;
  node: HTMLElement | null;
  minWidth: number;
  minHeight: number;
  /** Cover the top of the east edge. Panels leave room for the header. */
  flush?: boolean;
  /** `parent` uses the offset parent. `viewport` uses the window. */
  bound?: "parent" | "viewport";
  onResize?: (width: number, height: number) => void;
  onSize: (size: BoxSize) => void;
}) {
  const session = useRef<ResizeSession | null>(null);
  const live = useRef<BoxSize | null>(null);

  const box = (): BoxSize | null => {
    if (live.current) return live.current;
    if (!node) return null;
    return { width: node.offsetWidth, height: node.offsetHeight };
  };

  const limit = (width: number, height: number): BoxSize => {
    const max = maxBox(bound, node, width, height);
    return {
      width: clampEdge(Math.round(width), minWidth, max.width),
      height: clampEdge(Math.round(height), minHeight, max.height),
    };
  };

  const publish = (next: BoxSize) => {
    live.current = next;
    onSize(next);
    onResize?.(next.width, next.height);
  };

  const endResize = (pointerId: number) => {
    const current = session.current;
    if (!current || current.id !== pointerId) return;
    session.current = null;
  };

  const start = (
    edge: ResizeEdge,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const current = box();
    if (!current || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    session.current = {
      id: event.pointerId,
      edge,
      x: event.clientX,
      y: event.clientY,
      width: current.width,
      height: current.height,
      moved: false,
    };
  };

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = session.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved && Math.hypot(dx, dy) < DRAG_SLOP) return;
    current.moved = true;
    const width = current.edge === "s" ? current.width : current.width + dx;
    const height = current.edge === "e" ? current.height : current.height + dy;
    publish(limit(width, height));
  };

  const nudge = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const current = box();
    if (!current) return;
    const step = event.shiftKey ? NUDGE_FAST : NUDGE;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      publish(limit(current.width + step, current.height));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      publish(limit(current.width - step, current.height));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      publish(limit(current.width, current.height + step));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      publish(limit(current.width, current.height - step));
    }
  };

  const corner = stylex.props(styles.resizeCorner, styles.focusable);
  const east = stylex.props(styles.resizeEast, flush && styles.resizeEastFlush);

  return (
    <>
      <div
        {...east}
        aria-hidden="true"
        onPointerDown={(event) => start("e", event)}
        onPointerMove={move}
        onPointerUp={(event) => endResize(event.pointerId)}
        onPointerCancel={(event) => endResize(event.pointerId)}
        onLostPointerCapture={(event) => endResize(event.pointerId)}
      />
      <div
        {...stylex.props(styles.resizeSouth)}
        aria-hidden="true"
        onPointerDown={(event) => start("s", event)}
        onPointerMove={move}
        onPointerUp={(event) => endResize(event.pointerId)}
        onPointerCancel={(event) => endResize(event.pointerId)}
        onLostPointerCapture={(event) => endResize(event.pointerId)}
      />
      <div
        className={corner.className}
        style={corner.style}
        role="application"
        tabIndex={0}
        aria-label={label}
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
        onPointerDown={(event) => start("se", event)}
        onPointerMove={move}
        onPointerUp={(event) => endResize(event.pointerId)}
        onPointerCancel={(event) => endResize(event.pointerId)}
        onLostPointerCapture={(event) => endResize(event.pointerId)}
        onKeyDown={nudge}
      >
        <span {...stylex.props(styles.resizeMark)} aria-hidden="true" />
      </div>
    </>
  );
}

function maxBox(
  bound: "parent" | "viewport",
  node: HTMLElement | null,
  width: number,
  height: number,
): BoxSize {
  if (bound === "viewport" && node) {
    const rect = node.getBoundingClientRect();
    return {
      width: window.innerWidth - rect.left,
      height: window.innerHeight - rect.top,
    };
  }
  const parent = node?.offsetParent;
  return {
    width: parent instanceof HTMLElement ? parent.clientWidth : width,
    height: parent instanceof HTMLElement ? parent.clientHeight : height,
  };
}

function clampEdge(value: number, min: number, max: number): number {
  const ceiling = Math.max(min, max);
  return Math.min(ceiling, Math.max(min, value));
}

/** Body of a panel. Column flex container; pass layout props for the instance. */
export function WidgetContainer({
  className,
  style,
  ...props
}: WidgetContainerProps) {
  const styled = stylex.props(styles.container);
  const mergedClass = [styled.className, className].filter(Boolean).join(" ");
  return (
    <Layout.Stack
      {...props}
      className={mergedClass || undefined}
      style={{ ...styled.style, ...style }}
    />
  );
}

/**
 * Popup surface. Position it from the instance (`sx` or `style`).
 * Pass `resizable` to resize from the right edge, the bottom edge, and the corner.
 * The menu stops at the viewport edge.
 *
 * @example
 * ```tsx
 * <Widget.Menu aria-label="Zoom options">{items}</Widget.Menu>
 * <Widget.Menu resizable onResize={resize} aria-label="Layers">
 *   {items}
 * </Widget.Menu>
 * ```
 */
export function WidgetMenu({
  ref,
  sx,
  role = "menu",
  className,
  style,
  resizable = false,
  minWidth = MIN_SIZE,
  minHeight = MIN_SIZE,
  resizeLabel = "Resize",
  onResize,
  children,
  ...props
}: WidgetMenuProps) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<BoxSize | null>(null);
  const surfaceRef = useCallback((next: HTMLDivElement | null) => {
    setNode(next);
  }, []);

  useLayoutEffect(() => {
    if (!resizable || !node) return;
    const publish = () => {
      onResize?.(node.offsetWidth, node.offsetHeight);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, onResize, resizable]);

  useLayoutEffect(() => {
    if (typeof ref === "function") {
      const cleanup = ref(node);
      return () => {
        if (typeof cleanup === "function") cleanup();
        else void ref(null);
      };
    }
    if (!ref) return;
    ref.current = node;
    return () => {
      ref.current = null;
    };
  }, [node, ref]);

  const body = stylex.props(styles.menuBody, size && styles.menuBodyFill);

  return (
    <Layout.Box
      p="xs"
      {...props}
      ref={surfaceRef}
      role={role}
      sx={[styles.menu, resizable && styles.menuAnchor, sx] as never}
      className={className}
      style={{
        ...style,
        ...(size
          ? {
              width: size.width,
              height: size.height,
              maxWidth: "none",
              maxHeight: "none",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }
          : null),
      }}
    >
      {resizable ? (
        <div className={body.className} style={body.style}>
          {children}
        </div>
      ) : (
        children
      )}
      {resizable ? (
        <WidgetResize
          flush
          bound="viewport"
          label={resizeLabel}
          node={node}
          minWidth={minWidth}
          minHeight={minHeight}
          onResize={onResize}
          onSize={setSize}
        />
      ) : null}
    </Layout.Box>
  );
}

const styles = stylex.create({
  panel: {
    position: "absolute",
    top: Tokens.spacing.none,
    left: Tokens.spacing.none,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    backgroundColor: Tokens.color.neutral[750],
    color: Tokens.color.neutral[100],
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: Tokens.color.neutral[950],
    borderRadius: 6,
    boxShadow: {
      default: `0 12px 28px ${Tokens.color.black[40]}`,
      "[data-dragging]": `0 18px 40px ${Tokens.color.black[55]}`,
    },
    userSelect: "none",
    touchAction: "none",
  },
  bar: {
    width: "100%",
    height: 18,
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: Tokens.spacing.xs,
    cursor: {
      default: "grab",
      "[data-dragging]": "grabbing",
    },
    userSelect: "none",
  },
  header: {
    height: Tokens.size.md,
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: Tokens.color.neutral[850],
    fontSize: 12,
    fontWeight: 650,
    cursor: {
      default: "grab",
      "[data-dragging]": "grabbing",
    },
    userSelect: "none",
  },
  focusable: {
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
  grip: {
    width: 10,
    height: 10,
    flexGrow: 0,
    flexShrink: 0,
    opacity: 0.7,
    backgroundImage: "radial-gradient(currentColor 1px, transparent 1.4px)",
    backgroundSize: "4px 4px",
    backgroundPosition: "center",
  },
  resizeEast: {
    position: "absolute",
    top: Tokens.size.md,
    right: Tokens.spacing.none,
    bottom: 14,
    zIndex: 2,
    width: 6,
    cursor: "ew-resize",
    touchAction: "none",
  },
  resizeEastFlush: {
    top: Tokens.spacing.none,
  },
  resizeSouth: {
    position: "absolute",
    right: 14,
    bottom: Tokens.spacing.none,
    left: Tokens.spacing.none,
    zIndex: 2,
    height: 6,
    cursor: "ns-resize",
    touchAction: "none",
  },
  resizeCorner: {
    position: "absolute",
    right: Tokens.spacing.none,
    bottom: Tokens.spacing.none,
    zIndex: 3,
    width: 14,
    height: 14,
    cursor: "nwse-resize",
    touchAction: "none",
  },
  resizeMark: {
    position: "absolute",
    right: 3,
    bottom: 3,
    width: 7,
    height: 7,
    opacity: 0.7,
    backgroundColor: "currentColor",
    clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
  },
  title: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  container: {
    minWidth: 0,
    minHeight: 0,
  },
  menu: {
    backgroundColor: Tokens.color.neutral[750],
    color: Tokens.color.neutral[100],
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: Tokens.color.neutral[950],
    borderRadius: 6,
    boxShadow: `0 8px 24px ${Tokens.color.black[45]}`,
  },
  menuAnchor: {
    position: "relative",
    boxSizing: "border-box",
  },
  menuBody: {
    minWidth: 0,
  },
  menuBodyFill: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    overflow: "auto",
  },
});
