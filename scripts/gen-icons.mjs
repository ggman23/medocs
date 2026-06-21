// Rasterize public/icons/icon.svg into the PNG sizes the PWA needs.
// Run with: node scripts/gen-icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public/icons/icon.svg"));
const out = join(root, "public/icons");

const targets = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
];

for (const [name, size] of targets) {
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(join(out, name));
  console.log("wrote", name, size);
}
