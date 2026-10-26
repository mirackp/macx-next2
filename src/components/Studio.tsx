import type { CSSProperties } from "react";
import Link from "next/link";
import { cast } from "@/lib/cast";

const deskOrder = ["tilki", "karga", "kertenkele", "kaplumbaga", "kedi"];
export function StudioImage({ priority = false }: { priority?: boolean }) {
  return (
    <picture>
      <source media="(max-width: 600px)" srcSet="/images/studio-small.webp" />
      <img
        src="/images/studio.webp"
        width={1600}
        height={800}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        alt="Tilki, karga, takım elbiseli kertenkele moderatör, kaplumbağa ve kedi MacX futbol masasında"
      />
    </picture>
  );
}
export function Hero() {
  const people = deskOrder.map(
    (id) => cast.find((person) => person.id === id)!,
  );
  return (
    <section className="purpose">
      <div className="purpose-copy">
        <h1>Bugün hangi kanalda?</h1>
        <h2>
          Maç merkezi<span>.</span>
        </h2>
      </div>
      <div className="cast-strip">
        {people.map((person) => (
          <Link
            key={person.id}
            href={`/studyo#${person.id}`}
            className={person.id === "kertenkele" ? "host" : undefined}
          >
            <span
              className="avatar"
              style={{ "--position": person.position } as CSSProperties}
              aria-hidden="true"
            />
            <span>
              <small>{person.role}</small>
              <b>{person.name}</b>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
export function Roster() {
  return (
    <div className="cast-grid">
      {cast.map((c, i) => (
        <article
          className={`person ${i === 0 ? "host" : ""}`}
          key={c.id}
          id={c.id}
        >
          <div
            className="portrait"
            role="img"
            aria-label={`${c.name}, ${c.role}`}
            style={{ "--position": c.position } as CSSProperties}
          />
          <div className="person-copy">
            <span className="eyebrow">
              {String(i + 1).padStart(2, "0")} / {c.role}
            </span>
            <h3>{c.name}</h3>
          </div>
        </article>
      ))}
    </div>
  );
}
