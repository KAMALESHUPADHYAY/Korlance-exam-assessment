import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setStudentSession } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { finalizeExam } from "@/lib/exam";
import { isValidDomain } from "@/lib/domains";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`student-login:${ip}`, 15, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${rl.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      fullName?: string;
      email?: string;
      collegeName?: string;
      domain?: string;
    } | null;

    const fullName = body?.fullName?.trim() ?? "";
    const email = body?.email?.trim().toLowerCase() ?? "";
    const collegeName = body?.collegeName?.trim() ?? "";
    const domain = body?.domain?.trim() ?? "";

    if (fullName.length < 2 || fullName.length > 100) {
      return NextResponse.json(
        { error: "Please enter a valid full name (at least 2 characters)." },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email) || email.length > 160) {
      return NextResponse.json(
        { error: "Please enter a valid Gmail / email address." },
        { status: 400 }
      );
    }

    if (collegeName.length < 2 || collegeName.length > 160) {
      return NextResponse.json(
        { error: "Please enter a valid college name." },
        { status: 400 }
      );
    }

    if (!isValidDomain(domain)) {
      return NextResponse.json(
        { error: "Please select a valid Domain / Program." },
        { status: 400 }
      );
    }

    const existing = await prisma.student.findUnique({ where: { email } });

    if (existing) {
      if (
        existing.status === "SUBMITTED" ||
        existing.status === "AUTO_SUBMITTED"
      ) {
        return NextResponse.json(
          {
            error:
              "This email has already completed the KORLANCE assessment. Only one attempt per email is permitted.",
          },
          { status: 403 }
        );
      }

      if (
        existing.status === "IN_PROGRESS" &&
        existing.expiresAt &&
        existing.expiresAt.getTime() <= Date.now()
      ) {
        await finalizeExam(existing.id, "AUTO_SUBMITTED");
        return NextResponse.json(
          {
            error:
              "Your previous assessment session has expired and was automatically submitted.",
          },
          { status: 403 }
        );
      }

      const updated = await prisma.student.update({
        where: { id: existing.id },
        data: {
          fullName,
          collegeName,
          ...(existing.status === "NOT_STARTED" ? { domain } : {}),
        },
      });

      await setStudentSession(updated.id, updated.email);

      return NextResponse.json({
        ok: true,
        student: {
          id: updated.id,
          fullName: updated.fullName,
          email: updated.email,
          collegeName: updated.collegeName,
          domain: updated.domain,
          status: updated.status,
        },
      });
    }

    const created = await prisma.student.create({
      data: {
        fullName,
        email,
        collegeName,
        domain,
        status: "NOT_STARTED",
      },
    });

    await setStudentSession(created.id, created.email);

    return NextResponse.json({
      ok: true,
      student: {
        id: created.id,
        fullName: created.fullName,
        email: created.email,
        collegeName: created.collegeName,
        domain: created.domain,
        status: created.status,
      },
    });
  } catch (err) {
    console.error("[API /auth/login]", err);
    return NextResponse.json(
      { error: "Internal server error while signing in." },
      { status: 500 }
    );
  }
}
