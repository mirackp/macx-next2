import { dayOf, offsetDay, fold, timeOf } from "./dates";
import { fetchText, fetchJson } from "./http";
import { getDoc, setDoc } from "./store";
import type { Match, Odds } from "./types";
type TV = {
  date: string;
  time: string;
  home: string;
  away: string;
  channels: string[];
};
function club(value: string) {
  const normalized = fold(value)
    .replace(/\b(fc|fk|sk|cf|afc)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const aliases: Record<string, string> = {
    "istanbul basaksehir": "basaksehir",
    "fatih karagumruk": "karagumruk",
    "paris saint germain": "psg",
    "saint germain": "psg",
    "manchester city": "man city",
    "manchester united": "man utd",
    "atletico madrid": "atl madrid",
    "athletic bilbao": "athletic club",
    "amed sfk": "amedspor",
  };
  return aliases[normalized] || normalized;
}
export function sameTeams(
  a: { home: string; away: string },
  b: { home: string; away: string },
) {
  return club(a.home) === club(b.home) && club(a.away) === club(b.away);
}
const unescape = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export function parseBein(html: string, date: string, channel: string): TV[] {
  return [
    ...html.matchAll(
      /streaming-content_time__[^\"]*\">(\d{2}:\d{2})<\/span><span class=\"streaming-content_program__[^\"]*\">([^<]+)/g,
    ),
  ].flatMap((m) => {
    const parts = unescape(m[2]).split(/\s+[–—-]\s+/);
    return parts.length === 2
      ? [
          {
            date,
            time: m[1],
            home: parts[0],
            away: parts[1],
            channels: [channel],
          },
        ]
      : [];
  });
}
function parseSSport(html: string, date: string): TV[] {
  const area = html.slice(Math.max(0, html.indexOf('id="switcher-day-all"')));
  const day = area.match(
    new RegExp(`<li data-date="${date}"[^>]*>(.*?)(?=<li data-date="|$)`, "s"),
  );
  if (!day) return [];
  return [
    ...day[1].matchAll(
      /streaming-time[^>]*>\s*(\d{1,2}:\d{2})\s*<\/div>.*?streaming-name.*?<h3[^>]*>(.*?)<\/h3>.*?streaming-channels[^>]*>(.*?)<\/div>/gs,
    ),
  ].flatMap((m) => {
    const parts = unescape(m[2]).split(/\s+[–—-]\s+/),
      channels = [...m[3].matchAll(/alt="([^\"]+)"/g)].map((a) =>
        unescape(a[1]),
      );
    return parts.length === 2 && channels.length
      ? [
          {
            date,
            time: m[1].padStart(5, "0"),
            home: parts[0],
            away: parts[1],
            channels,
          },
        ]
      : [];
  });
}
export async function refreshTV(date: string) {
  if (date < offsetDay(dayOf(), -1) || date > offsetDay(dayOf(), 6)) return;
  const old = await getDoc<{ rows: TV[]; fetchedAt: number }>("tv:" + date);
  if (old && Date.now() - old.fetchedAt < 3600000) return;
  const weekdays = [
    "pazar",
    "pazartesi",
    "sali",
    "carsamba",
    "persembe",
    "cuma",
    "cumartesi",
  ];
  const weekday = weekdays[new Date(date + "T12:00:00+03:00").getUTCDay()];
  const specs = [
    ["beinsports", "beIN Sports 1"],
    ["beinsports-2", "beIN Sports 2"],
    ["beinsports-3", "beIN Sports 3"],
    ["beinsports-4", "beIN Sports 4"],
  ];
  const results = await Promise.allSettled([
    ...specs.map(async ([slug, name]) =>
      parseBein(
        await fetchText(
          `https://beinsports.com.tr/yayin-akisi/${slug}/${weekday}`,
          5000,
        ),
        date,
        name,
      ),
    ),
    fetchText("https://www.ssportplus.com/yayin-akisi/", 5000).then((html) =>
      parseSSport(html, date),
    ),
  ]);
  const rows = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : [],
  );
  if (rows.length || !old)
    await setDoc("tv:" + date, { rows, fetchedAt: Date.now() });
}
export async function attachChannels(matches: Match[], date: string) {
  const tv = await getDoc<{ rows: TV[] }>("tv:" + date);
  return matches.map((m) => ({
    ...m,
    channels: [
      ...new Set([
        ...m.channels,
        ...(tv?.rows || [])
          .filter(
            (row) =>
              row.time === m.time &&
              sameTeams({ home: m.home.name, away: m.away.name }, row),
          )
          .flatMap((row) => row.channels),
      ]),
    ],
  }));
}
const price = (v: unknown) =>
  Number.isFinite(Number(v)) && Number(v) > 1 ? Number(v).toFixed(2) : "";
function officialRows(data: any, source: string): Odds[] {
  return (data.data?.events || []).flatMap((e: any) => {
    const date = new Date(Number(e.d) * (Number(e.d) < 1e12 ? 1000 : 1));
    if (Number.isNaN(date.getTime())) return [];
    const row: Odds = {
      date: dayOf(date),
      time: timeOf(date.toISOString()),
      home: e.hn || "",
      away: e.an || "",
      one: "",
      draw: "",
      two: "",
      over: "",
      under: "",
      source,
    };
    for (const m of e.m || []) {
      const result = m.t === 1 && m.st === 1,
        goals = m.t === 2 && m.st === 101 && String(m.sov) === "2.5";
      if (!result && !goals) continue;
      for (const o of m.o || []) {
        const n = fold(String(o.n));
        const key = result
          ? (
              { "1": "one", "0": "draw", x: "draw", "2": "two" } as Record<
                string,
                string
              >
            )[n]
          : ({ alt: "under", ust: "over" } as Record<string, string>)[n];
        if (key) (row as any)[key] = price(o.odd);
      }
    }
    return row.one && row.draw && row.two ? [row] : [];
  });
}
function nesineRows(data: any): Odds[] {
  return (data.EA || [])
    .filter((e: any) => Number(e.TYPE) === 1)
    .flatMap((e: any) => {
      const parts = String(e.D || "").split(".");
      if (parts.length !== 3) return [];
      const row: Odds = {
        date: `${parts[2]}-${parts[1]}-${parts[0]}`,
        time: String(e.T || "").padStart(5, "0"),
        home: String(e.HN || ""),
        away: String(e.AN || ""),
        one: "",
        draw: "",
        two: "",
        under: "",
        over: "",
        source: "Nesine",
      };
      for (const m of e.MA || []) {
        const isResult = Number(m.MTID) === 1 && Number(m.SOV || 0) === 0,
          isGoals = Number(m.MTID) === 12 && String(m.SOV) === "2.5";
        for (const o of m.OCA || []) {
          const key = isResult
            ? ({ 1: "one", 2: "draw", 3: "two" } as Record<number, string>)[o.N]
            : isGoals
              ? ({ 1: "under", 2: "over" } as Record<number, string>)[o.N]
              : "";
          if (key) (row as any)[key] = price(o.O);
        }
      }
      return row.one && row.draw && row.two ? [row] : [];
    });
}
let oddsTask: Promise<void> | undefined;
export async function refreshOdds() {
  if (oddsTask) return oddsTask;
  oddsTask = (async () => {
    const previous = await getDoc<{ rows: Odds[]; fetchedAt: number }>("odds");
    if (previous && Date.now() - previous.fetchedAt < 120000) return;
    const specs = [
      {
        source: "İddaa",
        url: "https://sportsbookv2.iddaa.com/sportsbook/events?st=1&type=0&version=0",
        parse: (v: any) => officialRows(v, "İddaa"),
      },
      {
        source: "Nesine",
        url: "https://cdnbulten.nesine.com/api/bulten/getprebultenfull",
        parse: nesineRows,
      },
    ];
    const results = await Promise.allSettled(
      specs.map(async (s) => s.parse(await fetchJson(s.url, 6000))),
    );
    const rows = results.flatMap((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : (previous?.rows || []).filter(
            (row) => row.source === specs[i].source,
          ),
    );
    if (rows.length || !previous)
      await setDoc("odds", { rows, fetchedAt: Date.now() });
  })();
  try {
    await oddsTask;
  } finally {
    oddsTask = undefined;
  }
}
export async function oddsFor(match: Match) {
  await refreshOdds();
  const data = await getDoc<{ rows: Odds[]; fetchedAt: number }>("odds");
  return {
    fetchedAt: data?.fetchedAt || 0,
    rows: (data?.rows || []).filter(
      (row) =>
        row.date === match.date &&
        row.time === match.time &&
        sameTeams(row, { home: match.home.name, away: match.away.name }),
    ),
  };
}
