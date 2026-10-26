import { cast } from "./cast";
import type { Detail, Match } from "./types";

export type Remark = {
  id: (typeof cast)[number]["id"];
  name: string;
  role: string;
  position: string;
  line: string;
};

const deskOrder = [
  "tilki",
  "karga",
  "kertenkele",
  "kaplumbaga",
  "kedi",
] as const;

type DeskId = (typeof deskOrder)[number];
type Event = Detail["events"][number];

function person(id: DeskId) {
  const row = cast.find((c) => c.id === id);
  if (!row) throw new Error(id);
  return row;
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clip(value: string, max = 88) {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function blob(event: Event) {
  return `${event.type} ${event.text}`;
}

function isRed(event: Event) {
  return /red card|kırmızı|second yellow/i.test(blob(event));
}

function isGoal(event: Event) {
  const text = blob(event);
  if (
    /no goal|gol değil|disallowed|missed|goal kick|goalkeeper/i.test(text)
  )
    return false;
  if (/penalty - scored|penaltı gol/i.test(text)) return true;
  return /\b(goal|gol)\b/i.test(text);
}

function isYellow(event: Event) {
  return /yellow|sarı/i.test(blob(event)) && !isRed(event);
}

function isSub(event: Event) {
  return /substitution|değişiklik|\breplaces\b|girdi/i.test(blob(event));
}

function latest(events: Event[], test: (event: Event) => boolean) {
  const hits = events.filter(test);
  return hits.at(-1) || null;
}

function formMarks(form: string) {
  return [...form]
    .map((v) => (v === "W" ? "G" : v === "L" ? "M" : v === "D" ? "B" : ""))
    .filter(Boolean);
}

function winCount(form: string) {
  return [...form].filter((v) => v === "W").length;
}

function splitScore(score: string): [number, number] | null {
  const match = score.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  return match ? [Number(match[1]), Number(match[2])] : null;
}

function tally(rows: { result: string }[]) {
  let won = 0,
    drawn = 0,
    lost = 0,
    known = 0;
  for (const row of rows) {
    if (row.result === "W") {
      won++;
      known++;
    } else if (row.result === "L") {
      lost++;
      known++;
    } else if (row.result === "D" || row.result === "T") {
      drawn++;
      known++;
    }
  }
  if (!known) return "";
  return `${won} galibiyet, ${drawn} beraberlik, ${lost} mağlubiyet`;
}

function channelPhrase(channels: string[]) {
  if (channels.length === 1) return channels[0];
  return channels.join(" ve ");
}

function minuteOf(clock: string) {
  const minute = clean(clock).match(/\d+/);
  return minute ? `${minute[0]}. dakika` : "";
}

function hostLine(match: Match) {
  const pair = `${match.home.name} – ${match.away.name}`;
  const channel = channelPhrase(match.channels);
  if (match.state === "off") return `${pair} ertelendi veya iptal.`;
  if (match.state === "live" || match.state === "final") {
    const minute = minuteOf(match.clock);
    const when = minute ? `, ${minute}` : "";
    const done = match.state === "final" ? " bitti" : "";
    const where = channel
      ? match.state === "live"
        ? ` ${channel} kanalında.`
        : ` ${channel} kanalındaydı.`
      : "";
    if (!match.score && !channel) return "";
    const body = match.score
      ? `${pair} ${match.score}${done}${when}.`
      : `${pair}.`;
    return `${body}${where}`;
  }
  const where = channel ? `, ${channel} kanalında` : "";
  return `${pair}, ${match.league}. Saat ${match.time}${where}.`;
}

function formRead(name: string, form: string) {
  const marks = formMarks(form);
  if (!marks.length) return "";
  const drawn = [...form].filter((v) => v === "D").length;
  const lost = [...form].filter((v) => v === "L").length;
  return `${name} son ${marks.length} maçta ${winCount(form)} galibiyet, ${drawn} beraberlik, ${lost} mağlubiyet aldı`;
}

function foxLine(match: Match, detail: Detail | null) {
  const shapes = (detail?.lineups || []).filter((t) => clean(t.formation));
  const goal = latest(detail?.events || [], isGoal);
  if (goal && (match.state === "live" || match.state === "final")) {
    const minute = minuteOf(goal.minute);
    const penalty = /penalty - scored|penaltı/i.test(blob(goal));
    if (penalty)
      return minute ? `Penaltı golü ${minute}da atıldı.` : "Penaltı golü var.";
    return minute ? `Gol ${minute}da geldi.` : "Gol var, dakikası yazmıyor.";
  }
  if (shapes.length >= 2)
    return `${shapes.map((t) => `${t.name || "Takım"} ${clean(t.formation)}`).join(", ")} dizilmiş.`;
  if (shapes.length === 1)
    return `${shapes[0].name || "Bir takım"} ${clean(shapes[0].formation)} dizilmiş.`;
  const home = formRead(match.home.name, match.home.form);
  const away = formRead(match.away.name, match.away.form);
  if (home && away) return `${home}. ${away}.`;
  if (home || away) return `${home || away}.`;
  return "";
}

function crowLine(match: Match, detail: Detail | null) {
  const red = latest(detail?.events || [], isRed);
  if (red) {
    const minute = minuteOf(red.minute);
    return minute ? `Kırmızı kart ${minute}da.` : "Kırmızı kart var.";
  }
  const score = splitScore(match.score);
  if (score && (match.state === "live" || match.state === "final")) {
    if (score[0] === score[1]) return `Skor ${match.score}.`;
    const leader = score[0] > score[1] ? match.home.name : match.away.name;
    return `${leader} ${match.score} ile önde.`;
  }
  const homeMarks = formMarks(match.home.form);
  const awayMarks = formMarks(match.away.form);
  const homeWins = winCount(match.home.form);
  const awayWins = winCount(match.away.form);
  if (
    homeMarks.length &&
    awayMarks.length &&
    Math.abs(homeWins - awayWins) >= 2
  ) {
    const homeBetter = homeWins > awayWins;
    const better = homeBetter ? match.home.name : match.away.name;
    const worse = homeBetter ? match.away.name : match.home.name;
    const high = Math.max(homeWins, awayWins);
    const low = Math.min(homeWins, awayWins);
    return `${better} son maçlarda ${high} kez kazandı, ${worse} ${low} kez.`;
  }
  return "";
}

function seasonRead(name: string, record: string) {
  const parsed = record.match(/^(\d+)\s*[-–]\s*(\d+)\s*[-–]\s*(\d+)$/);
  if (!parsed) return record ? `${name} sezon özeti ${record}` : "";
  const wins = Number(parsed[1]);
  const draws = Number(parsed[2]);
  const losses = Number(parsed[3]);
  return `${name} bu sezon ${wins} galibiyet, ${draws} beraberlik, ${losses} mağlubiyetle ${wins * 3 + draws} puanda`;
}

function turtleLine(match: Match, detail: Detail | null) {
  const home = seasonRead(match.home.name, match.home.record);
  const away = seasonRead(match.away.name, match.away.record);
  if (home || away) {
    const homePoints = match.home.record.match(/^(\d+)\s*[-–]\s*(\d+)/);
    const awayPoints = match.away.record.match(/^(\d+)\s*[-–]\s*(\d+)/);
    let standing = "";
    if (home && away && homePoints && awayPoints) {
      const homeTotal = Number(homePoints[1]) * 3 + Number(homePoints[2]);
      const awayTotal = Number(awayPoints[1]) * 3 + Number(awayPoints[2]);
      standing =
        homeTotal === awayTotal
          ? " Puanları eşit."
          : ` Puan olarak ${homeTotal > awayTotal ? match.home.name : match.away.name} önde.`;
    }
    if (home && away) return `${home}. ${away}.${standing}`;
    return `${home || away}.`;
  }
  const parts = (detail?.lastGames || [])
    .map((team) => {
      const text = tally(team.rows);
      return text ? `${team.name} son maçlarda ${text}` : "";
    })
    .filter(Boolean);
  if (parts.length) return `${parts.join(". ")}.`;
  return "";
}

function catLine(match: Match, detail: Detail | null) {
  const official = (detail?.officials || []).map(clean).find(Boolean);
  const place = clip(match.place, 70);
  if (official && place) return `${place}. Hakem ${clip(official, 48)}.`;
  if (official) return `Hakem ${clip(official, 60)}.`;
  const yellow = latest(detail?.events || [], isYellow);
  if (yellow) {
    const minute = minuteOf(yellow.minute);
    return minute ? `Sarı kart ${minute}da çıktı.` : "Sarı kart var.";
  }
  const sub = latest(detail?.events || [], isSub);
  if (sub) {
    const minute = minuteOf(sub.minute);
    return minute
      ? `${minute}da oyuncu değişikliği var.`
      : "Oyuncu değişikliği var.";
  }
  if (place) return `${place}.`;
  return "";
}

export function matchRemarks(match: Match, detail: Detail | null): Remark[] {
  const lines: Record<DeskId, string> = {
    tilki: foxLine(match, detail),
    karga: crowLine(match, detail),
    kertenkele: hostLine(match),
    kaplumbaga: turtleLine(match, detail),
    kedi: catLine(match, detail),
  };
  return deskOrder.map((id) => {
    const row = person(id);
    return {
      id,
      name: row.name,
      role: row.role,
      position: row.position,
      line: lines[id],
    };
  });
}
