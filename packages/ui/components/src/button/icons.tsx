import * as stylex from "@stylexjs/stylex";

function ZoomInIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="8.25" cy="8.25" r="5" />
      <path d="M12.2 12.2 16.4 16.4" />
      <path d="M8.25 5.9v4.7M5.9 8.25h4.7" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="8.25" cy="8.25" r="5" />
      <path d="M12.2 12.2 16.4 16.4" />
      <path d="M5.9 8.25h4.7" />
    </svg>
  );
}

function FitIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4.25 8V4.25H8M12 4.25h3.75V8M15.75 12v3.75H12M8 15.75H4.25V12" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg {...iconProps}>
      <path d="M6.2 16.2 9.1 11.5 12 8.2 14.6 4.4" />
      <circle cx="6.2" cy="16.2" r="1.15" />
      <circle cx="9.1" cy="11.5" r="1.15" />
      <circle cx="12" cy="8.2" r="1.15" />
      <circle cx="14.6" cy="4.4" r="1.15" />
    </svg>
  );
}

function BoulderIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3.6 15.2c.8-3.4 2.6-5.6 5-6.4 1.5-.5 2.2-2 3.8-2.4 2-.6 3.6.6 4.4 2.1.7 1.3 1.5 2 1 4.2" />
      <path d="M7.2 13.8c1.5-1.7 2.4-1.9 3.6-3 .8-.7 1.9-.4 2.7.5" />
    </svg>
  );
}

function EditRouteIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3.4 2.5v12.1l3.7-3.7 4.4 6.3 2.7-1.8-4.4-6.3h6.4z" />
    </svg>
  );
}

function MoveIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10 3.2v13.6M3.2 10h13.6" />
      <path d="M10 3.2 7.6 5.6M10 3.2l2.4 2.4M10 16.8l-2.4-2.4M10 16.8l2.4-2.4M3.2 10l2.4-2.4M3.2 10l2.4 2.4M16.8 10l-2.4-2.4M16.8 10l-2.4 2.4" />
    </svg>
  );
}

const glyphs = {
  move: MoveIcon,
  route: RouteIcon,
  boulder: BoulderIcon,
  edit: EditRouteIcon,
  "zoom-in": ZoomInIcon,
  "zoom-out": ZoomOutIcon,
  fit: FitIcon,
};

export function ButtonGlyph({ id }: { id: string }) {
  if (!isGlyph(id)) return null;
  const Glyph = glyphs[id];
  return <Glyph />;
}

function isGlyph(id: string): id is keyof typeof glyphs {
  return Object.hasOwn(glyphs, id);
}

const styles = stylex.create({
  icon: {
    width: 20,
    height: 20,
    display: "block",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
});

const iconProps = {
  ...stylex.props(styles.icon),
  viewBox: "0 0 20 20",
  "aria-hidden": true as const,
};
