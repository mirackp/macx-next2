"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Settings } from "@/lib/types";

const socials: {
  key: "youtubeUrl" | "instagramUrl" | "tiktokUrl" | "xUrl";
  label: string;
  icon: ReactNode;
}[] = [
  {
    key: "instagramUrl",
    label: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="3.5"
          y="3.5"
          width="17"
          height="17"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle
          cx="12"
          cy="12"
          r="3.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "youtubeUrl",
    label: "YouTube",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M4 7.2h16a2 2 0 0 1 2 2v5.6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.2a2 2 0 0 1 2-2zm6.1 1.8v6l4.8-3-4.8-3z"
        />
      </svg>
    ),
  },
  {
    key: "tiktokUrl",
    label: "TikTok",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M14 3.2v10.1a3.3 3.3 0 1 1-2.3-3.1V8.1a5.5 5.5 0 1 0 5.5 5.5V8.4a6.4 6.4 0 0 0 3.6 1.2V7.3a4 4 0 0 1-3.8-2.6A4 4 0 0 1 14 3.2z"
        />
      </svg>
    ),
  },
  {
    key: "xUrl",
    label: "X",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M5 4.5h3.1l3.4 4.6L15.2 4.5H19l-5.1 6.2L19.4 19.5h-3.1l-3.7-5-3.9 5H5.2l5.4-6.6L5 4.5zm2.3 1.4 8.8 12.2h1.5L8.8 5.9H7.3z"
        />
      </svg>
    ),
  },
];

export function Header({
  name,
  settings,
}: {
  name: string;
  settings: Settings;
}) {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <div className="header-social" role="group" aria-label="Sosyal medya">
        {socials.map((item) => {
          const url = settings[item.key];
          return url ? (
            <a
              key={item.key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.label}
            >
              {item.icon}
            </a>
          ) : (
            <span key={item.key} role="img" aria-label={item.label}>
              {item.icon}
            </span>
          );
        })}
      </div>
      <div className="header-bar">
        <Link href="/" className="brand" aria-label={`${name} ana sayfa`}>
          <Image
            src="/images/logo.png"
            alt="MacX"
            width={2752}
            height={1536}
            priority
          />
          <small>Hangi kanalda</small>
        </Link>
        <nav aria-label="Ana menü">
          {[
            ["/", "Maç merkezi"],
            ["/studyo", "MacX stüdyo"],
            ["/tahminler", "İddaa tahminleri"],
          ].map(([href, label]) => (
            <Link
              href={href}
              key={href}
              aria-current={pathname === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
