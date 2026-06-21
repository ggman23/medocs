// Client-safe formatting helpers (no server imports).

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** Format a number the French way, trimming useless decimals (4 -> "4", 4.2 -> "4,2"). */
export function fmtNum(n: number): string {
  return nf.format(Math.round(n * 10) / 10);
}

export function plural(n: number, one: string, many: string): string {
  return Math.abs(n) >= 2 ? many : one;
}

/** "45 jours", "1 jour", "0 jour". */
export function daysLabel(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${fmtNum(n)} ${plural(n, "jour", "jours")}`;
}

/** Human phrase for remaining autonomy. */
export function autonomyPhrase(daysRemaining: number): string {
  if (!Number.isFinite(daysRemaining)) return "Pas de consommation quotidienne";
  if (daysRemaining <= 0) return "Stock épuisé";
  if (daysRemaining === 1) return "Plus qu'un jour de stock";
  return `Encore ${daysLabel(daysRemaining)} de stock`;
}

const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "long",
});

/** Pretty "samedi 21 juin" from a YYYY-MM-DD string. */
export function prettyDateFR(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return SHORT_DATE.format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/** Capitalize the first letter. */
export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
