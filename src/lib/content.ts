import { cache } from "react";
import { getDoc, setDoc, listDocs } from "./store";
import type { Settings, Prediction } from "./types";
export const defaults: Settings = {
  siteName: "MacX",
  title: "MacX — Maç merkezi",
  description: "Günün futbol maçları, skorlar ve yayın kanalları.",
  siteUrl: "",
  indexable: true,
  googleVerification: "",
  gaId: "",
  adsenseId: "",
  adSlot: "",
  adImage: "",
  adUrl: "",
  adLabel: "",
  predictionsIntro: "Yayınlanmış maç notları.",
  youtubeUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  xUrl: "",
};
export const getSettings = cache(async (): Promise<Settings> => ({
  ...defaults,
  ...(await getDoc<Settings>("settings")),
}));
export const getPredictions = cache(
  async (publishedOnly = true): Promise<Prediction[]> =>
    (await listDocs<Prediction>("prediction:"))
      .filter((r) => !publishedOnly || r.status === "published")
      .sort((a, b) => b.date.localeCompare(a.date)),
);
export async function saveSettings(s: Settings) {
  await setDoc("settings", s);
}
export function siteOrigin(s?: Settings) {
  const url = s?.siteUrl || process.env.APP_URL || "http://localhost:3000";
  return url.replace(/\/$/, "");
}
export function secureUrl(value: string) {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}
export function validateSettings(input: Record<string, unknown>): Settings {
  const s = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof Settings)[]) {
    if (key === "indexable") {
      s.indexable = input.indexable === true;
      continue;
    }
    const value = input[key];
    if (typeof value !== "string" || value.length > 2000)
      throw new Error(`Geçersiz ayar: ${key}`);
    s[key] = value.trim() as never;
  }
  if (!s.siteName || !s.title || !s.description)
    throw new Error("Site adı, başlık ve açıklama gerekli.");
  for (const key of [
    "siteUrl",
    "adUrl",
    "adImage",
    "youtubeUrl",
    "instagramUrl",
    "tiktokUrl",
    "xUrl",
  ] as const)
    if (!secureUrl(s[key])) throw new Error(`HTTPS adresi gerekli: ${key}`);
  if (s.siteUrl) {
    const u = new URL(s.siteUrl);
    if (u.pathname !== "/" || u.search || u.hash)
      throw new Error("Site adresi yalnızca alan adı olmalı.");
    s.siteUrl = u.origin;
  }
  const patterns = {
    gaId: /^G-[A-Z0-9]+$/,
    adsenseId: /^ca-pub-\d{16}$/,
    adSlot: /^\d{5,20}$/,
    googleVerification: /^[A-Za-z0-9_-]{5,200}$/,
  };
  for (const [key, re] of Object.entries(patterns))
    if (
      s[key as keyof typeof patterns] &&
      !re.test(s[key as keyof typeof patterns])
    )
      throw new Error(`Geçersiz kimlik: ${key}`);
  return s;
}
export function validatePrediction(input: Record<string, unknown>): Prediction {
  const r = {} as Prediction;
  for (const key of [
    "id",
    "home",
    "away",
    "league",
    "date",
    "pick",
    "odds",
    "analysis",
    "status",
    "result",
  ] as const) {
    const v = input[key];
    if (typeof v !== "string" || v.length > (key === "analysis" ? 6000 : 200))
      throw new Error(`Geçersiz alan: ${key}`);
    (r[key] as string) = v.trim();
  }
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(r.id) || !r.home || !r.away || !r.pick)
    throw new Error("Takımlar ve tahmin gerekli.");
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(r.date) ||
    Number.isNaN(new Date(r.date + "+03:00").getTime())
  )
    throw new Error("Geçerli tarih gerekli.");
  const parsed = new Date(r.date + "+03:00");
  const shifted = new Date(parsed.getTime() + 3 * 3600000)
    .toISOString()
    .slice(0, 16);
  if (shifted !== r.date) throw new Error("Geçerli tarih gerekli.");
  if (
    !["draft", "published"].includes(r.status) ||
    !["pending", "won", "lost", "void"].includes(r.result)
  )
    throw new Error("Geçersiz yayın durumu.");
  if (
    r.odds &&
    (!Number.isFinite(Number(r.odds)) ||
      Number(r.odds) < 1 ||
      Number(r.odds) > 10000)
  )
    throw new Error("Oran 1–10000 aralığında olmalı.");
  r.updatedAt = Date.now();
  return r;
}
