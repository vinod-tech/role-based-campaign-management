// Shared (client + server) date helpers. Dates are plain YYYY-MM-DD strings.
export const TZ = "Asia/Kolkata";

export type CampaignStatus = "upcoming" | "running" | "completed";

export function todayStr(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

export function statusOf(start: string, end: string, today: string = todayStr()): CampaignStatus {
  if (today < start) return "upcoming";
  if (today > end) return "completed";
  return "running";
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(date: string | null | undefined): string {
  if (!date) return "—";
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function monthLabel(date: string): string {
  const [y, m] = date.split("-").map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}
