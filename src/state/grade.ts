/** French and Yosemite labels for one step, so either name is the same route. */

export const GRADE_SYSTEMS = ["french", "yds"] as const;

export type GradeSystem = (typeof GRADE_SYSTEMS)[number];

export type GradeBand = "green" | "yellow" | "orange" | "red" | "purple";

/** Fill and the darker edge around each swatch. */
export type GradePaint = {
  color: string;
  stroke: string;
};

export const GRADE_PAINT = {
  green: { color: "#6e9439", stroke: "#2a472f" },
  yellow: { color: "#edbb54", stroke: "#9b5329" },
  orange: { color: "#de763c", stroke: "#803a23" },
  red: { color: "#bc4033", stroke: "#652722" },
  purple: { color: "#85369e", stroke: "#3a1642" },
} as const satisfies Record<GradeBand, GradePaint>;

type GradeStep = {
  french: string;
  yds: string;
  band: GradeBand;
};

/**
 * Bands follow the swatch chart. Yosemite decimals sit on the same step
 * as the French grade they usually stand in for.
 */
export const GRADE_STEPS = [
  { french: "1", yds: "5.2", band: "green" },
  { french: "2", yds: "5.3", band: "green" },
  { french: "3", yds: "5.4", band: "green" },
  { french: "4a", yds: "5.5", band: "green" },
  { french: "4b", yds: "5.6", band: "green" },
  { french: "4c", yds: "5.7", band: "green" },
  { french: "5a", yds: "5.8", band: "green" },
  { french: "5b", yds: "5.9", band: "green" },
  { french: "5c", yds: "5.10a", band: "green" },
  { french: "6a", yds: "5.10b", band: "yellow" },
  { french: "6a+", yds: "5.10c", band: "yellow" },
  { french: "6b", yds: "5.10d", band: "yellow" },
  { french: "6b+", yds: "5.11a", band: "yellow" },
  { french: "6c", yds: "5.11b", band: "orange" },
  { french: "6c+", yds: "5.11c", band: "orange" },
  { french: "7a", yds: "5.11d", band: "orange" },
  { french: "7a+", yds: "5.12a", band: "orange" },
  { french: "7b", yds: "5.12b", band: "red" },
  { french: "7b+", yds: "5.12c", band: "red" },
  { french: "7c", yds: "5.12d", band: "red" },
  { french: "7c+", yds: "5.13a", band: "red" },
  { french: "8a", yds: "5.13b", band: "purple" },
  { french: "8a+", yds: "5.13c", band: "purple" },
  { french: "8b", yds: "5.13d", band: "purple" },
  { french: "8b+", yds: "5.14a", band: "purple" },
  { french: "8c", yds: "5.14b", band: "purple" },
  { french: "8c+", yds: "5.14c", band: "purple" },
  { french: "9a", yds: "5.14d", band: "purple" },
  { french: "9a+", yds: "5.15a", band: "purple" },
  { french: "9b", yds: "5.15b", band: "purple" },
  { french: "9b+", yds: "5.15c", band: "purple" },
  { french: "9c", yds: "5.15d", band: "purple" },
] as const satisfies readonly GradeStep[];

export function gradeLabel(
  grade: number | null | undefined,
  system: GradeSystem,
): string | null {
  if (grade == null || !Number.isInteger(grade)) return null;
  return GRADE_STEPS[grade]?.[system] ?? null;
}

/** Null when the route has no grade. The line then keeps its plain color. */
export function gradePaint(
  grade: number | null | undefined,
): GradePaint | null {
  if (grade == null || !Number.isInteger(grade)) return null;
  const step = GRADE_STEPS[grade];
  if (!step) return null;
  return GRADE_PAINT[step.band];
}
