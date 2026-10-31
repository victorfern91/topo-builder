import * as stylex from "@stylexjs/stylex";
import { Button, Layout, Widget } from "@ui";
import { useSelector } from "@tanstack/react-store";
import { useLayoutEffect } from "react";
import { t } from "../i18n/index.ts";
import {
  LINE_COLORS,
  lineStore,
  renameLine,
  selectLine,
  setLineColor,
  type LineLayer,
} from "../state/lines.ts";
import { useWidgetFrame } from "../state/use-viewport.ts";
import { a11y } from "../styles/a11y.ts";
import { lineLayers } from "../styles/stage.ts";

export function LayersPanel() {
  const frame = useWidgetFrame("layers");
  const layers = useSelector(lineStore, (state) => state.layers);
  const activeId = useSelector(lineStore, (state) => state.activeId);

  const active = layers.find((item) => item.id === activeId) ?? null;

  useLayoutEffect(() => {
    if (!active || active.anchors.length > 0) return;
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused.closest("[data-layers]"))
      return;
    const input = document.getElementById(layerNameId(active.id));
    if (!(input instanceof HTMLInputElement)) return;
    input.focus();
  }, [active]);

  if (layers.length === 0) return null;
  const frontFirst: LineLayer[] = [];
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index];
    if (layer) frontFirst.push(layer);
  }

  return (
    <Widget.Panel
      {...frame}
      renderAs="section"
      resizable
      minWidth={220}
      minHeight={120}
      resizeLabel={t("resizePanel")}
      sx={lineLayers.root}
      data-layers=""
      aria-label={t("layers")}
    >
      <Widget.Header label={t("dragLayers")}>{t("layers")}</Widget.Header>
      {active ? <ColorSteps layer={active} /> : null}
      <Widget.Container grow shrink sx={lineLayers.scroll}>
        <table {...stylex.props(lineLayers.table)}>
          <thead>
            <tr>
              <th {...stylex.props(lineLayers.swatchHead)} scope="col">
                <span {...stylex.props(a11y.visuallyHidden)}>
                  {t("layerColor")}
                </span>
              </th>
              <th {...stylex.props(lineLayers.head)} scope="col">
                {t("layerName")}
              </th>
              <th {...stylex.props(lineLayers.kindHead)} scope="col">
                {t("layerKind")}
              </th>
            </tr>
          </thead>
          <tbody>
            {frontFirst.map((layer) => (
              <LayerRow
                key={layer.id}
                layer={layer}
                selected={layer.id === activeId}
              />
            ))}
          </tbody>
        </table>
      </Widget.Container>
    </Widget.Panel>
  );
}

function ColorSteps({ layer }: { layer: LineLayer }) {
  return (
    <Layout.Stack
      direction="row"
      wrap
      grow={false}
      shrink={false}
      gap="sm"
      py="md"
      px="lg"
      role="group"
      aria-label={t("lineColors")}
      sx={lineLayers.colors}
    >
      {LINE_COLORS.map((value) => {
        const selected = layer.color === value;
        return (
          <Button.Root
            key={value}
            sx={lineLayers.colorStep}
            type="button"
            aria-label={t("lineColorValue", { color: value })}
            aria-pressed={selected}
            data-selected={selected ? "" : undefined}
            title={value}
            style={{ backgroundColor: value }}
            onClick={() => setLineColor(layer.id, value)}
          />
        );
      })}
    </Layout.Stack>
  );
}

function layerNameId(id: string): string {
  return `layer-name-${id}`;
}

function LayerRow({
  layer,
  selected,
}: {
  layer: LineLayer;
  selected: boolean;
}) {
  return (
    <tr
      {...stylex.props(lineLayers.row)}
      data-selected={selected ? "" : undefined}
      onPointerDown={() => selectLine(layer.id)}
    >
      <td {...stylex.props(lineLayers.swatchCell)}>
        <Layout.Box
          renderAs="span"
          display="inline-block"
          sx={lineLayers.swatch}
          style={{ backgroundColor: layer.color }}
        />
      </td>
      <td {...stylex.props(lineLayers.nameCell)}>
        <input
          {...stylex.props(lineLayers.name)}
          id={layerNameId(layer.id)}
          aria-label={t("layerName")}
          value={layer.name}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => renameLine(layer.id, event.target.value)}
          onFocus={() => selectLine(layer.id)}
        />
      </td>
      <td {...stylex.props(lineLayers.kindCell)}>
        {t(layer.kind === "route" ? "routeKind" : "boulderKind")}
      </td>
    </tr>
  );
}
