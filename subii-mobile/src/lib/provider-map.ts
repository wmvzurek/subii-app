// Mapowanie WSZYSTKICH możliwych nazw z TMDB → providerCode w Subii
// Ten plik jest jedynym źródłem prawdy — używany i w mobile i na backendzie

export const PROVIDER_CODE_MAP: Record<string, string> = {
  // Netflix
  "netflix": "netflix",

  // HBO Max (platforma zmieniała nazwy: HBO Go → HBO Max → Max → HBO Max)
  "hbo max": "hbo_max",
  "hbo go": "hbo_max",
  "max": "hbo_max",

  // Disney+
  "disney plus": "disney_plus",
  "disney+": "disney_plus",
  "disney+ standard with ads": "disney_plus",

  // Canal+
  "canal+": "canal_plus",
  "canal plus": "canal_plus",
  "canal+ online": "canal_plus",
  "canal+ seriale i filmy": "canal_plus",
  "canal+ super sport": "canal_plus",

  // Amazon Prime Video
  "prime video": "prime_video",
  "amazon prime video": "prime_video",
  "amazon video": "prime_video",
  "amazon prime": "prime_video",

  // Apple TV+
  "apple tv+": "apple_tv",
  "apple tv": "apple_tv",
  "apple tv plus": "apple_tv",

  // SkyShowtime
  "skyshowtime": "skyshowtime",
  "sky showtime": "skyshowtime",

  // Polsat Box Go
  "polsat box go": "polsat_box_go",
  "polsat box go premium": "polsat_box_go",
  "polsat box go sport": "polsat_box_go",
  "ipla": "polsat_box_go",

  // Player
  "player": "player",
  "player.pl": "player",
  "tvn player": "player",
};

// Pomocnicza funkcja — zamienia nazwę z TMDB na providerCode
export function getProviderCode(tmdbName: string): string | null {
  const normalized = tmdbName.toLowerCase().trim();
  return PROVIDER_CODE_MAP[normalized] ?? null;
}

// Lista providerów obsługiwanych przez Subii (do filtrowania wyników TMDB)
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

// Sprawdza czy dana platforma jest obsługiwana przez Subii
export function isSupportedProvider(tmdbName: string): boolean {
  const code = getProviderCode(tmdbName);
  return code !== null && SUPPORTED_PROVIDER_CODES.has(code);
}