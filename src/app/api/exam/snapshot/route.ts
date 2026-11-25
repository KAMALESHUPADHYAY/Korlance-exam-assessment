import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveStudentSnapshot } from "@/lib/snapshot-storage";

export async function POST(request: Request) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = checkRateLimit(
      `exam-snapshot:${session.studentId}`,
      12,
      60_000
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      image?: string;
    } | null;

    if (!body?.image) {
      return NextResponse.json(
        { error: "Missing snapshot image" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: session.studentId },
      select: { id: true, status: true },
    });

    if (!student || student.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Assessment is not in progress" },
        { status: 403 }
      );
    }

    const saved = await saveStudentSnapshot({
      studentId: student.id,
      dataUrl: body.image,
      reason: "PERIODIC",
    });

    if (!saved) {
      return NextResponse.json(
        { error: "Invalid image payload" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: saved.id,
      filePath: saved.filePath,
      url: saved.url,
    });
  } catch (err) {
    console.error("[API /exam/snapshot]", err);
    return NextResponse.json(
      { error: "Failed to save snapshot" },
      { status: 500 }
    );
  }
}
