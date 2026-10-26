import { Hero } from "@/components/Studio";
import { MatchCenter } from "@/components/MatchCenter";
import { Advertising } from "@/components/Integrations";
import { getSettings, siteOrigin } from "@/lib/content";
import { validDay } from "@/lib/dates";
import { readFeed } from "@/lib/feed";
import { attachChannels } from "@/lib/extras";
export async function generateMetadata() {
  const s = await getSettings();
  return { alternates: { canonical: siteOrigin(s) } };
}
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams,
    date = validDay(search.d);
  const [settings, feed] = await Promise.all([getSettings(), readFeed(date)]);
  const initial = {
    ...feed,
    matches: await attachChannels(feed.matches, date),
  };
  const structured = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.siteName,
    url: siteOrigin(settings),
    description: settings.description,
    inLanguage: "tr-TR",
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
        }}
      />
      <Hero />
      <Advertising settings={settings} />
      <MatchCenter
        key={date}
        initial={initial}
        initialId={typeof search.m === "string" ? search.m : ""}
      />
    </>
  );
}
