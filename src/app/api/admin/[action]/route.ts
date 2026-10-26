import { NextRequest, NextResponse, after } from "next/server";
import {
  authConfigured,
  login,
  currentSession,
  requireAdmin,
  readJson,
  checkOrigin,
  secureCookie,
  COOKIE,
  logout,
  changePassword,
} from "@/lib/auth";
import {
  getSettings,
  getPredictions,
  validateSettings,
  validatePrediction,
  saveSettings,
} from "@/lib/content";
import { setDoc, deleteDoc } from "@/lib/store";
import { dayOf } from "@/lib/dates";
import { refreshFeed } from "@/lib/feed";
import { refreshTV, refreshOdds } from "@/lib/extras";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ action: string }> };
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(_request: NextRequest, context: Context) {
  const { action } = await context.params;
  if (action !== "state") return json({ error: "Bulunamadı." }, 404);
  try {
    const session = await currentSession();
    if (!session)
      return json({ authenticated: false, configured: authConfigured() });
    const [settings, predictions] = await Promise.all([
      getSettings(),
      getPredictions(false),
    ]);
    return json({
      authenticated: true,
      configured: true,
      csrf: session.csrf,
      username: session.username,
      settings,
      predictions,
    });
  } catch {
    return json({ error: "Veritabanı bağlantısını kontrol edin." }, 503);
  }
}
export async function POST(request: NextRequest, context: Context) {
  const { action } = await context.params;
  try {
    if (action === "login") {
      checkOrigin(request);
      const data = await readJson(request);
      if (
        typeof data.username !== "string" ||
        typeof data.password !== "string" ||
        data.username.length > 64 ||
        data.password.length > 200
      )
        return json({ error: "Geçersiz giriş." }, 400);
      const ip =
        request.headers.get("x-real-ip") ||
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        "unknown";
      const result = await login(data.username.trim(), data.password, ip);
      const response = json({ ok: true });
      response.cookies.set(COOKIE, result.token, {
        httpOnly: true,
        secure: secureCookie(request),
        sameSite: "strict",
        path: "/",
        maxAge: 8 * 3600,
      });
      return response;
    }
    const session = await requireAdmin(request);
    if (action === "logout") {
      await logout(session);
      const response = json({ ok: true });
      response.cookies.set(COOKIE, "", { maxAge: 0, path: "/" });
      return response;
    }
    const data = await readJson(request);
    if (action === "settings") {
      const settings = validateSettings(data);
      await saveSettings(settings);
      return json({ ok: true, settings });
    }
    if (action === "predictions") {
      const prediction = validatePrediction(data);
      await setDoc("prediction:" + prediction.id, prediction);
      return json({ ok: true, prediction });
    }
    if (action === "delete-prediction") {
      if (typeof data.id !== "string" || !/^[a-zA-Z0-9-]{8,64}$/.test(data.id))
        return json({ error: "Geçersiz kayıt." }, 400);
      await deleteDoc("prediction:" + data.id);
      return json({ ok: true });
    }
    if (action === "password") {
      if (typeof data.current !== "string" || typeof data.password !== "string")
        throw new Error("Parolaları doldurun.");
      await changePassword(session, data.current, data.password);
      const response = json({ ok: true });
      response.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
      return response;
    }
    if (action === "refresh") {
      after(async () => {
        await Promise.allSettled([
          refreshFeed(dayOf()),
          refreshTV(dayOf()),
          refreshOdds(),
        ]);
      });
      return json({ ok: true, message: "Veri yenileme başlatıldı." });
    }
    return json({ error: "İşlem bulunamadı." }, 404);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "İşlem tamamlanamadı.";
    const allowed =
      /Geçersiz|gerekli|hatalı|olmalı|HTTPS|Çok fazla|Oturum|MySQL|APP_SECRET|İstek|Site adı|Site adresi|Parola|Oran|ADMIN_|JSON/;
    return json(
      {
        error: allowed.test(message)
          ? message
          : "İşlem tamamlanamadı. Sunucu/veritabanı ayarlarını kontrol edin.",
      },
      message.includes("Oturum") ? 401 : 400,
    );
  }
}
