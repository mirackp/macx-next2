import { NextRequest, NextResponse } from "next/server";
import { validDay } from "@/lib/dates";
import { readFeed } from "@/lib/feed";
import { getDetail } from "@/lib/details";
import { oddsFor } from "@/lib/extras";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[es]\d{1,16}$/.test(id))
    return NextResponse.json({ error: "Maç bulunamadı." }, { status: 404 });
  try {
    const feed = await readFeed(
      validDay(request.nextUrl.searchParams.get("date")),
    );
    const match = feed.matches.find((m) => m.id === id);
    if (!match)
      return NextResponse.json({ error: "Maç bulunamadı." }, { status: 404 });
    if (request.nextUrl.searchParams.get("view") === "odds")
      return NextResponse.json(await oddsFor(match), {
        headers: { "Cache-Control": "private, max-age=30" },
      });
    return NextResponse.json(await getDetail(id, match.slug), {
      headers: { "Cache-Control": "private, max-age=20" },
    });
  } catch {
    return NextResponse.json(
      { error: "Maç ayrıntıları şu an alınamadı." },
      { status: 502 },
    );
  }
}
