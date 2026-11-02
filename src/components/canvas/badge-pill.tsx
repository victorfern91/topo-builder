import type { CSSProperties, ReactNode } from "react";
import {
  BADGE_TYPE,
  numberBadge,
  type RouteBadge,
} from "../../state/route-number.ts";
import {
  BADGE_EDGE,
  BADGE_EDGE_COLOR,
  BADGE_FILL,
  BADGE_TEXT,
} from "./paint/badges.ts";

type BadgePillProps = {
  badge: RouteBadge;
  children: string;
  /** Extra styles on the pill (ghost scale lives on the wrapper). */
  style?: CSSProperties;
  className?: string;
};

/**
 * DOM twin of the canvas badge pill. Sizes, pad, and ring come from the same
 * metrics paint uses so palette tiles and drag ghosts match the artboard.
 */
export function BadgePill({
  badge,
  children,
  style,
  className,
}: BadgePillProps): ReactNode {
  const type = BADGE_TYPE[badge];
  const size = numberBadge(children, badge);
  const ring = badge === "number" ? BADGE_EDGE : 0;
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        width: size.width,
        height: size.height,
        borderRadius: size.height / 2,
        backgroundColor: BADGE_FILL,
        color: BADGE_TEXT,
        // Outside the fill, like the canvas stroke (not CSS border-box inset).
        boxShadow: ring > 0 ? `0 0 0 ${ring}px ${BADGE_EDGE_COLOR}` : undefined,
        fontFamily: type.family,
        fontSize: type.size,
        fontWeight: type.weight,
        lineHeight: 1,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
