import { NextResponse } from "next/server";
import {
  clearAdminSession,
  getAdminSession,
  safeCompareStrings,
  setAdminSession,
} from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, username: session.username });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`admin-login:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    username?: string;
    password?: string;
  } | null;

  const username = body?.username?.trim() ?? "";
  const password = body?.password ?? "";

  const expectedUser = process.env.ADMIN_USER || "korlance_admin";
  const expectedPass = process.env.ADMIN_PASSWORD || "Korlance@2026";

  if (
    !safeCompareStrings(username, expectedUser) ||
    !safeCompareStrings(password, expectedPass)
  ) {
    return NextResponse.json(
      { error: "Invalid admin username or password." },
      { status: 401 }
    );
  }

  await setAdminSession(username);
  return NextResponse.json({ ok: true, username });
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
