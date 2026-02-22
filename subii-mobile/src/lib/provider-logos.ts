export const providerLogos: Record<string, any> = {
  netflix:       require('../../assets/images/providers/netflix.png'),
  hbo_max:       require('../../assets/images/providers/hbo_max.png'),
  disney_plus:   require('../../assets/images/providers/disney_plus.png'),
  canal_plus:    require('../../assets/images/providers/canal_plus.png'),
  prime_video:   require('../../assets/images/providers/prime_video.png'),
  apple_tv:      require('../../assets/images/providers/apple_tv.png'),
  skyshowtime:   require('../../assets/images/providers/skyshowtime.png'),
  polsat_box_go: require('../../assets/images/providers/polsat_box_go.png'),
  player:        require('../../assets/images/providers/player.png'),
};

export function getProviderLogo(providerCode: string) {
  return providerLogos[providerCode] || null;
}

export function getProviderName(providerCode: string): string {
  const names: Record<string, string> = {
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
  return names[providerCode] || providerCode;
}

export function formatPlanName(providerCode: string, planName: string): string {
  const provider = getProviderName(providerCode);
  if (planName.includes(provider)) return planName;
  return `${provider} - ${planName}`;
}

export const providerDescriptions: Record<string, string> = {
  netflix:
    "Największa platforma streamingowa świata z oryginalnym contentem.",

  hbo_max:
    "Platforma premium łącząca produkcje HBO, Warner Bros. i DC z treściami TVN.",

  disney_plus:
    "Dom dla produkcji Disney, Marvel, Star Wars, Pixara i National Geographic.",

  canal_plus:
    "Polska platforma z bogatą biblioteką filmów, seriali i sportu na żywo. Liga Mistrzów, Premier League i oryginalne produkcje",

  prime_video:
    "Najtańszy dostęp do globalnej biblioteki filmów i seriali Amazon Original.",

  apple_tv:
    "Ekskluzywne produkcje Apple Original w jakości 4K z Dolby Atmos.",

  skyshowtime:
    "Platforma łącząca katalogi Paramount, Peacock, Sky i Showtime.",

  polsat_box_go:
    "Polska platforma z serialami i programami Polsatu oraz pakietem sportowym. Liga Europy, Bundesliga i Formuła 1 w jednym miejscu.",

  player:
    "Serwis grupy TVN Warner Bros. Discovery z polskimi serialami i programami.",
};

export function getProviderDescription(providerCode: string): string {
  return providerDescriptions[providerCode] || "Brak opisu dla tej platformy.";
}