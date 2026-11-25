"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  Building2,
  CheckCircle2,
  Clock,
  MailCheck,
  ShieldAlert,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

interface SubmittedStudent {
  fullName: string;
  email: string;
  collegeName: string;
  domain: string;
  status: string;
  submittedAt: string | null;
  totalQuestions: number;
  violationCount: number;
  score: number | null;
  showScore: boolean;
}

export default function SubmittedPage() {
  const router = useRouter();
  const [student, setStudent] = useState<SubmittedStudent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace("/");
          return;
        }
        const data = await res.json();
        const s = data.student as SubmittedStudent;
        if (s.status === "NOT_STARTED") {
          router.replace("/dashboard");
          return;
        }
        if (s.status === "IN_PROGRESS") {
          router.replace("/exam");
          return;
        }
        setStudent(s);
      } catch {
        router.replace("/");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading || !student) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass-card rounded-3xl px-8 py-6 text-sm text-purple-200">
          Loading submission confirmation...
        </div>
      </div>
    );
  }

  const isAuto = student.status === "AUTO_SUBMITTED";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar showAdminLink={false} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-12 sm:px-6">
        <div className="glass-card glow-purple w-full rounded-3xl p-6 text-center sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border border-emerald-400/40 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="h-10 w-10 text-emerald-300" />
          </div>

          <span
            className={`mt-5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold ${
              isAuto
                ? "border border-amber-400/40 bg-amber-500/15 text-amber-200"
                : "border border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
            }`}
          >
            {isAuto ? (
              <>
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Auto-Submitted</span>
              </>
            ) : (
              <span>Submission Successful</span>
            )}
          </span>

          <h1 className="mt-4 text-2xl font-extrabold text-white sm:text-3xl">
            Thank You, {student.fullName}!
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#C4B5FD]">
            Great effort! Keep building, keep learning, lead tomorrow.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-purple-100/80 sm:text-base">
            Your KORLANCE <strong className="text-white">{student.domain}</strong>{" "}
            assessment has been submitted successfully. Our placement &amp;
            evaluation team will review your performance and share the results
            with you shortly.
          </p>

          <div className="mt-8 grid gap-3 rounded-2xl border border-purple-300/15 bg-white/[0.03] p-5 text-left sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-purple-300/70">
                Candidate Email
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                <MailCheck className="h-4 w-4 text-purple-300" />
                <span>{student.email}</span>
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-purple-300/70">
                College
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                <Building2 className="h-4 w-4 text-purple-300" />
                <span>{student.collegeName}</span>
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-purple-300/70">
                Submitted Time
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                <Clock className="h-4 w-4 text-purple-300" />
                <span>
                  {student.submittedAt
                    ? new Date(student.submittedAt).toLocaleString()
                    : "Recorded"}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-purple-300/70">
                Email Confirmation
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-300">
                Confirmation dispatched to Gmail
              </p>
            </div>
          </div>

          {student.showScore && student.score !== null && (
            <div className="mt-6 rounded-2xl border border-violet-400/35 bg-gradient-to-r from-violet-600/25 to-blue-600/20 p-5">
              <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-200">
                <Award className="h-4 w-4 text-purple-300" />
                <span>Your Assessment Score</span>
              </div>
              <p className="mt-2 text-4xl font-extrabold text-white">
                {student.score}{" "}
                <span className="text-lg font-medium text-purple-200/75">
                  / {student.totalQuestions}
                </span>
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer showLeadershipCard={false} />
    </div>
  );
}
