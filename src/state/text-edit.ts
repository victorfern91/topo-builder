import { Store } from "@tanstack/store";

/** Note or text label being edited on the photo. */
export const textEditStore = new Store<string | null>(null);

export function setTextEdit(id: string | null): void {
  textEditStore.setState((current) => (current === id ? current : id));
}
