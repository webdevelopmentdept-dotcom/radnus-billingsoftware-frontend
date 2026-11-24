import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from "axios";                       // ← NEW
import App from './App.jsx'
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

// ← NEW (createRoot kku MUNNAADI)
axios.interceptors.request.use((cfg) => {
  const token = sessionStorage.getItem("token");
  const API = import.meta.env.VITE_API_URL;
  if (token && API && cfg.url && cfg.url.startsWith(API)) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// Token expire aanaalo (1 day) / thappaana token irundhaalo, API 401 tharum.
// Appo session clear panni login page-ku anuppidum (screen blank/error aagaama).
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    const API = import.meta.env.VITE_API_URL;
    const url = err?.config?.url || "";
    const isOurApi = API && url.startsWith(API);
    if (
      err?.response?.status === 401 &&
      isOurApi &&
      !url.includes("/api/login") &&
      sessionStorage.getItem("token")
    ) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)