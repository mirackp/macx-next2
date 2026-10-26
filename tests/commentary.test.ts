import { test } from "node:test";
import assert from "node:assert/strict";
import { matchRemarks } from "../src/lib/commentary";
import type { Detail, Match } from "../src/lib/types";

function match(patch: Partial<Match> = {}): Match {
  return {
    id: "e1",
    slug: "tur.1",
    league: "Süper Lig",
    date: "2026-10-26",
    time: "20:00",
    kickoff: "2026-10-26T17:00:00.000Z",
    state: "pre",
    status: "Başlamadı",
    clock: "",
    score: "",
    place: "",
    home: {
      id: "1",
      name: "Galatasaray",
      logo: "",
      score: "",
      record: "",
      form: "",
    },
    away: {
      id: "2",
      name: "Fenerbahçe",
      logo: "",
      score: "",
      record: "",
      form: "",
    },
    channels: [],
    ...patch,
  };
}

function detail(patch: Partial<Detail> = {}): Detail {
  return {
    id: "e1",
    fetchedAt: 1,
    stats: [],
    lineups: [],
    events: [],
    officials: [],
    lastGames: [],
    ...patch,
  };
}

function line(rows: ReturnType<typeof matchRemarks>, id: string) {
  const row = rows.find((r) => r.id === id);
  assert.ok(row);
  return row.line;
}

test("masa soldan sağa stüdyo sırasıyla konuşur", () => {
  const rows = matchRemarks(match(), null);
  assert.deepEqual(
    rows.map((r) => r.id),
    ["tilki", "karga", "kertenkele", "kaplumbaga", "kedi"],
  );
  assert.equal(line(rows, "karga"), "");
  assert.match(line(rows, "kertenkele"), /Saat 20:00/);
  assert.doesNotMatch(line(rows, "kertenkele"), /kanal bilgisi|kaynakta yok/);
});

test("ertelenen maçta skor ve bahis cümlesi kurulmaz", () => {
  const rows = matchRemarks(match({ state: "off", score: "1-0" }), null);
  const text = rows.map((r) => r.line).join(" ");
  assert.match(line(rows, "kertenkele"), /ertelendi veya iptal/);
  assert.doesNotMatch(line(rows, "kertenkele"), /1-0/);
  assert.doesNotMatch(text, /bahis|iddaa|kazanır|yener/i);
});

test("başlamadan kanal, saat ve form cümleyle söylenir", () => {
  const rows = matchRemarks(
    match({
      place: "RAMS Park · İstanbul",
      channels: ["beIN Sports 1"],
      home: {
        id: "1",
        name: "Galatasaray",
        logo: "",
        score: "",
        record: "8-1-1",
        form: "WWWWW",
      },
      away: {
        id: "2",
        name: "Fenerbahçe",
        logo: "",
        score: "",
        record: "",
        form: "LLLLL",
      },
    }),
    null,
  );
  assert.match(
    line(rows, "kertenkele"),
    /Saat 20:00, beIN Sports 1 kanalında/,
  );
  assert.match(
    line(rows, "tilki"),
    /Galatasaray son 5 maçta 5 galibiyet, 0 beraberlik, 0 mağlubiyet aldı/,
  );
  assert.match(line(rows, "tilki"), /Fenerbahçe son 5 maçta 0 galibiyet/);
  assert.doesNotMatch(line(rows, "tilki"), /istikrarlı|birbirine yakın|kaynakta yok/);
  assert.doesNotMatch(line(rows, "tilki"), /G G G|harfi/);
  assert.match(
    line(rows, "karga"),
    /Galatasaray son maçlarda 5 kez kazandı, Fenerbahçe 0 kez/,
  );
  assert.match(
    line(rows, "kaplumbaga"),
    /Galatasaray bu sezon 8 galibiyet, 1 beraberlik, 1 mağlubiyetle 25 puanda/,
  );
  assert.doesNotMatch(line(rows, "kaplumbaga"), /Fenerbahçe|kaynakta yok/);
  assert.doesNotMatch(line(rows, "kaplumbaga"), /8-1-1/);
  assert.match(line(rows, "kedi"), /RAMS Park/);
  assert.doesNotMatch(line(rows, "kedi"), /beIN/);
});

test("biten maçta skor, gol, kırmızı ve şekil ayrı ağızlardan gelir", () => {
  const rows = matchRemarks(
    match({ state: "final", score: "2-1", status: "Maç bitti" }),
    detail({
      lineups: [
        {
          name: "Galatasaray",
          formation: "4-2-3-1",
          players: [],
        },
        { name: "Fenerbahçe", formation: "4-4-2", players: [] },
      ],
      events: [
        {
          minute: "12'",
          text: "Goal Kick",
          type: "Goal Kick",
        },
        {
          minute: "23'",
          text: "Header",
          type: "Goal",
        },
        {
          minute: "40'",
          text: "Penalty - Missed",
          type: "Penalty",
        },
        {
          minute: "55'",
          text: "Foul",
          type: "Yellow Card",
        },
        {
          minute: "70'",
          text: "Professional foul",
          type: "Red Card",
        },
      ],
      officials: ["Halil Umut Meler"],
    }),
  );
  assert.match(
    line(rows, "kertenkele"),
    /Galatasaray – Fenerbahçe 2-1 bitti\./,
  );
  assert.match(line(rows, "tilki"), /Gol 23\. dakikada geldi/);
  assert.doesNotMatch(line(rows, "tilki"), /Goal Kick|12'|Header/);
  assert.doesNotMatch(line(rows, "kertenkele"), /kanal/i);
  assert.match(line(rows, "karga"), /Kırmızı kart 70\. dakikada/);
  assert.doesNotMatch(line(rows, "karga"), /önde|denge/);
  assert.match(line(rows, "kedi"), /Hakem Halil Umut Meler/);
  assert.doesNotMatch(line(rows, "kedi"), /kaynakta yok|Stadyum/);
});

test("beraberlikte ve son maçlarda uydurma cetvel yoktur", () => {
  const rows = matchRemarks(
    match({ state: "live", score: "1-1", clock: "64'" }),
    detail({
      lastGames: [
        {
          name: "Galatasaray",
          rows: [
            { date: "", opponent: "A", score: "1-0", result: "W" },
            { date: "", opponent: "B", score: "0-0", result: "D" },
          ],
        },
      ],
    }),
  );
  assert.match(
    line(rows, "kertenkele"),
    /Galatasaray – Fenerbahçe 1-1, 64\. dakika/,
  );
  assert.match(
    line(rows, "karga"),
    /^Skor 1-1\.$/,
  );
  assert.match(
    line(rows, "kaplumbaga"),
    /Galatasaray son maçlarda 1 galibiyet, 1 beraberlik, 0 mağlubiyet/,
  );
  assert.doesNotMatch(line(rows, "kaplumbaga"), /Fenerbahçe son maçlarda/);
});

test("gol vuruşu kırılma sayılmaz, atılan penaltı sayılır", () => {
  const missed = matchRemarks(
    match({ state: "live", score: "0-0", clock: "10'" }),
    detail({
      events: [{ minute: "3'", text: "Goal Kick", type: "Goal Kick" }],
    }),
  );
  assert.equal(line(missed, "tilki"), "");
  assert.doesNotMatch(line(missed, "tilki"), /Gol /);
  const scored = matchRemarks(
    match({ state: "live", score: "1-0", clock: "30'" }),
    detail({
      events: [
        {
          minute: "28'",
          text: "Penalty - Scored",
          type: "Penalty",
        },
      ],
    }),
  );
  assert.match(line(scored, "tilki"), /Penaltı golü 28\. dakikada atıldı/);
  assert.doesNotMatch(line(scored, "tilki"), /Penalty - Scored/);
  assert.match(line(scored, "karga"), /Galatasaray 1-0 ile önde/);
});
