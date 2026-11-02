/** Short, locale-free number for SVG attributes. */
export function svgNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return String(Math.round(value * 1000) / 1000);
}

/** Escapes markup and drops characters XML 1.0 does not allow. */
export function escapeXml(text: string): string {
  return text
    .replace(/[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * `fill` or `stroke` as a hex color plus a separate opacity, so SVG 1.1 readers
 * such as Inkscape do not need CSS color level 4 syntax.
 */
export function svgPaint(property: "fill" | "stroke", color: string): string {
  const parsed = parseColor(color);
  if (!parsed) return `${property}="${escapeXml(color)}"`;
  const opacity =
    parsed.alpha < 1
      ? ` ${property}-opacity="${svgNumber(Math.max(0, parsed.alpha))}"`
      : "";
  return `${property}="${parsed.hex}"${opacity}`;
}

function parseColor(color: string): { hex: string; alpha: number } | null {
  const value = color.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(value)?.[1];
  if (hex) {
    const full =
      hex.length <= 4 ? [...hex].map((digit) => digit + digit).join("") : hex;
    const alpha =
      full.length === 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1;
    return { hex: `#${full.slice(0, 6)}`, alpha };
  }
  const rgb =
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+)(%?))?\s*\)$/.exec(
      value,
    );
  if (!rgb) return null;
  const channels = [rgb[1], rgb[2], rgb[3]].map((channel) =>
    Math.min(255, Math.max(0, Math.round(Number(channel)))),
  );
  if (channels.some((channel) => !Number.isFinite(channel))) return null;
  const rawAlpha = rgb[4] === undefined ? 1 : Number(rgb[4]);
  const alpha = rgb[5] === "%" ? rawAlpha / 100 : rawAlpha;
  return {
    hex: `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`,
    alpha: Number.isFinite(alpha) ? Math.min(1, alpha) : 1,
  };
}

/** Unique XML id built from `label`. Ids must not start with a digit. */
export function svgIdFactory(): (label: string, fallback: string) => string {
  const used = new Set<string>();
  return (label, fallback) => {
    const slug =
      label
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || fallback;
    const base = /^[a-z_]/.test(slug) ? slug : `${fallback}-${slug}`;
    let id = base;
    for (let suffix = 2; used.has(id); suffix += 1) id = `${base}-${suffix}`;
    used.add(id);
    return id;
  };
}
