import * as stylex from "@stylexjs/stylex";
import { useSelector } from "@tanstack/react-store";
import { Menu, Menubar, Toast, Tokens } from "@ui";
import type { KeyboardEvent } from "react";
import { t } from "../../i18n/index.ts";
import { Shortcut } from "../shortcut.tsx";
import {
  topMenu,
  type CheckboxEntry,
  type CheckboxGroupEntry,
  type ItemEntry,
  type MenuEntry,
  type MenuLabel,
  type RadioEntry,
  type SubmenuEntry,
  type WidgetEntry,
} from "./top-menu.ts";
import {
  menuBindings,
  menuChecks,
  menuConditions,
  menuWidgets,
  runMenuAction,
  type MenuConditionId,
  type Source,
} from "./registry.ts";

type Run = (entry: ItemEntry) => void;

/** Menubar built from `top-menu.ts`. Names in the config resolve through `registry.ts`. */
export function TopMenu() {
  const toasts = Toast.useToastManager();
  const run: Run = (entry) => {
    runMenuAction(entry, { toasts });
  };

  return (
    <Menubar.Root>
      {topMenu.menus.map((menu) => (
        <Menu.Root key={menu.id}>
          <Menu.Trigger sx={styles.barButton}>
            {labelText(menu.label)}
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={6} align="start">
              <Menu.Popup>
                <Entries entries={menu.items} run={run} />
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ))}
    </Menubar.Root>
  );
}

function Entries({ entries, run }: { entries: MenuEntry[]; run: Run }) {
  return entries.map((entry, index) => (
    <Entry key={index} entry={entry} run={run} />
  ));
}

function Entry({ entry, run }: { entry: MenuEntry; run: Run }) {
  const visible = useCondition(entry.visibleWhen, true);
  if (!visible) return null;
  switch (entry.type) {
    case "item":
      return <ItemRow entry={entry} run={run} />;
    case "separator":
      return <Menu.Separator />;
    case "submenu":
      return <SubmenuRow entry={entry} run={run} />;
    case "checkbox":
      return <CheckboxRow entry={entry} />;
    case "checkboxes":
      return <CheckboxGroup entry={entry} />;
    case "radio":
      return <RadioRows entry={entry} />;
    case "widget":
      return <WidgetRow entry={entry} />;
  }
}

function CheckboxGroup({ entry }: { entry: CheckboxGroupEntry }) {
  return (
    <Menu.Group>
      <Menu.GroupLabel>{labelText(entry.label)}</Menu.GroupLabel>
      {entry.items.map((item) => (
        <CheckboxRow
          key={item.check}
          entry={{ type: "checkbox", label: item.label, check: item.check }}
        />
      ))}
    </Menu.Group>
  );
}

function CheckboxRow({ entry }: { entry: CheckboxEntry }) {
  const check = menuChecks[entry.check];
  const checked = useSelector(check.source);
  const label = labelText(entry.label);
  return (
    <Menu.CheckboxItem
      checked={checked}
      label={label}
      onCheckedChange={check.set}
    >
      <Menu.CheckboxItemIndicator />
      <span>{label}</span>
    </Menu.CheckboxItem>
  );
}

function ItemRow({ entry, run }: { entry: ItemEntry; run: Run }) {
  const enabled = useCondition(entry.enabledWhen, true);
  return (
    <Menu.Item disabled={!enabled} onClick={() => run(entry)}>
      <span>{labelText(entry.label)}</span>
      {entry.shortcut ? (
        <Shortcut id={entry.shortcut} sx={styles.aside} />
      ) : (
        entry.hint && <span {...stylex.props(styles.aside)}>{entry.hint}</span>
      )}
    </Menu.Item>
  );
}

function SubmenuRow({ entry, run }: { entry: SubmenuEntry; run: Run }) {
  const enabled = useCondition(entry.enabledWhen, true);
  const busy = useCondition(entry.busy?.when, false);
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger disabled={!enabled || busy}>
        <span>
          {labelText(busy && entry.busy ? entry.busy.label : entry.label)}
        </span>
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner>
          <Menu.Popup>
            <Entries entries={entry.items} run={run} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}

function RadioRows({ entry }: { entry: RadioEntry }) {
  const binding = menuBindings[entry.binding];
  const value = useSelector(binding.source);
  return (
    <Menu.RadioGroup value={value} onValueChange={binding.set}>
      {entry.label && (
        <Menu.GroupLabel>{labelText(entry.label)}</Menu.GroupLabel>
      )}
      {entry.options.map((option) => (
        <Menu.RadioItem
          key={option.value}
          value={option.value}
          label={labelText(option.label)}
        >
          <Menu.RadioItemIndicator />
          <span>{labelText(option.label)}</span>
        </Menu.RadioItem>
      ))}
    </Menu.RadioGroup>
  );
}

function WidgetRow({ entry }: { entry: WidgetEntry }) {
  const Widget = menuWidgets[entry.widget];
  return (
    <div {...stylex.props(styles.widget)} onKeyDown={keepKeysInWidget}>
      <Widget />
    </div>
  );
}

/** The menu reads arrow keys and typeahead for row focus. A widget's own controls need them. */
function keepKeysInWidget(event: KeyboardEvent) {
  if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
}

const constant = {
  true: fixed(true),
  false: fixed(false),
};

function fixed(value: boolean): Source<boolean> {
  return { get: () => value, subscribe: () => ({ unsubscribe: () => {} }) };
}

/** Entries are static, so each row reads the same source on every render. */
function useCondition(id: MenuConditionId | undefined, fallback: boolean) {
  return useSelector(id ? menuConditions[id] : constant[`${fallback}`]);
}

function labelText(label: MenuLabel): string {
  return typeof label === "string" ? t(label) : label.text;
}

const styles = stylex.create({
  barButton: {
    height: Tokens.size.md,
    paddingBlock: Tokens.spacing.none,
    paddingInline: Tokens.spacing.lg,
    borderRadius: 4,
    fontSize: 13,
    backgroundColor: {
      default: "transparent",
      ":hover": Tokens.color.white[8],
      "[data-popup-open]": Tokens.color.white[8],
    },
  },
  aside: {
    color: {
      default: Tokens.color.neutral[400],
      [stylex.when.ancestor(":hover")]: "inherit",
      [stylex.when.ancestor(":focus-visible")]: "inherit",
    },
  },
  widget: {
    minWidth: 280,
  },
});
