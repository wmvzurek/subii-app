const React = require("react");

const StripeProvider = ({ children }) => children;
const useStripe = () => ({
  confirmSetupIntent: async () => ({ error: { message: "Stripe unavailable in Expo Go" } }),
  confirmPayment: async () => ({ error: { message: "Stripe unavailable in Expo Go" } }),
});
const usePlatformPay = () => ({
  isPlatformPaySupported: async () => false,
  confirmPlatformPayPayment: async () => ({ error: { message: "Unavailable" } }),
});
const CardField = () => null;
const CardFieldInput = {};
const PlatformPay = {};

module.exports = {
  StripeProvider,
  useStripe,
  usePlatformPay,
  CardField,
  CardFieldInput,
  PlatformPay,
};