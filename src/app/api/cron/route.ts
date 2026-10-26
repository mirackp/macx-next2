import { NextRequest, NextResponse } from "next/server";
import { safeEqual } from "@/lib/auth";
import { dayOf, offsetDay } from "@/lib/dates";
import { refreshFeed } from "@/lib/feed";
import { refreshTV, refreshOdds } from "@/lib/extras";
import { listDocs, deleteDoc } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    secret.length < 24 ||
    !safeEqual(request.headers.get("authorization") || "", `Bearer ${secret}`)
  )
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const today = dayOf();
  const results = await Promise.allSettled([
    refreshFeed(today),
    refreshFeed(offsetDay(today, 1)),
    refreshTV(today),
    refreshOdds(),
  ]);
  const sessions = await listDocs<{ key: string; expires: number }>("session:");
  await Promise.all(
    sessions.filter((s) => s.expires < Date.now()).map((s) => deleteDoc(s.key)),
  );
  return NextResponse.json({
    ok: results.every((r) => r.status === "fulfilled"),
    updatedAt: Date.now(),
  });
}
