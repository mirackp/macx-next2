import type { CSSProperties } from "react";
import { matchRemarks } from "@/lib/commentary";
import type { Detail, Match } from "@/lib/types";

export function DeskTalk({
  match,
  detail,
}: {
  match: Match;
  detail: Detail | null;
}) {
  const remarks = matchRemarks(match, detail).filter((r) => r.line.trim());
  if (!remarks.length) return null;
  return (
    <section className="desk" aria-label="Masa yorumu">
      <h3>Masa</h3>
      <ol>
        {remarks.map((r) => (
          <li key={r.id} className={r.id === "kertenkele" ? "host" : undefined}>
            <span
              className="avatar"
              style={{ "--position": r.position } as CSSProperties}
              aria-hidden="true"
            />
            <span>
              <small>{r.role}</small>
              <b>{r.name}</b>
              <p>{r.line}</p>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
