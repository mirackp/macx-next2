import { getSettings, getPredictions, siteOrigin } from "@/lib/content";
import { Predictions } from "@/components/Predictions";
import { Advertising } from "@/components/Integrations";
export async function generateMetadata() {
  const s = await getSettings();
  return {
    title: "İddaa tahminleri",
    description: s.predictionsIntro,
    alternates: { canonical: siteOrigin(s) + "/tahminler" },
  };
}
export default async function PredictionsPage() {
  const [s, rows] = await Promise.all([getSettings(), getPredictions()]);
  return (
    <>
      <section className="page-intro compact">
        <h1>
          İddaa tahminleri<span>.</span>
        </h1>
      </section>
      <p className="responsibility">
        18+ · Tahminler editör görüşüdür; sonuç veya kazanç garantisi içermez.
        Oranlar değişebilir.
      </p>
      <Advertising settings={s} />
      <Predictions rows={rows} />
    </>
  );
}
