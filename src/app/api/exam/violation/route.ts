import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { finalizeExam, getMaxAllowedViolations } from "@/lib/exam";
import { saveStudentSnapshot } from "@/lib/snapshot-storage";

const ALLOWED_TYPES = new Set([
  "TAB_SWITCH",
  "WINDOW_BLUR",
  "FULLSCREEN_EXIT",
  "CAMERA_OFF",
  "COPY_PASTE",
  "DEVTOOLS_ATTEMPT",
  "NO_FACE",
  "MULTIPLE_FACES",
  "LOOKING_AWAY",
]);

export async function POST(request: Request) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = checkRateLimit(
      `exam-violation:${session.studentId}`,
      30,
      60_000
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      type?: string;
      details?: string;
      screenshot?: string | null;
    } | null;

    const type = body?.type ?? "";
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json(
        { error: "Invalid violation type" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: session.studentId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const maxViolations = getMaxAllowedViolations();

    if (student.status !== "IN_PROGRESS") {
      return NextResponse.json({
        ok: true,
        violationCount: student.violationCount,
        maxViolations,
        autoSubmitted: student.status === "AUTO_SUBMITTED",
      });
    }

    let snapshotUrl: string | null = null;
    if (typeof body?.screenshot === "string" && body.screenshot.startsWith("data:image/")) {
      const saved = await saveStudentSnapshot({
        studentId: student.id,
        dataUrl: body.screenshot,
        reason: "VIOLATION",
        violationType: type,
      });
      if (saved) {
        snapshotUrl = saved.url;
      }
    }

    const safeDetails =
      typeof body?.details === "string" ? body.details.slice(0, 300) : null;

    await prisma.violation.create({
      data: {
        studentId: student.id,
        type,
        details: safeDetails,
        snapshotPath: snapshotUrl,
        screenshot: snapshotUrl,
      },
    });

    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        violationCount: { increment: 1 },
      },
    });

    const shouldAutoSubmit = updatedStudent.violationCount >= maxViolations;
    if (shouldAutoSubmit) {
      await finalizeExam(student.id, "AUTO_SUBMITTED");
    }

    return NextResponse.json({
      ok: true,
      violationCount: updatedStudent.violationCount,
      maxViolations,
      autoSubmitted: shouldAutoSubmit,
      snapshotUrl,
    });
  } catch (err) {
    console.error("[API /exam/violation]", err);
    return NextResponse.json(
      { error: "Failed to record violation" },
      { status: 500 }
    );
  }
}
