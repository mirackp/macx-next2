import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { dayOf, validDay, fold } from "../src/lib/dates";
import {
  defaults,
  validateSettings,
  validatePrediction,
} from "../src/lib/content";
import { parseEvent, feedTtl } from "../src/lib/feed";
import { parseDetail } from "../src/lib/details";
import { sameTeams, parseBein } from "../src/lib/extras";
import {
  getDoc,
  setDoc,
  insertDoc,
  mutateDoc,
  listDocs,
  deleteDoc,
} from "../src/lib/store";
import {
  hashPassword,
  verifyPassword,
  safeEqual,
  rateLimit,
} from "../src/lib/auth";
const dir = await mkdtemp(path.join(os.tmpdir(), "macx-test-"));
process.env.MACX_STORAGE = "file";
process.env.MACX_DATA_DIR = dir;
after(() => rm(dir, { recursive: true, force: true }));
test("İstanbul günü UTC gece sınırında doğru hesaplanır", () =>
  assert.equal(dayOf("2026-10-25T22:30:00Z"), "2026-10-26"));
test("geçersiz veya taşmış tarih kabul edilmez", () => {
  assert.equal(validDay("2026-02-31"), dayOf());
  assert.equal(validDay("../../etc"), dayOf());
});
test("Türkçe arama sadeleştirilir", () =>
  assert.equal(fold("Çaykur RİZESPOR"), "caykur rizespor"));
test("Google kimliği ve HTTPS adresi doğrulanır", () => {
  assert.throws(() => validateSettings({ ...defaults, gaId: "<script>" }));
  assert.throws(() =>
    validateSettings({ ...defaults, adUrl: "javascript:alert(1)" }),
  );
  assert.equal(
    validateSettings({ ...defaults, gaId: "G-TEST123" }).gaId,
    "G-TEST123",
  );
});
test("gerçekte bulunmayan maç tarihi ve oran reddedilir", () => {
  const p = {
    id: "test-match-123",
    home: "A",
    away: "B",
    league: "Lig",
    date: "2026-02-31T20:00",
    pick: "1",
    odds: "1.80",
    analysis: "Not",
    status: "draft",
    result: "pending",
  };
  assert.throws(() => validatePrediction(p));
  assert.throws(() =>
    validatePrediction({ ...p, date: "2026-10-26T20:00", odds: "NaN" }),
  );
  assert.equal(
    validatePrediction({ ...p, date: "2026-10-26T20:00" }).status,
    "draft",
  );
});
const event = {
  id: "123",
  date: "2026-10-25T22:30:00Z",
  competitions: [
    {
      competitors: [
        {
          homeAway: "home",
          team: { id: "1895", displayName: "Besiktas" },
          score: "2",
        },
        {
          homeAway: "away",
          team: { id: "432", displayName: "Galatasaray" },
          score: "1",
        },
      ],
      status: { type: { state: "in" }, displayClock: "62'" },
      venue: { fullName: "Stadyum" },
    },
  ],
};
test("maç kaynak verisi doğru gün ve skorla ayrıştırılır", () => {
  const m = parseEvent(event, "tur.1", "Süper Lig", "2026-10-26");
  assert.equal(m?.time, "01:30");
  assert.equal(m?.score, "2-1");
  assert.equal(m?.home.name, "Beşiktaş");
  assert.equal(parseEvent(event, "tur.1", "Süper Lig", "2026-10-25"), null);
});
test("ertelenen maç canlı sayılmaz", () => {
  const m = parseEvent(
    {
      ...event,
      competitions: [
        {
          ...event.competitions[0],
          status: { type: { state: "in", name: "STATUS_POSTPONED" } },
        },
      ],
    },
    "tur.1",
    "Süper Lig",
    "2026-10-26",
  );
  assert.equal(m?.state, "off");
  assert.equal(m?.score, "");
});
test("takım eşleştirmesi yanlış deplasmana oran bağlamaz", () => {
  assert.equal(
    sameTeams(
      { home: "Istanbul Basaksehir", away: "Beşiktaş" },
      { home: "Başakşehir", away: "Besiktas" },
    ),
    true,
  );
  assert.equal(
    sameTeams(
      { home: "Başakşehir", away: "Beşiktaş" },
      { home: "Beşiktaş", away: "Başakşehir" },
    ),
    false,
  );
});
test("TV akışı takım ve saati korur", () => {
  const html =
    '<span class="streaming-content_time__x">19:00</span><span class="streaming-content_program__x">Beşiktaş - Galatasaray</span>';
  const rows = parseBein(html, "2026-10-26", "beIN Sports 1");
  assert.equal(rows[0].home, "Beşiktaş");
  assert.equal(rows[0].time, "19:00");
});
test("eksik detaylarda uydurma kadro üretilmez", () => {
  const d = parseDetail({}, "e123");
  assert.equal(d.lineups.length, 0);
  assert.equal(d.stats.length, 0);
  assert.equal(d.events.length, 0);
});
test("kalıcı kayıt ve silme çalışır", async () => {
  await setDoc("prediction:test", { value: "kalıcı" });
  assert.deepEqual(await getDoc("prediction:test"), { value: "kalıcı" });
  assert.equal((await listDocs("prediction:")).length, 1);
  await deleteDoc("prediction:test");
  assert.equal(await getDoc("prediction:test"), null);
});
test("ilk hesap kayıt çakışmasında üzerine yazılmaz", async () => {
  assert.equal(await insertDoc("admin-test", { value: 1 }), true);
  assert.equal(await insertDoc("admin-test", { value: 2 }), false);
  assert.deepEqual(await getDoc("admin-test"), { value: 1 });
});
test("paralel sayaç güncellemeleri kaybolmaz", async () => {
  await Promise.all(
    Array.from({ length: 15 }, () =>
      mutateDoc<number>("counter", (v) => (v || 0) + 1),
    ),
  );
  assert.equal(await getDoc("counter"), 15);
});
test("parolalar scrypt ile doğrulanır", async () => {
  const hash = await hashPassword("Test-only-password-123");
  assert(!hash.includes("Test-only"));
  assert.equal(await verifyPassword("Test-only-password-123", hash), true);
  assert.equal(await verifyPassword("Yanlis", hash), false);
  assert.equal(safeEqual("abc", "ab"), false);
});
test("giriş denemesi sınırı uygulanır", async () => {
  const results = [];
  for (let i = 0; i < 6; i++) results.push(await rateLimit("test-ip", 5));
  assert.deepEqual(results, [true, true, true, true, true, false]);
});
