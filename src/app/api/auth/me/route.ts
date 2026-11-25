import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearStudentSession, getStudentSession } from "@/lib/auth";
import {
  getExamDurationMinutes,
  getMaxAllowedViolations,
  getShowScoreSetting,
} from "@/lib/exam";

export async function GET() {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const student = await prisma.student.findUnique({
    where: { id: session.studentId },
    select: {
      id: true,
      fullName: true,
      email: true,
      collegeName: true,
      domain: true,
      status: true,
      agreedToRules: true,
      startedAt: true,
      expiresAt: true,
      submittedAt: true,
      score: true,
      totalQuestions: true,
      violationCount: true,
    },
  });

  if (!student) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const showScore = await getShowScoreSetting();

  return NextResponse.json({
    authenticated: true,
    student: {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      collegeName: student.collegeName,
      domain: student.domain,
      status: student.status,
      agreedToRules: student.agreedToRules,
      startedAt: student.startedAt,
      expiresAt: student.expiresAt,
      submittedAt: student.submittedAt,
      totalQuestions: student.totalQuestions,
      violationCount: student.violationCount,
      score:
        showScore &&
        (student.status === "SUBMITTED" || student.status === "AUTO_SUBMITTED")
          ? student.score
          : null,
      showScore,
      maxViolations: getMaxAllowedViolations(),
      examDurationMinutes: getExamDurationMinutes(),
    },
  });
}

export async function DELETE() {
  await clearStudentSession();
  return NextResponse.json({ ok: true });
}
