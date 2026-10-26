import { randomUUID } from "node:crypto";
import { getDoc, setDoc, mutateDoc } from "./store";
import { dayOf, offsetDay, timeOf } from "./dates";
import { fetchJson, mapLimit } from "./http";
import type { Feed, Match, Team } from "./types";
import { leagues } from "./leagues";
export { leagues } from "./leagues";
const names: Record<string, string> = {
  Besiktas: "Beşiktaş",
  Fenerbahce: "Fenerbahçe",
  "Istanbul Basaksehir": "Başakşehir",
  Basaksehir: "Başakşehir",
  Kasimpasa: "Kasımpaşa",
  Eyupspor: "Eyüpspor",
  "Caykur Rizespor": "Çaykur Rizespor",
  Goztepe: "Göztepe",
  Genclerbirligi: "Gençlerbirliği",
  "Amed SFK": "Amedspor",
  "Fatih Karagumruk": "Karagümrük",
};
export const teamName = (s: string) => names[s] || s;
function side(s: any): Team {
  const t = s.team || {};
  const id = String(t.id || s.id || "");
  return {
    id,
    name: teamName(t.displayName || t.name || "Takım"),
    logo: /^\d+$/.test(id) ? `/logos/espn-${id}.png` : "",
    score: String(s.score?.displayValue ?? s.score ?? ""),
    record: String(
      (s.records || s.record || []).find((r: any) => r.type === "total")
        ?.summary || "",
    ),
    form: String(s.form || ""),
  };
}
export function parseEvent(
  event: any,
  slug: string,
  league: string,
  date: string,
): Match | null {
  const c = event?.competitions?.[0];
  if (!c || !event.date || dayOf(event.date) !== date) return null;
  const h = c.competitors?.find((s: any) => s.homeAway === "home"),
    a = c.competitors?.find((s: any) => s.homeAway === "away");
  if (!h || !a) return null;
  const status = c.status || event.status || {},
    type = status.type || {};
  const raw = type.name || "";
  const state: Match["state"] = /POSTPON|CANCEL|SUSPEND|ABANDON/.test(raw)
    ? "off"
    : type.state === "in"
      ? "live"
      : type.state === "post"
        ? "final"
        : "pre";
  const home = side(h),
    away = side(a);
  return {
    id: "e" + String(event.id || c.id),
    slug,
    league,
    date,
    time: timeOf(event.date),
    kickoff: new Date(event.date).toISOString(),
    state,
    status:
      state === "live"
        ? "Canlı"
        : state === "final"
          ? "Maç bitti"
          : state === "off"
            ? "Ertelendi / iptal"
            : "Başlamadı",
    clock:
      state === "live"
        ? String(status.displayClock || status.type?.shortDetail || "Canlı")
        : "",
    score: ["live", "final"].includes(state)
      ? `${home.score || "0"}-${away.score || "0"}`
      : "",
    place: [c.venue?.fullName, c.venue?.address?.city]
      .filter(Boolean)
      .join(" · "),
    home,
    away,
    channels: [],
  };
}
export function feedTtl(feed: Feed) {
  if (feed.matches.some((m) => m.state === "live")) return 30000;
  if (feed.date === dayOf()) return 90000;
  return 900000;
}
export async function readFeed(date: string): Promise<Feed> {
  const row = await getDoc<Feed>("feed:" + date);
  return row
    ? { ...row, stale: Date.now() - row.fetchedAt > feedTtl(row) }
    : { date, matches: [], fetchedAt: 0, stale: true, errors: [] };
}
async function fetchFirstLeague(date: string): Promise<Match[]> {
  const data = await fetchJson(
    `https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=${date}&l=Turkish%201%20Lig`,
  );
  return (data.events || [])
    .filter((e: any) => e.strLeague === "Turkish 1 Lig" && e.dateEvent === date)
    .map((e: any) => {
      const kickoff =
          e.strTimestamp || `${e.dateEvent}T${e.strTime || "00:00:00"}Z`,
        state: Match["state"] =
          e.strStatus === "Match Finished"
            ? "final"
            : e.strStatus === "In Progress"
              ? "live"
              : e.strStatus === "Match Postponed"
                ? "off"
                : "pre";
      const side = (home: boolean): Team => ({
        id: String(e[home ? "idHomeTeam" : "idAwayTeam"] || ""),
        name: String(e[home ? "strHomeTeam" : "strAwayTeam"] || ""),
        logo: "",
        score: String(e[home ? "intHomeScore" : "intAwayScore"] ?? ""),
        record: "",
        form: "",
      });
      const home = side(true),
        away = side(false);
      return {
        id: "s" + e.idEvent,
        slug: "tur.2",
        league: "1. Lig",
        date,
        time: timeOf(kickoff),
        kickoff,
        state,
        status:
          state === "final"
            ? "Maç bitti"
            : state === "live"
              ? "Canlı"
              : "Başlamadı",
        clock: "",
        score: ["live", "final"].includes(state)
          ? `${home.score}-${away.score}`
          : "",
        place: e.strVenue || "",
        home,
        away,
        channels: [],
      };
    });
}
const inflight = new Map<string, Promise<Feed>>();
export async function refreshFeed(date: string): Promise<Feed> {
  if (inflight.has(date)) return inflight.get(date)!;
  const task = refresh(date);
  inflight.set(date, task);
  try {
    return await task;
  } finally {
    inflight.delete(date);
  }
}
async function refresh(date: string): Promise<Feed> {
  const owner = randomUUID(),
    now = Date.now();
  const lease = await mutateDoc<{ owner: string; until: number }>(
    "lease:feed:" + date,
    (current) =>
      !current || current.until < now ? { owner, until: now + 90000 } : current,
  );
  if (lease.owner !== owner) return readFeed(date);
  try {
    const jobs = leagues.flatMap<{ slug: string; name: string; day: string }>(
      ([slug, name]) =>
        slug === "tur.2"
          ? [{ slug, name, day: date }]
          : [offsetDay(date, -1), date].map((day) => ({ slug, name, day })),
    );
    const results = await mapLimit(jobs, 10, async (job) => {
      if (job.slug === "tur.2") return fetchFirstLeague(date);
      const data = await fetchJson(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/${job.slug}/scoreboard?dates=${job.day.replaceAll("-", "")}&limit=200`,
      );
      if (!Array.isArray(data.events)) throw new Error("Geçersiz bülten.");
      return data.events
        .map((event: any) => parseEvent(event, job.slug, job.name, date))
        .filter(Boolean) as Match[];
    });
    const unique = new Map<string, Match>();
    const failed = new Set<string>(),
      worked = new Set<string>();
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        worked.add(jobs[i].slug);
        r.value.forEach((m) => unique.set(m.id, m));
      } else failed.add(jobs[i].slug);
    });
    let matches = [...unique.values()];
    const old = await readFeed(date);
    const errors = [...failed]
      .filter((s) => !worked.has(s))
      .map(
        (s) => `${leagues.find((l) => l[0] === s)?.[1]} kaynağına ulaşılamadı.`,
      );
    // A failed provider must not erase the last known programme.
    for (const match of old.matches)
      if (!worked.has(match.slug) && !unique.has(match.id)) matches.push(match);
    matches = matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
    const fresh: Feed = {
      date,
      matches,
      fetchedAt: Date.now(),
      stale: false,
      errors,
    };
    if (worked.size === 0) {
      const fallback = {
        ...old,
        stale: true,
        retryAt: Date.now() + 60000,
        errors: [
          "Veri kaynaklarına ulaşılamıyor.",
        ],
      };
      await setDoc("feed:" + date, fallback);
      return fallback;
    }
    await setDoc("feed:" + date, fresh);
    return fresh;
  } finally {
    await setDoc("lease:feed:" + date, { owner: "", until: 0 });
  }
}
