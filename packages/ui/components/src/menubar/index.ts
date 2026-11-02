import { MenubarRoot } from "./menubar.tsx";

/** Row of menus. `Root` holds one `Menu.Root` per menu. */
export const Menubar = {
  Root: MenubarRoot,
};

export default Menubar;

export type { MenubarRootProps } from "./types.ts";
