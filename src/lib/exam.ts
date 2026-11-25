import { prisma } from "@/lib/prisma";
import { sendSubmissionEmails } from "@/lib/email";

export function getMaxAttemptsPerEmail(): number {
  const parsed = Number(process.env.MAX_ATTEMPTS_PER_EMAIL);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 10) {
    return Math.floor(parsed);
  }
  return 1;
}

export function getExamDurationMinutes(): number {
  const parsed = Number(process.env.EXAM_DURATION_MINUTES);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 180) {
    return Math.floor(parsed);
  }
  return 30;
}

export function getExamDurationMs(): number {
  return getExamDurationMinutes() * 60 * 1000;
}

export function getMaxAllowedViolations(): number {
  const parsed = Number(process.env.MAX_ALLOWED_VIOLATIONS);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 10) {
    return Math.floor(parsed);
  }
  return 2;
}

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getShowScoreSetting(): Promise<boolean> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: "showScoreOnSubmit" },
  });
  if (setting) {
    return setting.value === "true";
  }
  return process.env.NEXT_PUBLIC_SHOW_SCORE_ON_SUBMIT === "true";
}

/**
 * Scores the student's saved answers on the server, marks the attempt as
 * SUBMITTED or AUTO_SUBMITTED, and triggers confirmation emails.
 * Idempotent if the student is already submitted.
 */
export async function finalizeExam(
  studentId: string,
  status: "SUBMITTED" | "AUTO_SUBMITTED"
) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  if (student.status === "SUBMITTED" || student.status === "AUTO_SUBMITTED") {
    return student;
  }

  const questionOrder = safeJsonParse<string[]>(student.questionOrder, []);
  const answers = safeJsonParse<Record<string, number>>(student.answers, {});

  const questions = await prisma.question.findMany({
    where:
      questionOrder.length > 0 ? { id: { in: questionOrder } } : undefined,
    select: { id: true, correctIndex: true },
  });

  let score = 0;
  for (const q of questions) {
    if (answers[q.id] !== undefined && answers[q.id] === q.correctIndex) {
      score += 1;
    }
  }

  const submittedAt = new Date();
  const totalQuestions =
    questionOrder.length > 0 ? questionOrder.length : questions.length;

  const updated = await prisma.student.update({
    where: { id: studentId },
    data: {
      status,
      submittedAt,
      score,
      totalQuestions,
    },
  });

  // Trigger emails safely without failing submission if SMTP is unconfigured
  const emailResult = await sendSubmissionEmails({
    fullName: updated.fullName,
    email: updated.email,
    collegeName: updated.collegeName,
    domain: updated.domain,
    submittedAt,
    status: updated.status,
    score,
    totalQuestions,
    violationCount: updated.violationCount,
  });

  if (emailResult.studentSent) {
    return prisma.student.update({
      where: { id: studentId },
      data: { emailSent: true },
    });
  }

  return updated;
}

export const DOMAIN_CARDS = [
  {
    name: "Data Science",
    count: 6,
    gradient: "from-violet-600/30 via-purple-600/20 to-fuchsia-600/20",
    border: "border-purple-400/30",
    badge: "bg-purple-500/20 text-purple-200",
    topics: "Statistics, Pandas, Scaling, Hypothesis Testing, EDA",
  },
  {
    name: "Web Development",
    count: 6,
    gradient: "from-blue-600/30 via-indigo-600/20 to-cyan-600/20",
    border: "border-blue-400/30",
    badge: "bg-blue-500/20 text-blue-200",
    topics: "Next.js, React, REST APIs, Security, CSS Grid, CORS",
  },
  {
    name: "AI / ML",
    count: 6,
    gradient: "from-fuchsia-600/30 via-pink-600/20 to-rose-600/20",
    border: "border-pink-400/30",
    badge: "bg-pink-500/20 text-pink-200",
    topics: "Metrics, Regularization, Transformers, Ensembles, CV",
  },
  {
    name: "Python & Programming",
    count: 6,
    gradient: "from-emerald-600/30 via-teal-600/20 to-cyan-600/20",
    border: "border-emerald-400/30",
    badge: "bg-emerald-500/20 text-emerald-200",
    topics: "Core Python, Complexity, Generators, Data Structures, Memoization",
  },
  {
    name: "Databases & Tech",
    count: 6,
    gradient: "from-amber-600/30 via-orange-600/20 to-yellow-600/20",
    border: "border-amber-400/30",
    badge: "bg-amber-500/20 text-amber-200",
    topics: "SQL Joins, Indexing, ACID Transactions, Git & Docker",
  },
];
