// src/lib/api.ts
import axios from "axios";
import { storage } from "./storage";

export const BASE_URL = "http://192.168.1.114:3000"; // ZMIEŃ NA SWOJE IP

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storage.clearAuth();
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string; // ← Nie jest już opcjonalny
    dateOfBirth: string; // ← DODAJ TO (format YYYY-MM-DD)
  }) {
    const res = await api.post("/api/auth/register", data);
    return res.data;
  },

  async login(email: string, password: string) {
    const res = await api.post("/api/auth/login", { email, password });
    return res.data;
  },

  async me() {
    const res = await api.get("/api/auth/me");
    return res.data.user;
  }
};  

export const subscriptionsApi = {
  async getAll() {
    const res = await api.get("/api/subscriptions");
    return res.data;
  },

  async create(data: {
    planId: number;
    nextDueDate: string;
    priceOverridePLN?: number;
  }) {
    const res = await api.post("/api/subscriptions", data);
    return res.data;
  },

  async delete(id: number) {
    const res = await api.delete(`/api/subscriptions/${id}`);
    return res.data;
  },

  async update(id: number, data: any) {
    const res = await api.patch(`/api/subscriptions/${id}`, data);
    return res.data;
  }
};

export const paymentsApi = {
  async payAll() {
    const res = await api.post("/api/payments");
    return res.data;
  },

  async getHistory() {
    const res = await api.get("/api/payments");
    return res.data;
  }
};

export const reportsApi = {
  async get(period: string) {
    const res = await api.get(`/api/report?period=${period}`);
    return res.data;
  }
};

export const plansApi = {
  async getAll() {
    const res = await api.get("/api/plans");
    return res.data;
  }
};