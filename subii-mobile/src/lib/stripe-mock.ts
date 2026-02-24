// Mock dla Expo Go - Stripe nie działa bez native build
export const StripeProvider = ({ children }: any) => children;
export const useStripe = () => ({
  confirmSetupIntent: async () => ({ error: { message: "Stripe niedostępny w trybie Expo Go" } }),
  confirmPayment: async () => ({ error: { message: "Stripe niedostępny w trybie Expo Go" } }),
});
export const usePlatformPay = () => ({
  isPlatformPaySupported: async () => false,
  confirmPlatformPayPayment: async () => ({ error: { message: "Niedostępne" } }),
});
export const CardField = () => null;
export const CardFieldInput = {};
export const PlatformPay = {};