import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { ObjectId } from "mongodb";
import { col } from "@/db";
import { HttpError } from "./http";
import { hashPassword, verifyPassword } from "./password";
import type { Role, SessionUser } from "./types";

const COOKIE = "ads_session";
const MAX_AGE = 60 * 60 * 12; // 12h
const SECRET = process.env.SESSION_SECRET || "dev-only-secret-change-me-for-production";

export { hashPassword, verifyPassword };

function sign(data: string) {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

function makeToken(uid: string) {
  const payload = Buffer.from(JSON.stringify({ uid, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid: string; exp: number };
    return exp > Date.now() && ObjectId.isValid(uid) ? uid : null;
  } catch {
    return null;
  }
}

export async function startSession(uid: string) {
  const h = await headers();
  const secure = h.get("x-forwarded-proto") === "https";
  (await cookies()).set(COOKIE, makeToken(uid), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const uid = readToken((await cookies()).get(COOKIE)?.value);
  if (!uid) return null;
  const u = await col.users.findOne({ _id: new ObjectId(uid) });
  if (!u) return null;
  return {
    id: u._id.toHexString(),
    username: u.username,
    name: u.name,
    role: u.role as Role,
    sponsorId: u.sponsorId?.toHexString() ?? null,
  };
});

/** Per-request memoization: React cache() persists across the whole RSC render,
 * but route handlers on the same request scope can reuse a stale value after
 * logout within the same connection. Force fresh reads in route handlers. */
export async function getSessionFresh(): Promise<SessionUser | null> {
  const uid = readToken((await cookies()).get(COOKIE)?.value);
  if (!uid) return null;
  const u = await col.users.findOne({ _id: new ObjectId(uid) });
  if (!u) return null;
  return {
    id: u._id.toHexString(),
    username: u.username,
    name: u.name,
    role: u.role as Role,
    sponsorId: u.sponsorId?.toHexString() ?? null,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const s = await getSessionFresh();
  if (!s) throw new HttpError(401, "Please sign in to continue.");
  return s;
}

export async function requireAdmin(): Promise<SessionUser> {
  const s = await requireUser();
  if (s.role !== "admin") throw new HttpError(403, "You do not have access to this resource.");
  return s;
}
