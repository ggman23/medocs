import type { MetadataRoute } from "next";

const bp = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Médocs — Suivi de mes traitements",
    short_name: "Médocs",
    description: "Suivi du stock de mes médicaments, insuline et capteurs de glycémie.",
    lang: "fr",
    start_url: `${bp}/`,
    scope: `${bp}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f7fa",
    theme_color: "#0d9488",
    icons: [
      { src: `${bp}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${bp}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: `${bp}/icons/icon.svg`, sizes: "any", type: "image/svg+xml" },
    ],
  };
}
