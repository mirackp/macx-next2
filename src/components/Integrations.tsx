"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Settings } from "@/lib/types";
type Choice = "accepted" | "rejected" | null;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    adsbygoogle?: unknown[];
  }
}
const ConsentContext = createContext({ accepted: false, adsReady: false });
export function Integrations({
  settings: s,
  children,
}: {
  settings: Settings;
  children: React.ReactNode;
}) {
  const [choice, setChoice] = useState<Choice>(null),
    [open, setOpen] = useState(false),
    [adsReady, setAdsReady] = useState(false);
  const started = useRef(false),
    loaded = useRef(false);
  const configured = Boolean(s.gaId || s.adsenseId);
  useEffect(() => {
    let stored: Choice = null;
    try {
      const value = localStorage.getItem("macx-consent-v2");
      if (value === "accepted" || value === "rejected") stored = value;
    } catch {}
    setChoice(stored);
    setOpen(!stored && configured);
    const show = () => setOpen(true);
    window.addEventListener("macx:preferences", show);
    return () => window.removeEventListener("macx:preferences", show);
  }, [configured]);
  useEffect(() => {
    if (choice !== "accepted" || started.current) return;
    started.current = true;
    loaded.current = true;
    if (/^G-[A-Z0-9]+$/.test(s.gaId)) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = (...args) => window.dataLayer!.push(args);
      window.gtag("js", new Date());
      window.gtag("config", s.gaId);
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(s.gaId)}`;
      document.head.append(script);
    }
    if (/^ca-pub-\d{16}$/.test(s.adsenseId)) {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(s.adsenseId)}`;
      script.onload = () => setAdsReady(true);
      document.head.append(script);
    }
  }, [choice, s.gaId, s.adsenseId]);
  function decide(value: Choice) {
    try {
      if (value) localStorage.setItem("macx-consent-v2", value);
    } catch {}
    setOpen(false);
    setChoice(value);
    if (value === "rejected" && loaded.current) location.reload();
  }
  return (
    <ConsentContext.Provider
      value={{ accepted: choice === "accepted", adsReady }}
    >
      {children}
      {open ? (
        <section
          className="consent"
          role="dialog"
          aria-modal="false"
          aria-label="Çerez tercihleri"
        >
          <div>
            <b>Çerezler</b>
            <p>
              {configured
                ? "İzninle Google Analytics ve reklam hizmetlerini kullanıyoruz. Reddedersen bu hizmetler yüklenmez."
                : "Şu anda Google ölçüm veya reklam hizmeti tanımlı değil."}{" "}
              <a href="/gizlilik">Gizlilik metni</a>
            </p>
          </div>
          <div className="actions">
            <button onClick={() => decide("rejected")} className="secondary">
              Reddet
            </button>
            <button onClick={() => decide("accepted")} className="primary">
              Kabul et
            </button>
          </div>
        </section>
      ) : null}
    </ConsentContext.Provider>
  );
}
export function CookieButton() {
  return (
    <button
      className="text-button"
      onClick={() => window.dispatchEvent(new Event("macx:preferences"))}
    >
      Çerez tercihleri
    </button>
  );
}
export function Advertising({ settings: s }: { settings: Settings }) {
  const { accepted, adsReady } = useContext(ConsentContext),
    element = useRef<HTMLModElement>(null),
    pushed = useRef(false);
  useEffect(() => {
    if (accepted && adsReady && element.current && !pushed.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      } catch {}
    }
  }, [accepted, adsReady]);
  return (
    <>
      {s.adImage ? (
        <aside className="advert">
          <small>REKLAM</small>
          <a href={s.adUrl || "#"} rel="sponsored noopener noreferrer">
            <img src={s.adImage} alt={s.adLabel || "Reklam"} loading="lazy" />
          </a>
        </aside>
      ) : null}
      {accepted && s.adsenseId && s.adSlot ? (
        <aside className="advert">
          <small>REKLAM</small>
          <ins
            ref={element}
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={s.adsenseId}
            data-ad-slot={s.adSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </aside>
      ) : null}
    </>
  );
}
