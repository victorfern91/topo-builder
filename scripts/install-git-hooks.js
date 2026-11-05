import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";

const gitDir = ".git";
if (!existsSync(gitDir) || !lstatSync(gitDir).isDirectory()) process.exit(0);

mkdirSync(`${gitDir}/hooks`, { recursive: true });
const hook = `${gitDir}/hooks/commit-msg`;
writeFileSync(
  hook,
  `#!/bin/sh
root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$root" || exit 1
bun ./node_modules/@commitlint/cli/cli.js --edit "$1"
`,
);
chmodSync(hook, 0o755);
