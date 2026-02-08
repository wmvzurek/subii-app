// src/store/subii.ts
import { create } from "zustand";

type Plan = {
  providerCode: string;
  planName: string;
  pricePLN: number;
  cycle: "monthly";
  screens: number;
  uhd: boolean;
  ads: boolean;
};

type PaymentReceipt = {
  id: string;
  period: string;      // YYYY-MM
  amountPLN: number;
  items: { providerCode: string; planName: string; pricePLN: number }[];
  createdAt: string;
};

type SubiiState = {
  plans: Plan[];
  lastReceipt?: PaymentReceipt;
  setPlans: (p: Plan[]) => void;
  setReceipt: (r?: PaymentReceipt) => void;
};

export const useSubii = create<SubiiState>((set) => ({
  plans: [],
  lastReceipt: undefined,
  setPlans: (p) => set({ plans: p }),
  setReceipt: (r) => set({ lastReceipt: r }),
}));
