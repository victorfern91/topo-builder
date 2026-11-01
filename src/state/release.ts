/** How often a production tab asks Pages whether a newer build is live. */
const CHECK_EVERY = 60_000;

const APP_BUILD = __APP_BUILD__;

/** Build id already shown. A later deploy has a different id. */
let announcedBuild: string | null = null;

/** Set when the user confirms a reload, so the browser prompt does not repeat. */
let allowUnload = false;

/**
 * True the first time `remote` differs from the running build.
 * Later checks of that same id stay quiet.
 */
export function claimRelease(remote: string): boolean {
  if (remote === APP_BUILD || remote === announcedBuild) return false;
  announcedBuild = remote;
  return true;
}

/** Reads the build id published next to `index.html`. */
export async function remoteBuild(): Promise<string | null> {
  const base = import.meta.env.BASE_URL;
  const prefix = base.endsWith("/") ? base : `${base}/`;
  try {
    const response = await fetch(`${prefix}version.json?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return readBuild(await response.json());
  } catch {
    return null;
  }
}

export function reloadApp(): void {
  allowUnload = true;
  window.location.reload();
}

export function unloadAllowed(): boolean {
  return allowUnload;
}

export { CHECK_EVERY };

function readBuild(body: unknown): string | null {
  if (body == null || typeof body !== "object" || !("build" in body)) {
    return null;
  }
  const build = body.build;
  if (typeof build !== "string" || build.length === 0) return null;
  return build;
}
