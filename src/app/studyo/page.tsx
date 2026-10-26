import Link from "next/link";
import { StudioImage, Roster } from "@/components/Studio";
import { getSettings, siteOrigin } from "@/lib/content";
import { SocialLinks } from "@/components/Footer";
export async function generateMetadata() {
  const s = await getSettings();
  return {
    title: "MacX stüdyo",
    description: "MacX stüdyo kadrosu.",
    alternates: { canonical: siteOrigin(s) + "/studyo" },
  };
}
export default async function StudioPage() {
  const s = await getSettings();
  return (
    <>
      <section className="page-intro">
        <h1>MacX stüdyo</h1>
      </section>
      <figure className="studio-stage">
        <StudioImage priority />
      </figure>
      <section id="kadro">
        <div className="section-title">
          <div>
            <h2>
              MacX kadrosu<span>.</span>
            </h2>
          </div>
        </div>
        <Roster />
      </section>
      <section className="follow">
        <div className="actions">
          <Link href="/" className="primary">
            Maç merkezine dön ↗
          </Link>
          <Link href="/tahminler" className="secondary">
            İddaa tahminleri ↗
          </Link>
        </div>
        <SocialLinks settings={s} />
      </section>
    </>
  );
}
