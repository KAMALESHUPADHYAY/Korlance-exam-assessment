import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { getShowScoreSetting } from "@/lib/exam";
import { DOMAINS } from "@/lib/domains";

export async function GET(request: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
  const statusFilter = searchParams.get("status")?.trim() ?? "ALL";
  const collegeFilter = searchParams.get("college")?.trim() ?? "ALL";
  const domainFilter = searchParams.get("domain")?.trim() ?? "ALL";

  const allStudents = await prisma.student.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      collegeName: true,
      domain: true,
      status: true,
      score: true,
      totalQuestions: true,
      violationCount: true,
      startedAt: true,
      submittedAt: true,
      createdAt: true,
      emailSent: true,
    },
  });

  const colleges = Array.from(
    new Set(allStudents.map((s) => s.collegeName))
  ).sort((a, b) => a.localeCompare(b));

  const totalStudents = allStudents.length;
  const submittedCount = allStudents.filter(
    (s) => s.status === "SUBMITTED"
  ).length;
  const inProgressCount = allStudents.filter(
    (s) => s.status === "IN_PROGRESS"
  ).length;
  const autoSubmittedCount = allStudents.filter(
    (s) => s.status === "AUTO_SUBMITTED"
  ).length;

  const scoredStudents = allStudents.filter(
    (s) =>
      (s.status === "SUBMITTED" || s.status === "AUTO_SUBMITTED") &&
      typeof s.score === "number"
  );
  const avgScore =
    scoredStudents.length > 0
      ? Number(
          (
            scoredStudents.reduce((acc, s) => acc + (s.score ?? 0), 0) /
            scoredStudents.length
          ).toFixed(1)
        )
      : 0;

  const domainAnalytics = DOMAINS.map((d) => {
    const group = allStudents.filter((s) => s.domain === d.name);
    const completed = group.filter(
      (s) =>
        (s.status === "SUBMITTED" || s.status === "AUTO_SUBMITTED") &&
        typeof s.score === "number"
    );
    const domainAvg =
      completed.length > 0
        ? Number(
            (
              completed.reduce((acc, s) => acc + (s.score ?? 0), 0) /
              completed.length
            ).toFixed(1)
          )
        : 0;
    return {
      domain: d.name,
      studentCount: group.length,
      completedCount: completed.length,
      avgScore: domainAvg,
    };
  });

  const filtered = allStudents.filter((s) => {
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    if (collegeFilter !== "ALL" && s.collegeName !== collegeFilter)
      return false;
    if (domainFilter !== "ALL" && s.domain !== domainFilter) return false;
    if (search) {
      const hay =
        `${s.fullName} ${s.email} ${s.collegeName} ${s.domain}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const showScoreOnSubmit = await getShowScoreSetting();

  return NextResponse.json({
    stats: {
      totalStudents,
      submittedCount,
      inProgressCount,
      autoSubmittedCount,
      avgScore,
    },
    colleges,
    domains: DOMAINS.map((d) => d.name),
    domainAnalytics,
    students: filtered,
    settings: {
      showScoreOnSubmit,
    },
    syncedAt: Date.now(),
  });
}

export async function PATCH(request: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    showScoreOnSubmit?: boolean;
  } | null;

  if (typeof body?.showScoreOnSubmit !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await prisma.appSetting.upsert({
    where: { key: "showScoreOnSubmit" },
    update: { value: body.showScoreOnSubmit ? "true" : "false" },
    create: {
      key: "showScoreOnSubmit",
      value: body.showScoreOnSubmit ? "true" : "false",
    },
  });

  return NextResponse.json({
    ok: true,
    showScoreOnSubmit: body.showScoreOnSubmit,
  });
}
