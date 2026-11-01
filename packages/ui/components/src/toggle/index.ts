import { ToggleOption, ToggleRoot } from "./toggle.tsx";

/** Choice group. Compose `Root` with `Option`. */
export const Toggle = {
  Root: ToggleRoot,
  Option: ToggleOption,
};

export default Toggle;

export type { ToggleOptionProps, ToggleRootProps } from "./types.ts";
