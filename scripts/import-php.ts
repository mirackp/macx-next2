import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  defaults,
  validatePrediction,
  validateSettings,
} from "../src/lib/content";
import {
  getDoc,
  setDoc,
  insertDoc,
  closeStore,
  storageReady,
} from "../src/lib/store";
import type { Feed, Match } from "../src/lib/types";
try {
  process.loadEnvFile(".env.local");
} catch {}
const source = process.argv[2];
if (!source) {
  console.error("Kullanım: npm run import:php -- /eski-site/data");
  process.exit(1);
}
const overwrite = process.argv.includes("--overwrite");
async function read(name: string) {
  try {
    return JSON.parse(await readFile(path.join(source, name), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
async function put(key: string, value: unknown) {
  if (overwrite) {
    await setDoc(key, value);
    return true;
  }
  return insertDoc(key, value);
}
async function main() {
  if (!process.env.DB_NAME && process.env.MACX_STORAGE !== "file")
    throw new Error("MySQL ortam değişkenleri gerekli.");
  if (!storageReady())
    throw new Error("Önce MySQL ortam değişkenlerini tanımlayın.");
  const old = await read("settings.json");
  if (old) {
    const mapping: Record<string, string> = {
      site_name: "siteName",
      site_title: "title",
      site_url: "siteUrl",
      google_verification: "googleVerification",
      ga_id: "gaId",
      adsense_id: "adsenseId",
      ad_slot: "adSlot",
      ad_label: "adLabel",
      ad_image: "adImage",
      ad_url: "adUrl",
      predictions_intro: "predictionsIntro",
      youtube_url: "youtubeUrl",
      instagram_url: "instagramUrl",
      tiktok_url: "tiktokUrl",
      x_url: "xUrl",
    };
    const next: any = { ...defaults };
    for (const [key, value] of Object.entries(old)) {
      if (key === "indexable") {
        next.indexable = value === "1";
        continue;
      }
      next[mapping[key] || key] = value;
    }
    await put("settings", validateSettings(next));
    console.log("Site ayarları aktarıldı / mevcut kayıt korundu.");
  }
  const predictions = await read("predictions.json");
  let count = 0;
  for (const row of Object.values(predictions || {}) as any[]) {
    const next = validatePrediction({
      ...row,
      analysis: row.analysis || "",
      odds: row.odds || "",
      league: row.league || "",
    });
    if (await put("prediction:" + next.id, next)) count++;
  }
  console.log(`Eklenen tahmin: ${count}`);
  const admin = await read("admin.json");
  if (admin?.username && admin?.hash) {
    await put("admin", {
      username: admin.username,
      hash: admin.hash,
      version: 1,
    });
    console.log("Yönetici kaydı aktarıldı / mevcut kayıt korundu.");
  }
  // Score snapshots are optional; they will be marked stale and refreshed from their sources.
  for (const name of await readdir(source)) {
    if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(name)) continue;
    const oldFeed = await read(name);
    if (!Array.isArray(oldFeed?.matches)) continue;
    const date = name.slice(0, 10);
    const matches: Match[] = oldFeed.matches.map((m: any) => ({
      ...m,
      date,
      kickoff: new Date(`${date}T${m.time}:00+03:00`).toISOString(),
      score: m.score || "",
      channels: (m.channels || [])
        .map((c: any) => (typeof c === "string" ? c : c.name || ""))
        .filter(Boolean),
    }));
    await put("feed:" + date, {
      date,
      matches,
      fetchedAt: 0,
      stale: true,
      errors: [],
    } satisfies Feed);
  }
  console.log("Aktarım tamamlandı. Parolalar ve ayarlar ekrana yazdırılmadı.");
}
main()
  .catch(() => {
    console.error(
      "Aktarım tamamlanamadı. Kaynak dosyaları ve veritabanı ayarlarını kontrol edin.",
    );
    process.exitCode = 1;
  })
  .finally(closeStore);
