import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { finalizeExam, getShowScoreSetting } from "@/lib/exam";

export async function POST(request: Request) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = checkRateLimit(`exam-submit:${session.studentId}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many submit requests" },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      reason?: "USER_SUBMIT" | "TIME_EXPIRED" | "VIOLATION_LIMIT";
    };

    const student = await prisma.student.findUnique({
      where: { id: session.studentId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const isTimeExpired =
      body.reason === "TIME_EXPIRED" ||
      (student.expiresAt && Date.now() > student.expiresAt.getTime() + 5000);

    const targetStatus =
      body.reason === "VIOLATION_LIMIT" || isTimeExpired
        ? "AUTO_SUBMITTED"
        : "SUBMITTED";

    const finalized = await finalizeExam(student.id, targetStatus);
    const showScore = await getShowScoreSetting();

    return NextResponse.json({
      ok: true,
      status: finalized.status,
      submittedAt: finalized.submittedAt,
      totalQuestions: finalized.totalQuestions,
      showScore,
      score: showScore ? finalized.score : null,
      emailSent: finalized.emailSent,
    });
  } catch (err) {
    console.error("[API /exam/submit]", err);
    return NextResponse.json(
      { error: "Failed to submit assessment" },
      { status: 500 }
    );
  }
}
