import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { finalizeExam, safeJsonParse } from "@/lib/exam";

export async function POST(request: Request) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = checkRateLimit(`exam-answer:${session.studentId}`, 120, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      questionId?: string;
      selectedIndex?: number | null;
      markedReview?: boolean;
    } | null;

    if (!body?.questionId) {
      return NextResponse.json(
        { error: "questionId is required" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: session.studentId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Exam is not active", alreadySubmitted: true },
        { status: 403 }
      );
    }

    // Server-side timer enforcement (5s grace for network latency)
    if (student.expiresAt && Date.now() > student.expiresAt.getTime() + 5000) {
      await finalizeExam(student.id, "AUTO_SUBMITTED");
      return NextResponse.json(
        { error: "Time expired", expired: true },
        { status: 403 }
      );
    }

    const questionOrder = safeJsonParse<string[]>(student.questionOrder, []);
    if (!questionOrder.includes(body.questionId)) {
      return NextResponse.json(
        { error: "Invalid questionId for this session" },
        { status: 400 }
      );
    }

    const optionOrders = safeJsonParse<Record<string, number[]>>(
      student.optionOrders,
      {}
    );
    const answers = safeJsonParse<Record<string, number>>(student.answers, {});
    const markedSet = new Set(
      safeJsonParse<string[]>(student.markedReview, [])
    );

    if (body.selectedIndex !== undefined) {
      if (body.selectedIndex === null) {
        delete answers[body.questionId];
      } else {
        const order = optionOrders[body.questionId];
        if (
          !order ||
          typeof body.selectedIndex !== "number" ||
          body.selectedIndex < 0 ||
          body.selectedIndex >= order.length
        ) {
          return NextResponse.json(
            { error: "Invalid option index" },
            { status: 400 }
          );
        }
        answers[body.questionId] = order[body.selectedIndex];
      }
    }

    if (typeof body.markedReview === "boolean") {
      if (body.markedReview) {
        markedSet.add(body.questionId);
      } else {
        markedSet.delete(body.questionId);
      }
    }

    await prisma.student.update({
      where: { id: student.id },
      data: {
        answers: JSON.stringify(answers),
        markedReview: JSON.stringify(Array.from(markedSet)),
      },
    });

    return NextResponse.json({ ok: true, savedAt: Date.now() });
  } catch (err) {
    console.error("[API /exam/answer]", err);
    return NextResponse.json(
      { error: "Failed to save answer" },
      { status: 500 }
    );
  }
}
