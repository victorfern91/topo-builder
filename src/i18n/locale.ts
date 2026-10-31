export const appLocales = ["pt-PT", "en-US"] as const;

export type AppLocale = (typeof appLocales)[number];

const localeByLanguage = {
  pt: "pt-PT",
  en: "en-US",
} as const satisfies Record<string, AppLocale>;

export function resolveLocale(tags: readonly string[]): AppLocale {
  for (const tag of tags) {
    const language = languageOf(tag);
    if (language === "pt" || language === "en")
      return localeByLanguage[language];
  }
  return "en-US";
}

export function readNavigatorLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return ["en-US"];
  const listed = navigator.languages?.filter((tag) => tag.length > 0);
  if (listed && listed.length > 0) return listed;
  if (navigator.language) return [navigator.language];
  return ["en-US"];
}

function languageOf(tag: string): string | null {
  const trimmed = tag.trim();
  if (!trimmed) return null;
  try {
    return new Intl.Locale(trimmed).language;
  } catch {
    return null;
  }
}
