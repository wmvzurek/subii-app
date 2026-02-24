export const PROVIDER_NAMES: Record<string, string> = {
  netflix:       "Netflix",
  hbo_max:       "HBO Max",
  disney_plus:   "Disney+",
  canal_plus:    "Canal+",
  prime_video:   "Prime Video",
  apple_tv:      "Apple TV+",
  skyshowtime:   "SkyShowtime",
  polsat_box_go: "Polsat Box Go",
  player:        "Player",
};

export function getProviderName(code: string): string {
  return PROVIDER_NAMES[code] || code;
}