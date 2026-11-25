import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { DOMAINS } from "../src/lib/domains";

const prisma = new PrismaClient();

export interface SeedQuestionItem {
  difficulty: "Easy" | "Medium" | "Hard";
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

async function main() {
  console.log("Seeding KORLANCE Assessment database across 16 domains...");

  const questionsDir = path.join(process.cwd(), "prisma", "seed", "questions");
  const seenPrompts = new Set<string>();
  const allRows: Array<{
    domain: string;
    difficulty: string;
    prompt: string;
    optionsJson: string;
    correctIndex: number;
    explanation: string;
  }> = [];

  for (const domainMeta of DOMAINS) {
    const filePath = path.join(questionsDir, domainMeta.fileName);
    const raw = await fs.readFile(filePath, "utf8");
    const items = JSON.parse(raw) as SeedQuestionItem[];

    if (!Array.isArray(items) || items.length !== 30) {
      throw new Error(
        `Domain "${domainMeta.name}" (${domainMeta.fileName}) must contain exactly 30 questions, found ${items?.length ?? 0}`
      );
    }

    let easy = 0;
    let medium = 0;
    let hard = 0;

    for (const q of items) {
      if (q.difficulty === "Easy") easy++;
      else if (q.difficulty === "Medium") medium++;
      else if (q.difficulty === "Hard") hard++;
      else {
        throw new Error(`Invalid difficulty "${q.difficulty}" in ${domainMeta.fileName}`);
      }

      if (!Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error(`Question "${q.prompt}" in ${domainMeta.fileName} must have 4 options`);
      }

      if (q.correctIndex < 0 || q.correctIndex > 3) {
        throw new Error(`Invalid correctIndex in ${domainMeta.fileName}: ${q.correctIndex}`);
      }

      const norm = q.prompt.trim().toLowerCase();
      if (seenPrompts.has(norm)) {
        throw new Error(`Duplicate question detected across domains: "${q.prompt}"`);
      }
      seenPrompts.add(norm);

      allRows.push({
        domain: domainMeta.name,
        difficulty: q.difficulty,
        prompt: q.prompt.trim(),
        optionsJson: JSON.stringify(q.options),
        correctIndex: q.correctIndex,
        explanation: q.explanation?.trim() ?? "",
      });
    }

    if (easy !== 10 || medium !== 14 || hard !== 6) {
      throw new Error(
        `Domain "${domainMeta.name}" difficulty distribution must be 10 Easy / 14 Medium / 6 Hard, got ${easy}/${medium}/${hard}`
      );
    }
  }

  await prisma.question.deleteMany();
  await prisma.question.createMany({ data: allRows });

  await prisma.appSetting.upsert({
    where: { key: "showScoreOnSubmit" },
    update: {},
    create: {
      key: "showScoreOnSubmit",
      value:
        process.env.NEXT_PUBLIC_SHOW_SCORE_ON_SUBMIT === "true"
          ? "true"
          : "false",
    },
  });

  console.log(
    `Seeded ${allRows.length} unique MCQs (${DOMAINS.length} domains × 30 questions) successfully.`
  );
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
