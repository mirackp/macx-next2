"use client";
import { useState } from "react";
import type { Prediction } from "@/lib/types";
import { resultLabels } from "@/lib/cast";
import { dayLabel } from "@/lib/dates";
export function Predictions({ rows }: { rows: Prediction[] }) {
  const [filter, setFilter] = useState("all");
  const visible = rows.filter((r) => filter === "all" || r.result === filter);
  return (
    <>
      <nav className="filter-tabs" aria-label="Tahmin sonuçları">
        {Object.entries({ all: "Tümü", ...resultLabels }).map(
          ([key, label]) => (
            <button
              key={key}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ),
        )}
      </nav>
      {visible.length ? (
        <div className="prediction-grid">
          {visible.map((r) => (
            <article className="prediction-card" key={r.id}>
              <div className="prediction-top">
                <span>{r.league || "Futbol"}</span>
                <span className={`result-${r.result}`}>
                  {resultLabels[r.result]}
                </span>
              </div>
              <h2>
                {r.home}
                <br />
                <small>vs</small> {r.away}
              </h2>
              <time dateTime={r.date + "+03:00"}>
                {dayLabel(r.date.slice(0, 10), true)} · {r.date.slice(11)} TSİ
              </time>
              <div className="prediction-pick">
                {r.pick}
                {r.odds ? <span>Oran {r.odds}</span> : null}
              </div>
              <p>{r.analysis}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span>✦</span>
          <h2>Henüz yayınlanmış tahmin yok</h2>
        </div>
      )}
    </>
  );
}
