import crypto from "node:crypto";
import { cookies } from "next/headers";

const STUDENT_COOKIE = "korlance_student_session";
const ADMIN_COOKIE = "korlance_admin_session";

function getSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    "korlance-fallback-dev-secret-please-set-SESSION_SECRET"
  );
}

interface TokenPayload {
  sub: string;
  role: "student" | "admin";
  email?: string;
  exp: number;
}

function signPayload(payload: TokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

function verifyToken(token: string | undefined): TokenPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as TokenPayload;
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setStudentSession(studentId: string, email: string) {
  const token = signPayload({
    sub: studentId,
    role: "student",
    email,
    exp: Date.now() + 6 * 60 * 60 * 1000, // 6 hours
  });
  const cookieStore = await cookies();
  cookieStore.set(STUDENT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 6 * 60 * 60,
  });
}

export async function getStudentSession(): Promise<{
  studentId: string;
  email: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDENT_COOKIE)?.value;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "student" || !payload.email) return null;
  return { studentId: payload.sub, email: payload.email };
}

export async function clearStudentSession() {
  const cookieStore = await cookies();
  cookieStore.delete(STUDENT_COOKIE);
}

export async function setAdminSession(username: string) {
  const token = signPayload({
    sub: username,
    role: "admin",
    exp: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
  });
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
}

export async function getAdminSession(): Promise<{ username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return { username: payload.sub };
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

export function safeCompareStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
