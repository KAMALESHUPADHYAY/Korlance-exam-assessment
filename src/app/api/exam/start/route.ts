import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth";
import {
  finalizeExam,
  getExamDurationMinutes,
  getExamDurationMs,
  getMaxAllowedViolations,
  safeJsonParse,
  shuffleArray,
} from "@/lib/exam";

export async function POST(request: Request) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      agreedToRules?: boolean;
    };

    let student = await prisma.student.findUnique({
      where: { id: session.studentId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (
      student.status === "SUBMITTED" ||
      student.status === "AUTO_SUBMITTED"
    ) {
      return NextResponse.json(
        { error: "Assessment already submitted", alreadySubmitted: true },
        { status: 403 }
      );
    }

    if (
      student.status === "IN_PROGRESS" &&
      student.expiresAt &&
      student.expiresAt.getTime() <= Date.now()
    ) {
      await finalizeExam(student.id, "AUTO_SUBMITTED");
      return NextResponse.json(
        { error: "Assessment time has expired", alreadySubmitted: true },
        { status: 403 }
      );
    }

    if (student.status === "NOT_STARTED") {
      if (!body.agreedToRules && !student.agreedToRules) {
        return NextResponse.json(
          { error: "You must agree to the exam rules and regulations before starting." },
          { status: 400 }
        );
      }

      const allQuestions = await prisma.question.findMany({
        where: { domain: student.domain },
        select: { id: true, optionsJson: true },
      });

      if (allQuestions.length === 0) {
        return NextResponse.json(
          {
            error: `No questions available for domain "${student.domain}". Please run seed script.`,
          },
          { status: 500 }
        );
      }

      const shuffledIds = shuffleArray(allQuestions.map((q) => q.id));
      const optionOrders: Record<string, number[]> = {};
      for (const q of allQuestions) {
        const opts = safeJsonParse<string[]>(q.optionsJson, []);
        const indices = opts.map((_, idx) => idx);
        optionOrders[q.id] = shuffleArray(indices);
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + getExamDurationMs());

      student = await prisma.student.update({
        where: { id: student.id },
        data: {
          status: "IN_PROGRESS",
          agreedToRules: true,
          questionOrder: JSON.stringify(shuffledIds),
          optionOrders: JSON.stringify(optionOrders),
          answers: JSON.stringify({}),
          markedReview: JSON.stringify([]),
          startedAt: now,
          expiresAt,
          totalQuestions: shuffledIds.length,
        },
      });
    }

    const questionOrder = safeJsonParse<string[]>(student.questionOrder, []);
    const optionOrders = safeJsonParse<Record<string, number[]>>(
      student.optionOrders,
      {}
    );
    const savedOriginalAnswers = safeJsonParse<Record<string, number>>(
      student.answers,
      {}
    );
    const markedReview = safeJsonParse<string[]>(student.markedReview, []);

    const dbQuestions = await prisma.question.findMany({
      where: { id: { in: questionOrder } },
      select: {
        id: true,
        domain: true,
        difficulty: true,
        prompt: true,
        optionsJson: true,
        // correctIndex intentionally excluded - never sent to client!
      },
    });

    const questionMap = new Map(dbQuestions.map((q) => [q.id, q]));

    const orderedQuestions = questionOrder
      .map((qId) => {
        const q = questionMap.get(qId);
        if (!q) return null;
        const originalOptions = safeJsonParse<string[]>(q.optionsJson, []);
        const order = optionOrders[q.id] ?? originalOptions.map((_, i) => i);
        const shuffledOptions = order.map((origIdx) => originalOptions[origIdx]);
        return {
          id: q.id,
          domain: q.domain,
          difficulty: q.difficulty,
          prompt: q.prompt,
          options: shuffledOptions,
        };
      })
      .filter((q): q is NonNullable<typeof q> => q !== null);

    // Map stored original option index -> shuffled display index for client UI
    const savedDisplayAnswers: Record<string, number> = {};
    for (const [qId, origIdx] of Object.entries(savedOriginalAnswers)) {
      const order = optionOrders[qId];
      if (order) {
        const displayIdx = order.indexOf(origIdx);
        if (displayIdx !== -1) {
          savedDisplayAnswers[qId] = displayIdx;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      domain: student.domain,
      serverTime: Date.now(),
      expiresAt:
        student.expiresAt?.getTime() ?? Date.now() + getExamDurationMs(),
      durationMinutes: getExamDurationMinutes(),
      violationCount: student.violationCount,
      maxViolations: getMaxAllowedViolations(),
      questions: orderedQuestions,
      savedAnswers: savedDisplayAnswers,
      markedReview,
    });
  } catch (err) {
    console.error("[API /exam/start]", err);
    return NextResponse.json(
      { error: "Failed to initialize exam session." },
      { status: 500 }
    );
  }
}
