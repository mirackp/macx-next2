import { getDoc, setDoc } from "./store";
import { fetchJson } from "./http";
import { teamName, leagues } from "./feed";
import type { Detail } from "./types";
const labels: Record<string, string> = {
  possessionPct: "Topa sahip olma",
  possession: "Topa sahip olma",
  shots: "Şut",
  totalShots: "Toplam şut",
  shotsOnTarget: "İsabetli şut",
  shotsOnGoal: "İsabetli şut",
  foulsCommitted: "Faul",
  fouls: "Faul",
  offsides: "Ofsayt",
  cornerKicks: "Korner",
  saves: "Kurtarış",
  yellowCards: "Sarı kart",
  redCards: "Kırmızı kart",
  goalDifference: "Sezon averajı",
  totalGoals: "Sezon golü",
  goalAssists: "Sezon asisti",
  goalsConceded: "Sezonda yenilen gol",
};
export function parseDetail(data: any, id: string): Detail {
  const teams = data.boxscore?.teams || [],
    home = teams.find((t: any) => t.homeAway === "home") || teams[0],
    away = teams.find((t: any) => t.homeAway === "away") || teams[1];
  const stats = (home?.statistics || [])
    .filter((s: any) => labels[s.name])
    .map((s: any) => ({
      label: labels[s.name],
      home: String(s.displayValue ?? s.value ?? "—"),
      away: String(
        (away?.statistics || []).find((a: any) => a.name === s.name)
          ?.displayValue ?? "—",
      ),
    }));
  const lineups = (data.rosters || []).map((r: any) => ({
    name: teamName(r.team?.displayName || ""),
    formation: String(r.formation || ""),
    players: (r.roster || []).map((p: any) => ({
      name: String(p.athlete?.displayName || p.displayName || ""),
      number: String(p.jersey || p.athlete?.jersey || ""),
      position: String(
        p.position?.abbreviation || p.athlete?.position?.abbreviation || "",
      ),
      starter: Boolean(p.starter),
    })),
  }));
  const eventRows = [...(data.scoringPlays || []), ...(data.plays || [])];
  const seen = new Set<string>();
  const events = eventRows
    .filter((p: any) => {
      const key = String(p.id || p.text);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return Boolean(p.text || p.shortText);
    })
    .map((p: any) => ({
      minute: String(p.clock?.displayValue || p.time?.displayValue || ""),
      text: String(p.text || p.shortText || ""),
      type: String(p.type?.text || ""),
    }));
  const officials = (data.gameInfo?.officials || [])
    .map((o: any) =>
      String(o.displayName || o.fullName || o.athlete?.displayName || ""),
    )
    .filter(Boolean);
  const lastGames = (data.lastFiveGames || []).map((t: any) => ({
    name: teamName(t.team?.displayName || ""),
    rows: [...(t.events || [])]
      .sort((a: any, b: any) => String(b.gameDate).localeCompare(a.gameDate))
      .slice(0, 5)
      .map((e: any) => ({
        date: String(e.gameDate || ""),
        opponent: teamName(e.opponent?.displayName || ""),
        score: String(
          e.score || `${e.homeTeamScore ?? ""}-${e.awayTeamScore ?? ""}`,
        ),
        result: String(e.gameResult || ""),
      })),
  }));
  return {
    id,
    fetchedAt: Date.now(),
    stats,
    lineups,
    events,
    officials,
    lastGames,
  };
}
export async function getDetail(id: string, slug: string): Promise<Detail> {
  if (!/^e\d{1,16}$/.test(id) || !leagues.some((l) => l[0] === slug))
    return {
      id,
      fetchedAt: Date.now(),
      stats: [],
      lineups: [],
      events: [],
      officials: [],
      lastGames: [],
    };
  const cached = await getDoc<Detail>("detail:" + id);
  if (cached && Date.now() - cached.fetchedAt < 45000) return cached;
  try {
    const data = await fetchJson(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/summary?event=${id.slice(1)}`,
    );
    const detail = parseDetail(data, id);
    await setDoc("detail:" + id, detail);
    return detail;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}
