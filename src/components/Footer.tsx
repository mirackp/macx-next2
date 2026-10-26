import Link from "next/link";
import type { Settings } from "@/lib/types";
import { CookieButton } from "./Integrations";
export function SocialLinks({ settings: s }: { settings: Settings }) {
  const items = [
    [s.youtubeUrl, "YouTube"],
    [s.instagramUrl, "Instagram"],
    [s.tiktokUrl, "TikTok"],
    [s.xUrl, "X"],
  ].filter(([url]) => Boolean(url));
  if (!items.length) return null;
  return (
    <nav className="social" aria-label="Sosyal medya">
      {items.map(([url, label]) => (
        <a href={url} key={label} target="_blank" rel="noopener noreferrer">
          {label} ↗
        </a>
      ))}
    </nav>
  );
}
export function Footer({ settings }: { settings: Settings }) {
  return (
    <footer className="site-footer">
      <SocialLinks settings={settings} />
      <div>
        <span>{settings.siteName}</span>
        <Link href="/gizlilik">Gizlilik</Link>
        <CookieButton />
      </div>
      <p>
        Saatler Türkiye saati. Maç, kadro, yayın ve oran bilgileri yalnızca
        kaynakta varsa gösterilir. Tahminler sonuç veya kazanç garantisi
        içermez.
      </p>
    </footer>
  );
}
