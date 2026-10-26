import type { MetadataRoute } from "next";
import { getSettings, siteOrigin } from "@/lib/content";
export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const s = await getSettings();
  return {
    rules: {
      userAgent: "*",
      ...(s.indexable
        ? { allow: "/", disallow: ["/admin", "/api/"] }
        : { disallow: "/" }),
    },
    sitemap: siteOrigin(s) + "/sitemap.xml",
  };
}
