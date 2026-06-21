"use client";

import { useEffect } from "react";

// Registers the service worker in production so the app is installable on
// phones ("Ajouter à l'écran d'accueil") and works offline for the shell.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore registration failures */
    });
  }, []);
  return null;
}
