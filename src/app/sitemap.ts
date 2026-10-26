import type { MetadataRoute } from "next";
import { getSettings, siteOrigin } from "@/lib/content";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const s = await getSettings(),
    origin = siteOrigin(s);
  return [
    { url: origin + "/", changeFrequency: "hourly", priority: 1 },
    { url: origin + "/studyo", changeFrequency: "monthly", priority: 0.8 },
    { url: origin + "/tahminler", changeFrequency: "daily", priority: 0.9 },
  ];
}
