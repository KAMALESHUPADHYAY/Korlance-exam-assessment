import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

function csvCell(val: unknown): string {
  const str = String(val ?? "");
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(request: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status")?.trim() ?? "ALL";
  const collegeFilter = searchParams.get("college")?.trim() ?? "ALL";
  const domainFilter = searchParams.get("domain")?.trim() ?? "ALL";

  const students = await prisma.student.findMany({
    orderBy: { createdAt: "desc" },
  });

  const filtered = students.filter((s) => {
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    if (collegeFilter !== "ALL" && s.collegeName !== collegeFilter)
      return false;
    if (domainFilter !== "ALL" && s.domain !== domainFilter) return false;
    return true;
  });

  const header = [
    "Full Name",
    "Email",
    "College Name",
    "Domain",
    "Status",
    "Score",
    "Total Questions",
    "Violations",
    "Started At",
    "Submitted At",
  ].join(",");

  const rows = filtered.map((s) =>
    [
      csvCell(s.fullName),
      csvCell(s.email),
      csvCell(s.collegeName),
      csvCell(s.domain),
      csvCell(s.status),
      csvCell(s.score ?? ""),
      csvCell(s.totalQuestions),
      csvCell(s.violationCount),
      csvCell(s.startedAt ? s.startedAt.toISOString() : ""),
      csvCell(s.submittedAt ? s.submittedAt.toISOString() : ""),
    ].join(",")
  );

  const csv = [header, ...rows].join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="korlance-assessment-results.csv"`,
    },
  });
}
