import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA: registra il service worker all'avvio cosi' il sito e' installabile
// (Aggiungi a schermata Home / pacchetto Google Play). Usa lo stesso /sw.js
// gia' impiegato per le notifiche push, quindi non interferisce con quella
// logica (usePushNotifications usa navigator.serviceWorker.ready).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service worker non registrato:", err);
    });
  });
}
