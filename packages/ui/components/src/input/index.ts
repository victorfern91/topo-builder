import { InputArea, InputRoot } from "./input.tsx";

/** Text field. `Area` wraps onto the next line. */
export const Input = {
  Root: InputRoot,
  Area: InputArea,
};

export default Input;

export type { InputAreaProps, InputRootProps } from "./types.ts";
