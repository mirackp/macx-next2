import {
  randomBytes,
  createHmac,
  timingSafeEqual,
  scrypt as scryptCallback,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { compare } from "bcryptjs";
import {
  getDoc,
  insertDoc,
  setDoc,
  deleteDoc,
  mutateDoc,
  storageReady,
} from "./store";
const scrypt = promisify(scryptCallback);
export const COOKIE = "macx_session";
type Admin = { username: string; hash: string; version: number };
export type Session = {
  key: string;
  username: string;
  csrf: string;
  expires: number;
  version: number;
};
const digest = (v: string) =>
  createHmac("sha256", process.env.APP_SECRET || "macx-local-development")
    .update(v)
    .digest("hex");
export function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export function authConfigured() {
  return (
    storageReady() &&
    Boolean(process.env.APP_SECRET && process.env.APP_SECRET.length >= 32)
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  try {
    if (hash.startsWith("$2"))
      return await compare(password, hash.replace(/^\$2y\$/, "$2b$"));
    const [kind, salt, key] = hash.split(":");
    if (kind !== "scrypt" || !salt || !key) return false;
    const actual = (await scrypt(password, salt, 64)) as Buffer;
    return safeEqual(actual.toString("hex"), key);
  } catch {
    return false;
  }
}
export async function rateLimit(bucket: string, limit = 5, windowMs = 900000) {
  const key = "limit:" + digest(bucket);
  const now = Date.now();
  const row = await mutateDoc<{ count: number; expires: number }>(
    key,
    (current) => {
      if (!current || current.expires < now)
        return { count: 1, expires: now + windowMs };
      return { ...current, count: current.count + 1 };
    },
  );
  return row.count <= limit;
}
export function checkOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowed = new Set([new URL(request.url).origin]);
  if (process.env.APP_URL) allowed.add(new URL(process.env.APP_URL).origin);
  if (!origin || !allowed.has(origin))
    throw new Error("İstek kaynağı doğrulanamadı.");
}
export async function readJson(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new Error("JSON isteği gerekli.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Boş istek.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 65536) {
      await reader.cancel();
      throw new Error("İstek çok büyük.");
    }
    chunks.push(value);
  }
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("Geçersiz istek.");
  return body;
}
export async function login(username: string, password: string, ip: string) {
  if (!authConfigured())
    throw new Error("APP_SECRET ve MySQL ayarlarını tamamlayın.");
  if (!(await rateLimit("login:" + ip)))
    throw new Error("Çok fazla deneme. 15 dakika sonra deneyin.");
  let admin = await getDoc<Admin>("admin");
  if (!admin) {
    const expectedUser = process.env.ADMIN_USERNAME || "",
      expectedPassword = process.env.ADMIN_PASSWORD || "";
    if (expectedPassword.length < 12 || expectedUser.length < 3)
      throw new Error(
        "İlk hesap için ADMIN_USERNAME ve en az 12 karakterli ADMIN_PASSWORD gerekli.",
      );
    if (
      safeEqual(username, expectedUser) &&
      safeEqual(password, expectedPassword)
    ) {
      await insertDoc<Admin>("admin", {
        username: expectedUser,
        hash: await hashPassword(password),
        version: 1,
      });
      admin = await getDoc<Admin>("admin");
    }
  }
  if (
    !admin ||
    !safeEqual(admin.username, username) ||
    !(await verifyPassword(password, admin.hash))
  )
    throw new Error("Kullanıcı adı veya parola hatalı.");
  const token = randomBytes(32).toString("base64url"),
    key = "session:" + digest(token);
  const session: Session = {
    key,
    username: admin.username,
    csrf: randomBytes(32).toString("base64url"),
    expires: Date.now() + 8 * 3600000,
    version: admin.version,
  };
  await setDoc(key, session);
  return { token, session };
}
export async function currentSession(): Promise<Session | null> {
  if (!authConfigured()) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const key = "session:" + digest(token);
  const row = await getDoc<Session>(key);
  if (!row || row.expires < Date.now()) {
    if (row) await deleteDoc(key);
    return null;
  }
  const admin = await getDoc<Admin>("admin");
  return admin?.version === row.version ? row : null;
}
export async function requireAdmin(request: NextRequest) {
  checkOrigin(request);
  const session = await currentSession();
  if (!session) throw new Error("Oturum gerekli.");
  if (!safeEqual(request.headers.get("x-csrf-token") || "", session.csrf))
    throw new Error("Geçersiz güvenlik kodu.");
  return session;
}
export async function changePassword(
  session: Session,
  current: string,
  password: string,
) {
  const admin = await getDoc<Admin>("admin");
  if (!admin || !(await verifyPassword(current, admin.hash)))
    throw new Error("Mevcut parola hatalı.");
  if (password.length < 12 || password.length > 200)
    throw new Error("Parola 12–200 karakter olmalı.");
  await setDoc<Admin>("admin", {
    ...admin,
    hash: await hashPassword(password),
    version: admin.version + 1,
  });
  await deleteDoc(session.key);
}
export async function logout(session: Session) {
  await deleteDoc(session.key);
}
export function secureCookie(request: NextRequest) {
  return new URL(process.env.APP_URL || request.url).protocol === "https:";
}
