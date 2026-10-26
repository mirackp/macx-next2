import type { Metadata } from "next";
import { getSettings, siteOrigin } from "@/lib/content";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Integrations } from "@/components/Integrations";
import "./globals.css";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteOrigin(s)),
    title: { default: s.title, template: `%s · ${s.siteName}` },
    description: s.description,
    robots: s.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    icons: { icon: "/images/logo.png" },
    verification: s.googleVerification
      ? { google: s.googleVerification }
      : undefined,
    openGraph: {
      title: s.title,
      description: s.description,
      type: "website",
      locale: "tr_TR",
      siteName: s.siteName,
      images: [
        {
          url: "/images/studio.webp",
          width: 1600,
          height: 800,
          alt: "MacX futbol stüdyosu",
        },
      ],
    },
    twitter: { card: "summary_large_image" },
  };
}
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await getSettings();
  return (
    <html lang="tr">
      <body>
        <Integrations settings={s}>
          <div className="shell">
            <a className="skip" href="#content">
              İçeriğe geç
            </a>
            <Header name={s.siteName} settings={s} />
            <main id="content">{children}</main>
            <Footer settings={s} />
          </div>
        </Integrations>
      </body>
    </html>
  );
}
