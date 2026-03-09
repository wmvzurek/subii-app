export const PROVIDER_CODE_MAP: Record<string, string> = {
  "netflix": "netflix",

  "hbo max": "hbo_max",
  "hbo go": "hbo_max",
  "max": "hbo_max",

  "disney plus": "disney_plus",
  "disney+": "disney_plus",
  "disney+ standard with ads": "disney_plus",

  "canal+": "canal_plus",
  "canal plus": "canal_plus",
  "canal+ online": "canal_plus",
  "canal+ seriale i filmy": "canal_plus",
  "canal+ super sport": "canal_plus",

  "prime video": "prime_video",
  "amazon prime video": "prime_video",
  "amazon video": "prime_video",
  "amazon prime": "prime_video",

  "apple tv+": "apple_tv",
  "apple tv": "apple_tv",
  "apple tv plus": "apple_tv",

  "skyshowtime": "skyshowtime",
  "sky showtime": "skyshowtime",

  "polsat box go": "polsat_box_go",
  "polsat box go premium": "polsat_box_go",
  "polsat box go sport": "polsat_box_go",
  "ipla": "polsat_box_go",

  "player": "player",
  "player.pl": "player",
  "tvn player": "player",
};

export function getProviderCode(tmdbName: string): string | null {
  const normalized = tmdbName.toLowerCase().trim();
  return PROVIDER_CODE_MAP[normalized] ?? null;
}

export const SUPPORTED_PROVIDER_CODES = new Set([
  "netflix",
  "hbo_max",
  "disney_plus",
  "canal_plus",
  "prime_video",
  "apple_tv",
  "skyshowtime",
  "polsat_box_go",
  "player",
]);

export function isSupportedProvider(tmdbName: string): boolean {
  const code = getProviderCode(tmdbName);
  return code !== null && SUPPORTED_PROVIDER_CODES.has(code);
}