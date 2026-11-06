import * as stylex from "@stylexjs/stylex";
import { useSelector } from "@tanstack/react-store";
import { shallow } from "@tanstack/store";
import { Input, Tokens } from "@ui";
import { useEffect, useLayoutEffect, useRef } from "react";
import { t } from "../i18n/index.ts";
import {
  calloutFontSize,
  calloutLayout,
  setLabelText,
  setNoteText,
} from "../state/callouts.ts";
import { lineStore } from "../state/lines.ts";
import { lineStroke } from "./canvas/paint/routes.ts";
import { placementAt } from "../state/route-number.ts";
import { setTextEdit, textEditStore } from "../state/text-edit.ts";
import { useViewportSelector } from "../state/use-viewport.ts";

/** Field over a note or text label while it is edited. */
export function TextEditor() {
  const id = useSelector(textEditStore, (state) => state);
  useEffect(() => () => setTextEdit(null), []);
  if (!id) return null;
  return <TextField key={id} id={id} />;
}

type FieldSpot = {
  kind: "note" | "label";
  text: string;
  x: number;
  y: number;
  scale: number;
  width: number | null;
  color: string;
};

function TextField({ id }: { id: string }) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const spot = useSelector(
    lineStore,
    (state): FieldSpot | null => {
      const label = state.labels.find((item) => item.id === id);
      if (label) {
        if (label.locked || !(state.scale > 0)) return null;
        return {
          kind: "label",
          text: label.text,
          x: label.x,
          y: label.y,
          scale: state.scale,
          width: label.width,
          color: label.color,
        };
      }
      for (const layer of state.layers) {
        const note = layer.notes.find((item) => item.id === id);
        if (!note) continue;
        if (layer.locked || !(layer.scale > 0)) return null;
        const place = placementAt(layer, note.place);
        if (!place) return null;
        return {
          kind: "note",
          text: note.text,
          x: place.x,
          y: place.y,
          scale: layer.scale,
          width: note.width,
          color: lineStroke(layer).color,
        };
      }
      return null;
    },
    { compare: shallow },
  );
  const view = useViewportSelector(
    (state) => ({ zoom: state.zoom, panX: state.panX, panY: state.panY }),
    { compare: shallow },
  );

  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.focus();
    area.select();
  }, []);

  useEffect(() => {
    if (!spot) setTextEdit(null);
  }, [spot]);

  if (!spot) return null;
  const layout = calloutLayout(spot.text, spot.kind, spot.width);
  const close = () => setTextEdit(null);
  return (
    <Input.Area
      ref={areaRef}
      sx={styles.field}
      style={{
        left: view.panX + spot.x * view.zoom,
        top: view.panY + spot.y * view.zoom,
        width: layout.width,
        height: layout.height,
        fontSize: calloutFontSize(spot.kind),
        color: spot.color,
        transform: `translate(-50%, -50%) scale(${view.zoom * spot.scale})`,
      }}
      aria-label={t(spot.kind === "note" ? "observation" : "textLabel")}
      value={spot.text}
      spellCheck={false}
      autoComplete="off"
      onValueChange={(value) =>
        spot.kind === "note" ? setNoteText(id, value) : setLabelText(id, value)
      }
      onBlur={close}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
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
    margin: 0,
    padding: 3,
    borderWidth: 0,
    borderRadius: 2,
    backgroundColor: Tokens.color.neutral[950],
    fontFamily: '"PT Sans", sans-serif',
    fontWeight: 700,
    lineHeight: 1.2,
    textAlign: "center",
  },
});
