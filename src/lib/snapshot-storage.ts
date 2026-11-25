import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Validates and persists a JPEG/PNG snapshot data URL directly in PostgreSQL
 * (serverless-safe: zero local filesystem writes at runtime).
 */
export async function saveStudentSnapshot(params: {
  studentId: string;
  dataUrl: string;
  reason: "PERIODIC" | "VIOLATION";
  violationType?: string;
}): Promise<{ id: string; filePath: string; url: string } | null> {
  const { studentId, dataUrl, reason, violationType } = params;
  const match = /^data:image\/(jpeg|jpg|png);base64,([A-Za-z0-9+/=]+)$/.exec(
    dataUrl
  );
  if (!match) return null;
  if (dataUrl.length > 260_000) return null;

  const ext = match[1] === "png" ? "png" : "jpg";
  const safeStudentDir = studentId.replace(/[^a-zA-Z0-9_-]/g, "");
  const fileName = `${Date.now()}-${reason.toLowerCase()}-${crypto
    .randomBytes(3)
    .toString("hex")}.${ext}`;

  const logicalPath = `db://snapshots/${safeStudentDir}/${fileName}`;
  const url = `/api/admin/snapshots/${safeStudentDir}/${fileName}`;

  const snapshot = await prisma.snapshot.create({
    data: {
      studentId,
      filePath: logicalPath,
      url,
      reason,
      violationType: violationType ?? null,
      imageData: dataUrl,
    },
  });

  return { id: snapshot.id, filePath: logicalPath, url };
}
