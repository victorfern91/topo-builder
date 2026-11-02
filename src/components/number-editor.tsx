import * as stylex from "@stylexjs/stylex";
import { Input, Tokens } from "@ui";
import { useSelector } from "@tanstack/react-store";
import { shallow } from "@tanstack/store";
import { useEffect, useLayoutEffect, useRef } from "react";
import { t } from "../i18n/index.ts";
import { findLayer, lineStore } from "../state/lines.ts";
import { numberEditStore, setNumberEdit } from "../state/number-edit.ts";
import { setNumberText } from "../state/route-badge.ts";
import {
  DEFAULT_NUMBER_TEXT,
  routeNumberPlacement,
} from "../state/route-number.ts";
import { useViewportSelector } from "../state/use-viewport.ts";

/** Field over the number badge while it is edited. Subscribes on its own, so the stage does not hold it. */
export function NumberEditor() {
  const target = useSelector(numberEditStore, (state) => state);
  useEffect(() => () => setNumberEdit(null), []);
  if (!target) return null;
  return (
    <NumberField
      key={`${target.layerId}:${String(target.index)}`}
      layerId={target.layerId}
      index={target.index}
    />
  );
}

type FieldSpot = { text: string; x: number; y: number; scale: number };

function NumberField({ layerId, index }: { layerId: string; index: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const spot = useSelector(
    lineStore,
    (state): FieldSpot | null => {
      const layer = findLayer(state, layerId);
      const place =
        layer && !layer.locked
          ? routeNumberPlacement(layer, "number", index)
          : null;
      if (!layer || !place) return null;
      return {
        text: layer.numberText,
        x: place.x,
        y: place.y,
        scale: layer.scale,
      };
    },
    { compare: shallow },
  );
  const view = useViewportSelector(
    (state) => ({ zoom: state.zoom, panX: state.panX, panY: state.panY }),
    { compare: shallow },
  );

  useLayoutEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    if (!spot) setNumberEdit(null);
  }, [spot]);

  if (!spot) return null;
  const close = () => setNumberEdit(null);
  return (
    <Input.Root
      ref={inputRef}
      sx={styles.field}
      style={{
        left: view.panX + spot.x * view.zoom,
        top: view.panY + spot.y * view.zoom,
        transform: `translate(-50%, -50%) scale(${view.zoom * spot.scale})`,
      }}
      aria-label={t("numberBadge")}
      value={spot.text}
      placeholder={DEFAULT_NUMBER_TEXT}
      spellCheck={false}
      autoComplete="off"
      onValueChange={(value) => setNumberText(layerId, value)}
      onBlur={close}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        close();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    />
  );
}

const styles = stylex.create({
  field: {
    position: "absolute",
    zIndex: 30,
    width: 42,
    height: 16,
    paddingInline: 3,
    borderRadius: 8,
    borderColor: Tokens.color.blue[500],
    backgroundColor: Tokens.color.neutral[950],
    color: Tokens.color.neutral[0],
    fontFamily: '"PT Sans", sans-serif',
    fontSize: 8,
    fontWeight: 700,
    textAlign: "center",
  },
});
