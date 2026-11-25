import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { safeJsonParse } from "@/lib/exam";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      violations: {
        orderBy: { createdAt: "desc" },
      },
      snapshots: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          filePath: true,
          url: true,
          reason: true,
          violationType: true,
          createdAt: true,
        },
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const answers = safeJsonParse<Record<string, number>>(student.answers, {});
  const questionOrder = safeJsonParse<string[]>(student.questionOrder, []);
  const questions = await prisma.question.findMany({
    where:
      questionOrder.length > 0 ? { id: { in: questionOrder } } : undefined,
    select: { id: true, domain: true, correctIndex: true },
  });

  const domainMap: Record<
    string,
    { domain: string; total: number; answered: number; correct: number }
  > = {};

  for (const q of questions) {
    if (!domainMap[q.domain]) {
      domainMap[q.domain] = {
        domain: q.domain,
        total: 0,
        answered: 0,
        correct: 0,
      };
    }
    domainMap[q.domain].total += 1;
    if (answers[q.id] !== undefined) {
      domainMap[q.domain].answered += 1;
      if (answers[q.id] === q.correctIndex) {
        domainMap[q.domain].correct += 1;
      }
    }
  }

  return NextResponse.json({
    student: {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      collegeName: student.collegeName,
      domain: student.domain,
      status: student.status,
      score: student.score,
      totalQuestions: student.totalQuestions,
      violationCount: student.violationCount,
      startedAt: student.startedAt,
      expiresAt: student.expiresAt,
      submittedAt: student.submittedAt,
      emailSent: student.emailSent,
      createdAt: student.createdAt,
      answeredCount: Object.keys(answers).length,
    },
    domainBreakdown: Object.values(domainMap),
    violations: student.violations,
    snapshots: student.snapshots,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  await prisma.student.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
