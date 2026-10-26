"use client";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { Feed, Match, Team, Detail, Odds } from "@/lib/types";
import { ChannelList } from "./ChannelMark";
import { DeskTalk } from "./Desk";
import { dayOf, dayLabel, offsetDay, fold } from "@/lib/dates";
import { leagues } from "@/lib/leagues";
type Phase = "all" | "live" | "pre" | "final" | "favorites";
const phases: Record<Phase, string> = {
  all: "Hepsi",
  live: "Canlı",
  pre: "Başlayacak",
  final: "Biten",
  favorites: "Favorilerim",
};
export function TeamLogo({
  team,
  large = false,
}: {
  team: Team;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(0);
  const remote = /^\d+$/.test(team.id)
    ? `https://a.espncdn.com/i/teamlogos/soccer/500/${team.id}.png`
    : "";
  const src = failed === 0 ? team.logo : remote;
  if (!src || failed > 1)
    return (
      <span
        className={`team-fallback ${large ? "large" : ""}`}
        aria-hidden="true"
      >
        {team.name.slice(0, 2)}
      </span>
    );
  return (
    <img
      src={src}
      width={large ? 64 : 24}
      height={large ? 64 : 24}
      alt=""
      className={large ? "team-logo large" : "team-logo"}
      loading="lazy"
      onError={() => setFailed((f) => f + 1)}
    />
  );
}
export function MatchCenter({
  initial,
  initialId,
}: {
  initial: Feed;
  initialId: string;
}) {
  const [feed, setFeed] = useState(initial),
    [networkError, setNetworkError] = useState(""),
    [phase, setPhase] = useState<Phase>("all"),
    [league, setLeague] = useState("all"),
    [query, setQuery] = useState(""),
    [selectedId, setSelectedId] = useState(initialId),
    [favorites, setFavorites] = useState<string[]>([]);
  const q = useDeferredValue(query),
    panel = useRef<HTMLElement>(null),
    list = useRef<HTMLDivElement>(null);
  const date = initial.date,
    today = dayOf();
  useEffect(() => {
    try {
      const value = JSON.parse(
        localStorage.getItem("macx-favorites-v2") ||
          localStorage.getItem("macx-tut") ||
          "[]",
      );
      setFavorites(
        Array.isArray(value) ? value.filter((v) => typeof v === "string") : [],
      );
    } catch {}
  }, []);
  useEffect(() => {
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function refresh() {
      if (document.visibilityState === "hidden") {
        timer = setTimeout(refresh, 30000);
        return;
      }
      let next = 30000;
      try {
        const response = await fetch(`/api/matches?date=${date}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await response.json()) as Feed;
        if (stopped) return;
        if (!response.ok)
          throw new Error(data.errors?.[0] || "Veriler yenilenemedi.");
        setFeed(data);
        setNetworkError("");
        if (!data.fetchedAt && !data.retryAt) next = 3500;
      } catch (error) {
        if (!stopped)
          setNetworkError(
            error instanceof Error ? error.message : "Bağlantı kurulamadı.",
          );
      }
      if (!stopped) timer = setTimeout(refresh, next);
    }
    refresh();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [date]);
  const visible = useMemo(
    () =>
      feed.matches.filter(
        (m) =>
          (league === "all" || m.slug === league) &&
          (phase === "all" ||
            (phase === "favorites" && favorites.includes(m.id)) ||
            (phase === "final" && ["final", "off"].includes(m.state)) ||
            m.state === phase) &&
          (!q ||
            fold(`${m.home.name} ${m.away.name} ${m.league}`).includes(
              fold(q),
            )),
      ),
    [feed.matches, league, phase, favorites, q],
  );
  const selected =
    visible.find((m) => m.id === selectedId) ||
    visible.find((m) => m.state === "live") ||
    visible.find((m) => m.state === "pre") ||
    visible[0];
  const groups = useMemo(() => {
    const map = new Map<string, Match[]>();
    visible.forEach((m) => {
      const rows = map.get(m.time) || [];
      rows.push(m);
      map.set(m.time, rows);
    });
    return [...map];
  }, [visible]);
  function toggleFavorite(id: string) {
    setFavorites((previous) => {
      const next = previous.includes(id)
        ? previous.filter((v) => v !== id)
        : [...previous, id];
      try {
        localStorage.setItem("macx-favorites-v2", JSON.stringify(next));
      } catch {}
      return next;
    });
  }
  function choose(m: Match) {
    setSelectedId(m.id);
    const url = new URL(location.href);
    url.searchParams.set("d", date);
    url.searchParams.set("m", m.id);
    history.replaceState(null, "", url);
    if (matchMedia("(max-width: 1249px)").matches)
      panel.current?.scrollIntoView({
        block: "start",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }
  return (
    <section id="mac-merkezi" className="match-center">
      <div className="match-top">
        <nav className="date-picker" aria-label="Maç tarihi">
          <Link
            href={`/?d=${offsetDay(date, -1)}#mac-merkezi`}
            aria-label="Önceki gün"
            aria-disabled={date <= offsetDay(today, -21)}
          >
            ‹
          </Link>
          <label>
            <span>{dayLabel(date)}</span>
            <input
              aria-label="Tarih seç"
              type="date"
              value={date}
              min={offsetDay(today, -21)}
              max={offsetDay(today, 14)}
              onChange={(e) => {
                if (e.target.value)
                  location.href = `/?d=${e.target.value}#mac-merkezi`;
              }}
            />
          </label>
          <Link
            href={`/?d=${offsetDay(date, 1)}#mac-merkezi`}
            aria-label="Sonraki gün"
            aria-disabled={date >= offsetDay(today, 14)}
          >
            ›
          </Link>
          {date !== today ? (
            <Link href="/#mac-merkezi" className="today">
              Bugün
            </Link>
          ) : null}
        </nav>
      </div>
      {networkError || !feed.fetchedAt || feed.stale || feed.errors.length ? (
        <div className="feed-status" role="status">
          {networkError ||
            (!feed.fetchedAt
              ? "Yükleniyor."
              : feed.stale
                ? "Güncelleniyor."
                : "")}
          {feed.errors.length ? (
            <details>
              <summary>Kaynak durumu</summary>
              {feed.errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </details>
          ) : null}
        </div>
      ) : null}
      <div className="workspace">
        <aside className="league-sidebar">
          <div className="panel-label">
            <span>Ligler</span>
          </div>
          <nav className="league-list" aria-label="Ligler">
            {[["all", "Tümü"], ...leagues].map(([slug, label]) => (
              <button
                key={slug}
                aria-pressed={league === slug}
                onClick={() => {
                  setLeague(slug);
                  list.current?.scrollTo({ top: 0 });
                }}
              >
                <span className={`league-icon ${slug === "all" ? "all" : ""}`}>
                  {slug === "all" ? "◈" : label.slice(0, 2)}
                </span>
                <span>{label}</span>
                <b>
                  {slug === "all"
                    ? feed.matches.length
                    : feed.matches.filter((m) => m.slug === slug).length}
                </b>
              </button>
            ))}
          </nav>
          <Link href="/tahminler" className="sidebar-note">
            <b>İddaa tahminleri</b>
          </Link>
        </aside>
        <div className="match-list-column">
          <div className="list-heading">
            <h3>Karşılaşmalar</h3>
            <span aria-live="polite">{visible.length} maç</span>
          </div>
          <div className="filter-tabs phases" aria-label="Maç durumu">
            {(Object.keys(phases) as Phase[]).map((key) => (
              <button
                key={key}
                aria-pressed={phase === key}
                onClick={() => setPhase(key)}
              >
                {phases[key]}
              </button>
            ))}
          </div>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Takım veya lig ara"
              type="search"
              value={query}
              placeholder="Takım veya lig adı ara…"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="match-list" ref={list}>
            {groups.length ? (
              groups.map(([time, matches]) => (
                <section className="time-group" key={time}>
                  <h4>{time}</h4>
                  <ul>
                    {matches.map((m) => (
                      <li
                        key={m.id}
                        className={`match-card ${selected?.id === m.id ? "selected" : ""} ${m.state === "live" ? "is-live" : ""}`}
                      >
                        <button
                          className="match-select"
                          onClick={() => choose(m)}
                          aria-pressed={selected?.id === m.id}
                          aria-label={`${m.home.name} - ${m.away.name}, ${m.score || m.time}, ${m.channels.join(" ve ") || "kanal yok"}, detayları aç`}
                        >
                          <span
                            className={`channel-chip ${m.channels.length ? "known" : "unknown"}`}
                          >
                            <ChannelList channels={m.channels} />
                          </span>
                          <span className="match-time">
                            <b>{m.score || m.time}</b>
                            <small>
                              {m.state === "live" ? m.clock : "TSİ"}
                            </small>
                          </span>
                          <span className="match-teams">
                            <span>
                              <TeamLogo team={m.home} />
                              <b>{m.home.name}</b>
                            </span>
                            <span>
                              <TeamLogo team={m.away} />
                              <b>{m.away.name}</b>
                            </span>
                          </span>
                          <span className="match-meta">
                            <span>{m.league}</span>
                            <small>{m.status}</small>
                          </span>
                        </button>
                        <button
                          className="favorite"
                          aria-pressed={favorites.includes(m.id)}
                          aria-label={`${m.home.name} - ${m.away.name} favorilere ${favorites.includes(m.id) ? "çıkar" : "ekle"}`}
                          onClick={() => toggleFavorite(m.id)}
                        >
                          {favorites.includes(m.id) ? "★" : "☆"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            ) : (
              <div className="empty-state small">
                {!feed.fetchedAt ? (
                  <>
                    <span className="loader" />
                    <h3>Yükleniyor</h3>
                  </>
                ) : (
                  <>
                    <span>◈</span>
                    <h3>
                      {phase === "favorites"
                        ? "Henüz favori maçın yok."
                        : "Bu seçimde maç bulunamadı."}
                    </h3>
                    <button
                      className="secondary"
                      onClick={() => {
                        setLeague("all");
                        setPhase("all");
                        setQuery("");
                      }}
                    >
                      Filtreleri temizle
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <article className="match-detail" ref={panel}>
          {selected ? (
            <MatchDetail key={selected.id} match={selected} />
          ) : (
            <div className="empty-state">
              <h3>Maç seçilmedi</h3>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
function revealTab(button: HTMLElement) {
  const scroller = button.closest(".match-detail");
  const head = scroller?.querySelector(".detail-head");
  const tabs = button.closest(".detail-tabs");
  if (
    !(scroller instanceof HTMLElement) ||
    !(head instanceof HTMLElement) ||
    !(tabs instanceof HTMLElement)
  )
    return;
  const overflow = getComputedStyle(scroller).overflowY;
  if (overflow !== "auto" && overflow !== "scroll") return;
  const delta =
    tabs.getBoundingClientRect().top - head.getBoundingClientRect().bottom;
  scroller.scrollTop += delta;
  const headerBottom =
    document.querySelector(".site-header")?.getBoundingClientRect().bottom ??
    0;
  const lift = Math.max(
    0,
    scroller.getBoundingClientRect().top - headerBottom - 12,
  );
  if (lift > 0) {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollBy(0, lift);
    root.style.scrollBehavior = previous;
  }
}
function MatchDetail({ match: m }: { match: Match }) {
  const [tab, setTab] = useState<"overview" | "stats" | "lineup" | "odds">(
      "overview",
    ),
    [detail, setDetail] = useState<Detail | null>(null),
    [error, setError] = useState(""),
    [odds, setOdds] = useState<{ rows: Odds[]; fetchedAt: number } | null>(
      null,
    ),
    [oddsError, setOddsError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      try {
        const response = await fetch(`/api/matches/${m.id}?date=${m.date}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Detay alınamadı.");
        setDetail(data);
        setError("");
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Detay alınamadı.");
      }
    }
    run();
    const timer = setInterval(() => {
      if (m.state === "live" && document.visibilityState === "visible") run();
    }, 45000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [m.id, m.date, m.state]);
  useEffect(() => {
    if (tab !== "odds" || odds) return;
    const controller = new AbortController();
    fetch(`/api/matches/${m.id}?date=${m.date}&view=odds`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setOdds(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setOddsError(e.message || "Oran alınamadı.");
      });
    return () => controller.abort();
  }, [tab, odds, m.id, m.date]);
  return (
    <>
      <div className="detail-head">
      <div className="detail-label">
        <span>MAÇ DETAYI</span>
        <span>Futbol / {m.league}</span>
      </div>
      <div className="scoreboard">
        <div>
          <TeamLogo team={m.home} large />
          <h3>{m.home.name}</h3>
        </div>
        <div className="scoreboard-center">
          <b>{m.score || m.time}</b>
          {m.state === "live" ? (
            <span className="live-label">● {m.clock || "Canlı"}</span>
          ) : (
            <Countdown kickoff={m.kickoff} state={m.state} />
          )}
          <small>{m.league}</small>
          <span className="status-pill">{m.status}</span>
        </div>
        <div>
          <TeamLogo team={m.away} large />
          <h3>{m.away.name}</h3>
        </div>
      </div>
      <div
        className={`broadcast ${m.channels.length ? "known" : "unknown"}`}
      >
        <span>Kanal</span>
        {m.channels.length ? (
          <b>
            <ChannelList channels={m.channels} />
          </b>
        ) : (
          <b>Kanal yok</b>
        )}
      </div>
      </div>
      {m.place || detail?.officials.length ? (
        <div className="match-facts">
          {m.place ? <span>⌖ {m.place}</span> : null}
          {detail?.officials.length ? (
            <span>◌ {detail.officials.join(" · ")}</span>
          ) : null}
        </div>
      ) : null}
      <DeskTalk match={m} detail={detail} />
      <div className="detail-tabs" role="tablist" aria-label="Maç detayları">
        {Object.entries({
          overview: "Genel bakış",
          stats: "İstatistik",
          lineup: "Kadro",
          odds: "Oranlar",
        }).map(([key, label]) => (
          <button
            id={`tab-${key}`}
            role="tab"
            aria-selected={tab === key}
            aria-controls="detail-content"
            key={key}
            tabIndex={tab === key ? 0 : -1}
            onMouseDown={(e) => {
              if (e.button === 0) e.preventDefault();
            }}
            onClick={(e) => {
              setTab(key as typeof tab);
              revealTab(e.currentTarget);
            }}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
                return;
              e.preventDefault();
              const keys = ["overview", "stats", "lineup", "odds"] as const;
              const idx = keys.indexOf(tab);
              const next =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? 3
                    : (idx + (e.key === "ArrowRight" ? 1 : 3)) % 4;
              setTab(keys[next]);
              const nextButton = document.getElementById(`tab-${keys[next]}`);
              if (!(nextButton instanceof HTMLButtonElement)) return;
              const scroller = nextButton.closest(".match-detail");
              const scrolls =
                scroller instanceof HTMLElement &&
                ["auto", "scroll"].includes(getComputedStyle(scroller).overflowY);
              nextButton.focus({ preventScroll: scrolls });
              if (scrolls) revealTab(nextButton);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id="detail-content"
        className="detail-content"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
      >
        {tab === "odds" ? (
          <>
            <h3>İddaa oranları</h3>
            {!odds && !oddsError ? (
              <p className="muted">
                <span className="loader" /> Bültenler kontrol ediliyor…
              </p>
            ) : odds?.rows.length ? (
              odds.rows.map((row) => (
                <div className="odds-book" key={row.source}>
                  <h4>{row.source}</h4>
                  <div className="odds-grid">
                    {[
                      ["1", row.one],
                      ["X", row.draw],
                      ["2", row.two],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <b>{value}</b>
                      </div>
                    ))}
                  </div>
                  {row.under && row.over ? (
                    <p>
                      2,5 alt: {row.under} · üst: {row.over}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="muted">
                {oddsError || "Oran yok."}
              </p>
            )}
            <p className="muted">
              18+ · Oranlar değişebilir. Bahis tavsiyesi değildir.
            </p>
          </>
        ) : !detail && !error ? (
          <div className="detail-loading" role="status">
            <span className="loader" /> Maç ayrıntıları getiriliyor…
          </div>
        ) : error ? (
          <p className="muted">{error}</p>
        ) : detail ? (
          <>
            {tab === "overview" ? (
              <>
                {detail.events.length ? (
                  <section>
                    <h3>Maçın anları</h3>
                    <ol className="timeline">
                      {detail.events.map((e, i) => (
                        <li key={i}>
                          <b>{e.minute}</b>
                          <span>{e.text}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                ) : null}
                {detail.lastGames.length ? (
                  <section>
                    <h3>Son 5 maç</h3>
                    <div className="two-columns">
                      {detail.lastGames.map((t) => (
                        <div className="subcard" key={t.name}>
                          <h4>{t.name}</h4>
                          <ul className="recent-games">
                            {t.rows.map((r, i) => (
                              <li key={i}>
                                <b className={`form-${r.result}`}>
                                  {r.result === "W"
                                    ? "G"
                                    : r.result === "L"
                                      ? "M"
                                      : "B"}
                                </b>
                                <time>
                                  {r.date ? dayLabel(dayOf(r.date), true) : ""}
                                </time>
                                <span>{r.opponent}</span>
                                <strong>{r.score}</strong>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
                {[m.home, m.away].some((t) => t.record || t.form) ? (
                  <section>
                    <h3>Sezon özeti</h3>
                    <div className="two-columns">
                      {[m.home, m.away]
                        .filter((t) => t.record || t.form)
                        .map((t) => (
                          <div className="subcard" key={t.name}>
                            <h4>{t.name}</h4>
                            {t.record ? (
                              <p className="muted">G-B-M: {t.record}</p>
                            ) : null}
                            {t.form ? (
                              <p className="form-row">
                                {[...t.form].map((v, i) => (
                                  <b key={i} className={`form-${v}`}>
                                    {v === "W" ? "G" : v === "L" ? "M" : "B"}
                                  </b>
                                ))}
                              </p>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </section>
                ) : null}
              </>
            ) : tab === "stats" ? (
              detail.stats.length ? (
                <section>
                  <h3>Maç ve sezon istatistikleri</h3>
                  {detail.stats.map((s) => (
                    <div className="stat-row" key={s.label}>
                      <b>{s.home}</b>
                      <span>{s.label}</span>
                      <b>{s.away}</b>
                    </div>
                  ))}
                </section>
              ) : null
            ) : detail.lineups.some((t) => t.players.length) ? (
              <section>
                <h3>Kadro</h3>
                <div className="two-columns">
                  {detail.lineups.map((t) => (
                    <div className="subcard" key={t.name}>
                      <h4>
                        {t.name} {t.formation}
                      </h4>
                      <ul className="lineup-list">
                        {t.players.map((p, i) => (
                          <li key={i}>
                            <b>{p.number || "—"}</b>
                            <span>
                              {p.name}
                              {!p.starter ? <small>Yedek</small> : null}
                            </span>
                            <small>{p.position}</small>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
function Countdown({
  kickoff,
  state,
}: {
  kickoff: string;
  state: Match["state"];
}) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    if (state !== "pre") return;
    const update = () => {
      const seconds = Math.max(
        0,
        Math.floor((new Date(kickoff).getTime() - Date.now()) / 1000),
      );
      setRemaining(
        seconds > 0
          ? `${Math.floor(seconds / 3600)
              .toString()
              .padStart(2, "0")}:${Math.floor((seconds % 3600) / 60)
              .toString()
              .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`
          : "",
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [kickoff, state]);
  return remaining ? (
    <span className="countdown">
      <small>BAŞLAMASINA</small>
      <b>{remaining}</b>
    </span>
  ) : null;
}
