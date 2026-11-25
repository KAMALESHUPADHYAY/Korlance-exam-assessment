import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ studentId: string; filename: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { studentId, filename } = await context.params;
  const safeStudentId = path.basename(studentId);
  const safeFilename = path.basename(filename);
  const url = `/api/admin/snapshots/${safeStudentId}/${safeFilename}`;

  const snap = await prisma.snapshot.findFirst({
    where: { studentId: safeStudentId, url },
    select: { imageData: true },
  });

  if (!snap?.imageData) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  const match = /^data:(image\/(?:jpeg|png));base64,(.+)$/.exec(snap.imageData);
  if (!match) {
    return NextResponse.json({ error: "Invalid snapshot data" }, { status: 500 });
  }

  const buf = Buffer.from(match[2], "base64");
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "private, max-age=3600",
    },
  });
}
