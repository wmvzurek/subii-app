// subii-mobile/src/lib/provider-logos.ts
export const providerLogos: Record<string, any> = {
  netflix: require('../../assets/images/providers/netflix.png'),
  disney_plus: require('../../assets/images/providers/disney_plus.png'),
  prime_video: require('../../assets/images/providers/prime_video.png'),
  hbo_max: require('../../assets/images/providers/hbo_max.png'),
  apple_tv: require('../../assets/images/providers/apple_tv.png'),
};

export function getProviderLogo(providerCode: string) {
  return providerLogos[providerCode] || null;
}

export function formatPlanName(providerCode: string, planName: string): string {
  const providerNames: Record<string, string> = {
    netflix: 'Netflix',
    disney_plus: 'Disney+',
    prime_video: 'Prime Video',
    hbo_max: 'Max',
    apple_tv: 'Apple TV+',
  };

  const provider = providerNames[providerCode] || providerCode;
  
  if (planName.includes(provider)) {
    return planName;
  }
  
  return `${provider} - ${planName}`;
}

// Opisy providerów
export const providerDescriptions: Record<string, string> = {
  netflix: "Globalny lider streamingu z jedną z największych bibliotek filmów i seriali oryginalnych. Kultowe produkcje jak „Stranger Things” i „The Crown” pokazują skalę i jakość treści dostępnych w serwisie.",

  disney_plus: "Platforma łącząca uniwersa Disney, Marvel i Star Wars w jednym miejscu. Hity takie jak „The Mandalorian” i „Avengers: Endgame” podkreślają siłę największych franczyz świata.",

  prime_video: "Streaming z autorskimi produkcjami Amazon Original oraz bogatą ofertą filmową. Serial „The Boys” i epicka produkcja „The Rings of Power” to jedne z flagowych tytułów platformy.",

  hbo_max: "Serwis premium znany z nagradzanych seriali i kinowych superprodukcji. „House of the Dragon” oraz „The Last of Us” to przykłady wysokobudżetowych hitów dostępnych w ofercie.",

  apple_tv: "Platforma z ekskluzywnymi produkcjami Apple Original, stawiająca na jakość i oryginalny storytelling. „Ted Lasso” i „Severance” należą do najbardziej rozpoznawalnych seriali serwisu."
};



export function getProviderDescription(providerCode: string): string {
  return providerDescriptions[providerCode] || "Brak opisu dla tej platformy.";
}