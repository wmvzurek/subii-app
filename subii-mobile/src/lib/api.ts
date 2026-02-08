// src/lib/api.ts
import axios from "axios";

// 1) Docelowo podmień na swój adres backendu (patrz sekcja C.5)
// - jeśli backend na tym samym komputerze i telefon w tej samej sieci Wi-Fi:
//   np. http://192.168.1.23:3000
// - jeśli używasz ngrok/localtunnel, wklej publiczny URL:
export const BASE_URL = "http://192.168.1.114:3000";
;

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});
