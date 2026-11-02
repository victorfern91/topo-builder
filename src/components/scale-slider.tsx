import * as stylex from "@stylexjs/stylex";
import { Slider, Tokens } from "@ui";
import { useSelector } from "@tanstack/react-store";
import { formatScale, t } from "../i18n/index.ts";
import { imageDocumentStore } from "../state/image-document.ts";
import { lineStore, setDrawScale } from "../state/lines.ts";
import { sliderToZoom, zoomToSlider } from "../state/viewport.ts";

export function ScaleSlider() {
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
      sx={styles.row}
      controlSx={styles.control}
      readoutSx={styles.readout}
      onValueChange={(value) => setDrawScale(sliderToZoom(value))}
    />
  );
}

const styles = stylex.create({
  row: {
    width: "100%",
    paddingBlock: Tokens.spacing.sm,
    paddingInline: Tokens.spacing.lg,
  },
  control: {
    width: 120,
    flexGrow: 1,
    flexShrink: 1,
  },
  readout: {
    width: 42,
    textAlign: "end",
  },
});
