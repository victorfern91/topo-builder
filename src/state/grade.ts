import type { CreateToolId } from "./tools.ts";

/** French and Yosemite labels for one step, so either name is the same route. */

export const GRADE_SYSTEMS = ["french", "yds"] as const;

export type GradeSystem = (typeof GRADE_SYSTEMS)[number];

/** Fontainebleau and Hueco labels for one step, so either name is the same boulder. */
export const BOULDER_GRADE_SYSTEMS = ["font", "v"] as const;

export type BoulderGradeSystem = (typeof BOULDER_GRADE_SYSTEMS)[number];

/** The names shown for each kind of line. Routes and boulders pick their scale apart. */
export type GradeSystems = {
  route: GradeSystem;
  boulder: BoulderGradeSystem;
};

export type GradeBand =
  "white" | "green" | "yellow" | "orange" | "red" | "purple" | "blue" | "black";

/** Fill and the darker edge around each swatch. */
export type GradePaint = {
  color: string;
  stroke: string;
};

export const GRADE_PAINT = {
  white: { color: "#e8e4da", stroke: "#7d7768" },
  green: { color: "#6e9439", stroke: "#2a472f" },
  yellow: { color: "#edbb54", stroke: "#9b5329" },
  orange: { color: "#de763c", stroke: "#803a23" },
  red: { color: "#bc4033", stroke: "#652722" },
  purple: { color: "#85369e", stroke: "#3a1642" },
  blue: { color: "#2f6fb8", stroke: "#173a66" },
  black: { color: "#2b2b30", stroke: "#000000" },
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
  { french: "1", yds: "5.2", band: "white" },
  { french: "2", yds: "5.3", band: "white" },
  { french: "3", yds: "5.4", band: "white" },
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
  { french: "8c", yds: "5.14b", band: "blue" },
  { french: "8c+", yds: "5.14c", band: "blue" },
  { french: "9a", yds: "5.14d", band: "blue" },
  { french: "9a+", yds: "5.15a", band: "blue" },
  { french: "9b", yds: "5.15b", band: "black" },
  { french: "9b+", yds: "5.15c", band: "black" },
  { french: "9c", yds: "5.15d", band: "black" },
] as const satisfies readonly GradeStep[];

type BoulderGradeStep = {
  font: string;
  v: string;
  band: GradeBand;
};

/**
 * Bands group the boulder scale into five ranges: green to V2, yellow to V5,
 * orange to V8, red to V12 (8A+), and black above. V grades sit on the Font
 * grade they usually stand in for.
 */
export const BOULDER_GRADE_STEPS = [
  { font: "3", v: "VB", band: "green" },
  { font: "4", v: "V0-", band: "green" },
  { font: "4+", v: "V0", band: "green" },
  { font: "5", v: "V1", band: "green" },
  { font: "5+", v: "V2", band: "green" },
  { font: "6A", v: "V3", band: "yellow" },
  { font: "6A+", v: "V3", band: "yellow" },
  { font: "6B", v: "V4", band: "yellow" },
  { font: "6B+", v: "V4", band: "yellow" },
  { font: "6C", v: "V5", band: "yellow" },
  { font: "6C+", v: "V5", band: "yellow" },
  { font: "7A", v: "V6", band: "orange" },
  { font: "7A+", v: "V7", band: "orange" },
  { font: "7B", v: "V8", band: "orange" },
  { font: "7B+", v: "V8", band: "orange" },
  { font: "7C", v: "V9", band: "red" },
  { font: "7C+", v: "V10", band: "red" },
  { font: "8A", v: "V11", band: "red" },
  { font: "8A+", v: "V12", band: "red" },
  { font: "8B", v: "V13", band: "black" },
  { font: "8B+", v: "V14", band: "black" },
  { font: "8C", v: "V15", band: "black" },
  { font: "8C+", v: "V16", band: "black" },
  { font: "9A", v: "V17", band: "black" },
] as const satisfies readonly BoulderGradeStep[];

/** One option in a line's grade list. `key` is stable across grade systems. */
export type GradeOption = { key: string; label: string; band: GradeBand };

/** The grade list for a kind of line, labelled in that kind's system. */
export function gradeOptions(
  kind: CreateToolId,
  systems: GradeSystems,
): GradeOption[] {
  if (kind === "boulder") {
    return BOULDER_GRADE_STEPS.map((step) => ({
      key: step.font,
      label: step[systems.boulder],
      band: step.band,
    }));
  }
  return GRADE_STEPS.map((step) => ({
    key: step.french,
    label: step[systems.route],
    band: step.band,
  }));
}

function gradeStep(
  kind: CreateToolId,
  grade: number | null | undefined,
): { band: GradeBand } | null {
  if (grade == null || !Number.isInteger(grade)) return null;
  const steps = kind === "boulder" ? BOULDER_GRADE_STEPS : GRADE_STEPS;
  return steps[grade] ?? null;
}

/** True when `grade` is a step on the scale of that kind of line. */
export function isGrade(kind: CreateToolId, grade: number): boolean {
  return gradeStep(kind, grade) !== null;
}

/** The grade name on that kind's scale, or null when the line has no grade. */
export function gradeLabel(
  kind: CreateToolId,
  grade: number | null | undefined,
  systems: GradeSystems,
): string | null {
  if (grade == null || !Number.isInteger(grade)) return null;
  if (kind === "boulder")
    return BOULDER_GRADE_STEPS[grade]?.[systems.boulder] ?? null;
  return GRADE_STEPS[grade]?.[systems.route] ?? null;
}

/** Null when the line has no grade. The line then keeps its plain color. */
export function gradePaint(
  kind: CreateToolId,
  grade: number | null | undefined,
): GradePaint | null {
  const step = gradeStep(kind, grade);
  return step ? GRADE_PAINT[step.band] : null;
}

/** The swatch band of the line's grade, or null when it has none. */
export function gradeBand(
  kind: CreateToolId,
  grade: number | null | undefined,
): GradeBand | null {
  return gradeStep(kind, grade)?.band ?? null;
}
