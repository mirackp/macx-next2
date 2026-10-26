import { NextRequest, NextResponse, after } from "next/server";
import { validDay } from "@/lib/dates";
import { readFeed, refreshFeed } from "@/lib/feed";
import { attachChannels, refreshTV } from "@/lib/extras";
import { storageReady } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const date = validDay(request.nextUrl.searchParams.get("date"));
  if (!storageReady())
    return NextResponse.json(
      {
        date,
        matches: [],
        fetchedAt: 0,
        stale: true,
        errors: ["Maç servisi için veritabanı kurulumu henüz tamamlanmadı."],
      },
      { status: 503 },
    );
  try {
    const feed = await readFeed(date);
    if (feed.stale && (!feed.retryAt || Date.now() > feed.retryAt))
      after(async () => {
        await Promise.allSettled([refreshFeed(date), refreshTV(date)]);
      });
    const matches = await attachChannels(feed.matches, date);
    return NextResponse.json(
      { ...feed, matches },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        date,
        matches: [],
        fetchedAt: 0,
        stale: true,
        errors: ["Veritabanına ulaşılamıyor. Lütfen kısa süre sonra deneyin."],
      },
      { status: 503 },
    );
  }
}
