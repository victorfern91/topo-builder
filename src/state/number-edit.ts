import { Store } from "@tanstack/store";

export type NumberEdit = { layerId: string; index: number };

/** Number badge being edited on the photo. */
export const numberEditStore = new Store<NumberEdit | null>(null);

export function setNumberEdit(next: NumberEdit | null): void {
  numberEditStore.setState((current) =>
    current?.layerId === next?.layerId && current?.index === next?.index
      ? current
      : next,
  );
}
