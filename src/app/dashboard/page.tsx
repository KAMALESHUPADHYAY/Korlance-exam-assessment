"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Building2,
  Camera,
  CameraOff,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  EyeOff,
  LogOut,
  Maximize2,
  Quote,
  ShieldAlert,
  Sparkles,
  Video,
  Wifi,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DOMAINS } from "@/lib/domains";
import { DomainIcon } from "@/components/DomainIcon";

interface StudentProfile {
  id: string;
  fullName: string;
  email: string;
  collegeName: string;
  domain: string;
  status: string;
  agreedToRules: boolean;
  maxViolations?: number;
  examDurationMinutes?: number;
}

const MOTIVATIONAL_QUOTES = [
  "Every expert was once a beginner. Give this test your best.",
  "Skills build careers, and careers build futures.",
  "Stay calm, think clearly, trust your preparation.",
  "Your effort today is your portfolio tomorrow.",
  "Don't watch the clock, do what it does: keep going.",
  "Success is the sum of small efforts repeated daily.",
];

export default function StudentDashboardPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<1 | 2>(1);
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteIdx, setQuoteIdx] = useState(0);

  // Camera permission gate state
  const [camStatus, setCamStatus] = useState<
    "IDLE" | "REQUESTING" | "GRANTED" | "DENIED" | "UNSUPPORTED"
  >("IDLE");
  const [camMessage, setCamMessage] = useState<string | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIdx((idx) => (idx + 1) % MOTIVATIONAL_QUOTES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace("/");
          return;
        }
        const data = await res.json();
        const s = data.student as StudentProfile;
        if (s.status === "SUBMITTED" || s.status === "AUTO_SUBMITTED") {
          router.replace("/submitted");
          return;
        }
        if (s.status === "IN_PROGRESS") {
          router.replace("/exam");
          return;
        }
        setStudent(s);
        setAgreed(Boolean(s.agreedToRules));
      } catch {
        router.replace("/");
      } finally {
        setLoading(false);
      }
    }
    loadMe();
  }, [router]);

  const stopPreviewStream = () => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
    }
  };

  async function requestCameraPermission() {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCamStatus("UNSUPPORTED");
      setCamMessage(
        "Your browser does not support webcam access (getUserMedia). Please use the latest Google Chrome or Microsoft Edge over HTTPS."
      );
      return;
    }

    setCamStatus("REQUESTING");
    setCamMessage(null);
    stopPreviewStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false,
      });
      previewStreamRef.current = stream;
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }
      setCamStatus("GRANTED");
      setCamMessage("Camera permission verified. AI proctoring is ready.");
    } catch {
      setCamStatus("DENIED");
      setCamMessage(
        "Camera permission was denied or no webcam was found. Please allow camera access in your browser address bar and click Retry Camera Check to unlock Start Exam."
      );
    }
  }

  useEffect(() => {
    if (page === 2 && camStatus === "IDLE") {
      requestCameraPermission();
    }
    if (page === 1) {
      stopPreviewStream();
      if (camStatus === "GRANTED") {
        setCamStatus("IDLE");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (camStatus === "GRANTED" && previewVideoRef.current && previewStreamRef.current) {
      previewVideoRef.current.srcObject = previewStreamRef.current;
    }
  }, [camStatus]);

  useEffect(() => {
    return () => stopPreviewStream();
  }, []);

  async function handleLogout() {
    stopPreviewStream();
    await fetch("/api/auth/me", { method: "DELETE" });
    router.push("/");
  }

  async function handleStartExam() {
    if (!agreed || camStatus !== "GRANTED") return;
    setStarting(true);
    setError(null);
    try {
      stopPreviewStream();
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => null);
      }
      const res = await fetch("/api/exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreedToRules: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to start assessment.");
        setStarting(false);
        return;
      }
      router.push("/exam");
    } catch {
      setError("Failed to start exam. Please check your connection.");
      setStarting(false);
    }
  }

  if (loading || !student) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass-card rounded-3xl px-8 py-6 text-sm text-purple-200">
          Loading candidate dashboard...
        </div>
      </div>
    );
  }

  const maxViolations = student.maxViolations ?? 2;
  const durationMinutes = student.examDurationMinutes ?? 30;

  const rules = [
    {
      icon: <Camera className="h-5 w-5 text-emerald-300" />,
      title: "AI Webcam Proctoring Active",
      desc: "Your camera stays ON throughout the exam. In-browser AI monitors face presence, multiple faces, head direction, and captures periodic snapshots every 30s.",
      color: "border-emerald-400/25 bg-emerald-500/10",
    },
    {
      icon: <EyeOff className="h-5 w-5 text-rose-300" />,
      title: "Do Not Switch Tabs or Windows",
      desc: "Switching tabs or losing window focus immediately stops your camera and locks the exam screen with a recorded violation.",
      color: "border-rose-400/25 bg-rose-500/10",
    },
    {
      icon: <ShieldAlert className="h-5 w-5 text-amber-300" />,
      title: "No Copy, Paste, Right-Click or DevTools",
      desc: "Copy, paste, text selection, right-click, and developer shortcuts (F12 / Inspect) are blocked and flagged.",
      color: "border-amber-400/25 bg-amber-500/10",
    },
    {
      icon: <Maximize2 className="h-5 w-5 text-blue-300" />,
      title: "Mandatory Fullscreen Mode",
      desc: "The exam launches in fullscreen mode. Exiting fullscreen triggers a violation lock and re-requests fullscreen.",
      color: "border-blue-400/25 bg-blue-500/10",
    },
    {
      icon: <AlertTriangle className="h-5 w-5 text-orange-300" />,
      title: `Strict ${maxViolations}-Violation Auto-Submit Policy`,
      desc:
        maxViolations === 2
          ? "1st violation issues a strong warning (resume once after acknowledging). 2nd violation automatically submits your exam."
          : `Reaching ${maxViolations} violations automatically submits your exam as Auto-Submitted (Violation).`,
      color: "border-orange-400/25 bg-orange-500/10",
    },
    {
      icon: <Wifi className="h-5 w-5 text-purple-300" />,
      title: "Stable Internet & No External Help",
      desc: "Maintain a stable connection. No phones, secondary screens, notes, or external assistance allowed.",
      color: "border-purple-400/25 bg-purple-500/10",
    },
  ];

  const canStart = agreed && camStatus === "GRANTED" && !starting;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        showAdminLink={false}
        rightSlot={
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-full border border-purple-300/20 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-purple-100 transition hover:border-rose-400/40 hover:bg-rose-500/20"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        }
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/15 px-3.5 py-1 text-xs font-semibold text-purple-200">
              <Sparkles className="h-3.5 w-3.5 text-purple-300" />
              <span>Candidate Dashboard &bull; Step {page} of 2</span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
              {page === 1
                ? `Welcome, ${student.fullName} | ${student.domain} Assessment`
                : "Rules, Camera Check & Launch"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(1)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                page === 1
                  ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md shadow-purple-600/30"
                  : "border border-purple-300/20 bg-white/5 text-purple-200 hover:bg-white/10"
              }`}
            >
              1. Exam Details
            </button>
            <button
              onClick={() => setPage(2)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                page === 2
                  ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md shadow-purple-600/30"
                  : "border border-purple-300/20 bg-white/5 text-purple-200 hover:bg-white/10"
              }`}
            >
              2. Rules &amp; Start
            </button>
          </div>
        </div>

        {page === 1 ? (
          <div className="space-y-8">
            {/* Korlance Motivation Hero Section */}
            <section className="glass-card glow-purple relative overflow-hidden rounded-3xl border border-purple-400/25 bg-gradient-to-br from-[#12072B]/90 via-[#1A0B3B]/90 to-[#0B0614]/95 p-6 sm:p-10">
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-violet-600/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl" />

              <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
                <div className="max-w-3xl space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="h-[2px] w-8 rounded-full bg-[#C4B5FD]" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#C4B5FD]">
                      PRECISION LEARNING FOR EMERGING TECHNOLOGISTS
                    </span>
                  </div>

                  <h2 className="text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl">
                    <span className="block">Build</span>
                    <span className="block">Practical capability</span>
                    <span className="block text-[#C4B5FD]">
                      Create portfolio evidence
                    </span>
                    <span className="block">Lead tomorrow</span>
                  </h2>

                  <p className="max-w-2xl text-sm leading-relaxed text-purple-100/80 sm:text-base">
                    Build practical technology and skills and prepare for
                    fresher interviews with KORLANCE in Hyderabad and Bengaluru.
                    Turn learning into project evidence you can explain.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-purple-100/85">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-500/20 px-3.5 py-1.5 font-semibold text-white">
                      <Sparkles className="h-3.5 w-3.5 text-[#C4B5FD]" />
                      {student.domain}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 font-medium text-white">
                      <Building2 className="h-3.5 w-3.5 text-purple-300" />
                      {student.collegeName}
                    </span>
                    <span className="text-purple-200/75">{student.email}</span>
                  </div>
                </div>

                <button
                  onClick={() => setPage(2)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-purple-600/40 transition hover:brightness-110"
                >
                  <span>Next: Rules &amp; Camera Setup</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>

            {/* Rotating Motivational Quote Strip (every 6 seconds) */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-purple-300/20 bg-gradient-to-r from-violet-950/60 via-purple-900/30 to-indigo-950/60 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-[#C4B5FD]">
                  <Quote className="h-4 w-4" />
                </span>
                <p
                  key={quoteIdx}
                  className="text-sm font-medium italic text-purple-100 transition-opacity duration-500"
                >
                  &ldquo;{MOTIVATIONAL_QUOTES[quoteIdx]}&rdquo;
                </p>
              </div>
              <div className="hidden items-center gap-1 sm:flex">
                {MOTIVATIONAL_QUOTES.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === quoteIdx
                        ? "w-5 bg-[#C4B5FD]"
                        : "w-1.5 bg-purple-300/30"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Colorful Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-violet-400/30 bg-gradient-to-br from-violet-600/25 to-purple-900/30 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-violet-200">
                    Total Questions
                  </span>
                  <ClipboardCheck className="h-5 w-5 text-violet-300" />
                </div>
                <p className="mt-3 text-3xl font-extrabold text-white">
                  30 MCQs
                </p>
                <p className="mt-1 text-xs text-violet-200/80">
                  Domain specific ({student.domain})
                </p>
              </div>

              <div className="rounded-3xl border border-blue-400/30 bg-gradient-to-br from-blue-600/25 to-indigo-900/30 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                    Time Duration
                  </span>
                  <Clock className="h-5 w-5 text-blue-300" />
                </div>
                <p className="mt-3 text-3xl font-extrabold text-white">
                  {durationMinutes} Minutes
                </p>
                <p className="mt-1 text-xs text-blue-200/80">
                  Auto-submits when timer ends
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-600/25 to-teal-900/30 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
                    Marking Scheme
                  </span>
                  <Award className="h-5 w-5 text-emerald-300" />
                </div>
                <p className="mt-3 text-3xl font-extrabold text-white">
                  +1 / 0
                </p>
                <p className="mt-1 text-xs text-emerald-200/80">
                  No negative marking
                </p>
              </div>

              <div className="rounded-3xl border border-pink-400/30 bg-gradient-to-br from-pink-600/25 to-rose-900/30 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-pink-200">
                    AI Proctoring
                  </span>
                  <Camera className="h-5 w-5 text-pink-300" />
                </div>
                <p className="mt-3 text-3xl font-extrabold text-white">
                  Live Guard
                </p>
                <p className="mt-1 text-xs text-pink-200/80">
                  In-browser face &amp; tab checks
                </p>
              </div>
            </div>

            {/* All 16 Assessment Domains Covered */}
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-white">
                  Assessment Domains Covered (16 Programs)
                </h3>
                <span className="text-xs text-purple-200/75">
                  Highlighted card indicates your selected assessment track
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {DOMAINS.map((domain) => {
                  const isSelected = domain.name === student.domain;
                  return (
                    <div
                      key={domain.name}
                      className={`relative rounded-3xl border bg-gradient-to-br ${domain.gradient} p-5 backdrop-blur-md transition ${
                        isSelected
                          ? "border-violet-400 ring-2 ring-violet-400/80 shadow-[0_0_32px_rgba(124,58,237,0.55)] -translate-y-0.5"
                          : `${domain.border} opacity-85 hover:opacity-100 hover:-translate-y-0.5`
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                          <DomainIcon
                            iconKey={domain.iconKey}
                            className="h-5 w-5"
                          />
                        </div>
                        {isSelected ? (
                          <span className="rounded-full bg-gradient-to-r from-violet-500 to-blue-500 px-3 py-1 text-[11px] font-extrabold text-white shadow-md shadow-purple-500/40">
                            Your Domain
                          </span>
                        ) : (
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${domain.badge}`}
                          >
                            30 MCQs
                          </span>
                        )}
                      </div>
                      <h4 className="mt-4 text-base font-bold text-white">
                        {domain.name}
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-purple-100/75">
                        {domain.topics}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPage(2)}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-600/35 transition hover:brightness-110"
              >
                <span>Proceed to Rules &amp; Regulations</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-6 sm:p-8">
              <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Mandatory AI Proctoring &amp; {durationMinutes}-Minute Exam
                    Guidelines
                  </h2>
                  <p className="mt-1 text-sm text-purple-200/75">
                    Selected Track:{" "}
                    <strong className="text-white">{student.domain}</strong>{" "}
                    (30 MCQs). Camera permission is mandatory before starting.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/35 bg-rose-500/15 px-3.5 py-1 text-xs font-semibold text-rose-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {maxViolations} Violations = Auto-Submit
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {rules.map((rule) => (
                  <div
                    key={rule.title}
                    className={`flex items-start gap-4 rounded-2xl border p-4 ${rule.color}`}
                  >
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/25">
                      {rule.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {rule.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-purple-100/80">
                        {rule.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 rounded-2xl border border-purple-400/30 bg-[#0D071B]/80 p-5">
                <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
                  <div className="flex items-center gap-4">
                    <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-2xl border border-purple-300/25 bg-black/70">
                      {camStatus === "GRANTED" ? (
                        <video
                          ref={previewVideoRef}
                          autoPlay
                          muted
                          playsInline
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-purple-300/60">
                          <CameraOff className="h-6 w-6" />
                          <span className="text-[10px] font-semibold">
                            No Preview
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-purple-300" />
                        <h3 className="text-sm font-bold text-white">
                          Webcam Permission Check
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            camStatus === "GRANTED"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : camStatus === "DENIED" ||
                                camStatus === "UNSUPPORTED"
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-amber-500/20 text-amber-200"
                          }`}
                        >
                          {camStatus === "GRANTED"
                            ? "Camera Ready"
                            : camStatus === "REQUESTING"
                            ? "Requesting..."
                            : camStatus === "DENIED"
                            ? "Permission Denied"
                            : camStatus === "UNSUPPORTED"
                            ? "Unsupported Browser"
                            : "Pending"}
                        </span>
                      </div>
                      <p
                        className={`mt-1.5 max-w-xl text-xs leading-relaxed ${
                          camStatus === "DENIED" || camStatus === "UNSUPPORTED"
                            ? "text-rose-200"
                            : "text-purple-200/80"
                        }`}
                      >
                        {camMessage ||
                          "Allow webcam access so AI proctoring can verify your environment before starting."}
                      </p>
                    </div>
                  </div>

                  {camStatus !== "GRANTED" && (
                    <button
                      type="button"
                      onClick={requestCameraPermission}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-purple-400/40 bg-purple-600/30 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-purple-600/50"
                    >
                      <Camera className="h-4 w-4" />
                      <span>
                        {camStatus === "DENIED"
                          ? "Retry Camera Permission"
                          : "Enable Camera"}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="mt-5 rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}

              <div className="mt-6 rounded-2xl border border-purple-400/25 bg-white/5 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-purple-300/40 bg-[#0D071B] text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm text-purple-100">
                    <strong className="text-white">
                      I have read and agree
                    </strong>{" "}
                    to all the rules and regulations above, including AI webcam
                    proctoring, fullscreen enforcement, and automatic submission
                    upon {maxViolations} violations.
                  </span>
                </label>
              </div>

              {camStatus !== "GRANTED" && (
                <p className="mt-3 text-xs font-semibold text-rose-300">
                  * Start Exam is blocked until camera permission is granted.
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
                <button
                  onClick={() => setPage(1)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-purple-300/25 bg-white/5 px-6 py-3 text-sm font-semibold text-purple-100 transition hover:bg-white/10 sm:w-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Exam Details</span>
                </button>

                <button
                  onClick={handleStartExam}
                  disabled={!canStart}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-600/35 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{starting ? "Launching Exam..." : "Start Exam"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer showLeadershipCard={true} />
    </div>
  );
}
