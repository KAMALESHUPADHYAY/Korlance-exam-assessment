"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bookmark,
  Camera,
  CameraOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Lock,
  Maximize2,
  Send,
  ShieldAlert,
  Users,
} from "lucide-react";
import { KorlanceLogo } from "@/components/KorlanceLogo";
import { Footer } from "@/components/Footer";
import {
  ProctorStatus,
  analyzeFaceLandmarks,
  createInBrowserFaceLandmarker,
  isFrameBlockedOrDark,
} from "@/lib/ai-proctor";

interface ExamQuestion {
  id: string;
  domain: string;
  difficulty: string;
  prompt: string;
  options: string[];
}

function formatTimer(msRemaining: number): string {
  const totalSec = Math.max(0, Math.floor(msRemaining / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function ExamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [serverOffset, setServerOffset] = useState<number>(0);
  const [remainingMs, setRemainingMs] = useState<number>(30 * 60 * 1000);
  const [domainName, setDomainName] = useState<string>("");
  const [violationCount, setViolationCount] = useState(0);
  const [maxViolations, setMaxViolations] = useState(2);

  // Locking & warning states
  const [examLocked, setExamLocked] = useState(false);
  const [lockReason, setLockReason] = useState<string>("");
  const [autoSubmittingLock, setAutoSubmittingLock] = useState(false);
  const [aiBannerWarning, setAiBannerWarning] = useState<string | null>(null);

  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved"
  );
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Camera & AI Proctor states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [proctorStatus, setProctorStatus] =
    useState<ProctorStatus>("INITIALIZING");
  const [faceCount, setFaceCount] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<Awaited<
    ReturnType<typeof createInBrowserFaceLandmarker>
  > | null>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const hasEnteredFullscreenRef = useRef(false);
  const lastViolationTsRef = useRef<number>(0);
  const submittingRef = useRef(false);
  const examLockedRef = useRef(false);

  // Timers for sustained AI anomalies
  const noFaceSinceRef = useRef<number | null>(null);
  const multiFaceSinceRef = useRef<number | null>(null);
  const lookAwaySinceRef = useRef<number | null>(null);
  const darkFrameSinceRef = useRef<number | null>(null);
  const lastAiViolationTsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    examLockedRef.current = examLocked;
  }, [examLocked]);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const captureWebcamSnapshot = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null;
    try {
      const canvas = document.createElement("canvas");
      const width = 320;
      const height =
        Math.round((video.videoHeight / video.videoWidth) * width) || 240;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, width, height);
      return canvas.toDataURL("image/jpeg", 0.6);
    } catch {
      return null;
    }
  }, []);

  const submitExam = useCallback(
    async (reason: "USER_SUBMIT" | "TIME_EXPIRED" | "VIOLATION_LIMIT") => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      try {
        await fetch("/api/exam/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
      } finally {
        stopCameraStream();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => null);
        }
        router.replace("/submitted");
      }
    },
    [router, stopCameraStream]
  );

  /**
   * Logs a violation to the server. When lockScreen=true (tab switch / blur / fullscreen exit),
   * immediately stops the camera stream and locks the exam behind the full-screen "Exam Locked" overlay.
   */
  const reportViolation = useCallback(
    async (
      type: string,
      details: string,
      options: { lockScreen?: boolean } = {}
    ) => {
      if (submittingRef.current || loading) return;

      const now = Date.now();
      if (options.lockScreen) {
        if (examLockedRef.current) return;
        if (now - lastViolationTsRef.current < 1500) return;
        lastViolationTsRef.current = now;
      } else {
        const lastSame = lastAiViolationTsRef.current[type] ?? 0;
        if (now - lastSame < 8000) return; // avoid spamming same AI violation every frame
        lastAiViolationTsRef.current[type] = now;
      }

      // Capture snapshot BEFORE stopping camera stream
      const screenshot = captureWebcamSnapshot();

      if (options.lockScreen) {
        stopCameraStream();
        setExamLocked(true);
        examLockedRef.current = true;
        setLockReason(details);
      }

      try {
        const res = await fetch("/api/exam/violation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, details, screenshot }),
        });
        const data = await res.json();
        const nextCount =
          typeof data.violationCount === "number"
            ? data.violationCount
            : violationCount + 1;
        setViolationCount(nextCount);

        if (data.autoSubmitted) {
          stopCameraStream();
          setExamLocked(true);
          examLockedRef.current = true;
          setAutoSubmittingLock(true);
          setLockReason(
            `Violation limit reached (${nextCount}/${
              data.maxViolations ?? maxViolations
            }). Status: Auto-Submitted (Violation).`
          );
          setTimeout(() => {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => null);
            }
            router.replace("/submitted");
          }, 2000);
        } else if (!options.lockScreen) {
          setAiBannerWarning(
            `AI Proctor Warning (${nextCount}/${
              data.maxViolations ?? maxViolations
            }): ${details}`
          );
          setTimeout(() => setAiBannerWarning(null), 7000);
        }
      } catch {
        // Keep lock active if lockScreen was triggered
      }
    },
    [
      captureWebcamSnapshot,
      loading,
      maxViolations,
      router,
      stopCameraStream,
      violationCount,
    ]
  );

  const startCameraStream = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraActive(false);
      setCameraError("Browser does not support webcam proctoring.");
      setProctorStatus("UNSUPPORTED");
      return;
    }
    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setCameraError(null);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          if (!examLockedRef.current && !submittingRef.current) {
            setCameraActive(false);
            setCameraError("Camera turned off mid-exam!");
            reportViolation(
              "CAMERA_OFF",
              "Webcam stream was turned off or disconnected mid-exam"
            );
          }
        };
      }
    } catch {
      setCameraActive(false);
      setCameraError("Camera permission denied or blocked.");
      reportViolation(
        "CAMERA_OFF",
        "Webcam permission denied or unavailable during exam"
      );
    }
  }, [reportViolation, stopCameraStream]);

  // Initialize exam session
  useEffect(() => {
    async function initExam() {
      try {
        const res = await fetch("/api/exam/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agreedToRules: true }),
        });
        const data = await res.json();
        if (res.status === 401) {
          router.replace("/");
          return;
        }
        if (res.status === 403 && data.alreadySubmitted) {
          router.replace("/submitted");
          return;
        }
        if (res.status === 400) {
          router.replace("/dashboard");
          return;
        }
        if (!res.ok) {
          router.replace("/dashboard");
          return;
        }

        setQuestions(data.questions || []);
        setDomainName(data.domain || "");
        setAnswers(data.savedAnswers || {});
        setMarked(new Set(data.markedReview || []));
        setExpiresAt(data.expiresAt);
        setServerOffset(data.serverTime - Date.now());
        setViolationCount(data.violationCount || 0);
        setMaxViolations(data.maxViolations || 2);
        setLoading(false);
      } catch {
        router.replace("/dashboard");
      }
    }
    initExam();
  }, [router]);

  // Start camera & force fullscreen on exam load
  useEffect(() => {
    if (loading) return;
    startCameraStream();
    if (
      document.documentElement.requestFullscreen &&
      !document.fullscreenElement
    ) {
      document.documentElement.requestFullscreen().catch(() => null);
    }
    return () => {
      stopCameraStream();
    };
  }, [loading, startCameraStream, stopCameraStream]);

  // Load MediaPipe FaceLandmarker in-browser
  useEffect(() => {
    if (loading) return;
    let cancelled = false;

    async function loadAI() {
      try {
        const landmarker = await createInBrowserFaceLandmarker();
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setProctorStatus("OK");
      } catch (err) {
        console.warn("[AI Proctor] FaceLandmarker init failed:", err);
        if (!cancelled) {
          setProctorStatus("UNSUPPORTED");
        }
      }
    }

    loadAI();
    return () => {
      cancelled = true;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, [loading]);

  // Real-time In-Browser Face Detection Loop (every 700ms)
  useEffect(() => {
    if (loading || !cameraActive || examLocked) return;

    if (!scratchCanvasRef.current) {
      scratchCanvasRef.current = document.createElement("canvas");
    }

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (
        !video ||
        video.readyState < 2 ||
        examLockedRef.current ||
        submittingRef.current
      ) {
        return;
      }

      const now = Date.now();

      // 1. Check if camera is covered/blocked (pitch-black frame)
      if (
        scratchCanvasRef.current &&
        isFrameBlockedOrDark(video, scratchCanvasRef.current)
      ) {
        setProctorStatus("CAMERA_BLOCKED");
        if (!darkFrameSinceRef.current) darkFrameSinceRef.current = now;
        if (now - darkFrameSinceRef.current > 4000) {
          darkFrameSinceRef.current = now;
          reportViolation(
            "CAMERA_OFF",
            "Camera lens blocked or dark frame detected for >4s"
          );
        }
        return;
      } else {
        darkFrameSinceRef.current = null;
      }

      // 2. Run MediaPipe FaceLandmarker in-browser
      const landmarker = landmarkerRef.current;
      if (!landmarker) return;

      try {
        const result = analyzeFaceLandmarks(landmarker, video, performance.now());
        setFaceCount(result.faceCount);
        setProctorStatus(result.status);

        if (result.status === "NO_FACE") {
          if (!noFaceSinceRef.current) noFaceSinceRef.current = now;
          multiFaceSinceRef.current = null;
          lookAwaySinceRef.current = null;

          if (now - noFaceSinceRef.current > 5000) {
            noFaceSinceRef.current = now;
            reportViolation(
              "NO_FACE",
              "No face detected in camera frame for more than 5 seconds"
            );
          }
        } else if (result.status === "MULTIPLE_FACES") {
          noFaceSinceRef.current = null;
          lookAwaySinceRef.current = null;
          if (!multiFaceSinceRef.current) multiFaceSinceRef.current = now;

          if (now - multiFaceSinceRef.current > 1500) {
            multiFaceSinceRef.current = now;
            reportViolation(
              "MULTIPLE_FACES",
              `Multiple faces (${result.faceCount}) detected in camera frame`
            );
          }
        } else if (result.status === "LOOKING_AWAY") {
          noFaceSinceRef.current = null;
          multiFaceSinceRef.current = null;
          if (!lookAwaySinceRef.current) lookAwaySinceRef.current = now;

          if (now - lookAwaySinceRef.current > 3500) {
            lookAwaySinceRef.current = now;
            reportViolation(
              "LOOKING_AWAY",
              `Candidate looking away (${result.direction ?? "SIDE"}) for a sustained period`
            );
          }
        } else {
          noFaceSinceRef.current = null;
          multiFaceSinceRef.current = null;
          lookAwaySinceRef.current = null;
        }
      } catch {
        // Ignore single frame detection error
      }
    }, 700);

    return () => clearInterval(interval);
  }, [cameraActive, examLocked, loading, reportViolation]);

  // Periodic Snapshot Capture & Upload every 30 seconds
  useEffect(() => {
    if (loading || !cameraActive || examLocked) return;

    const uploadSnapshot = async () => {
      if (examLockedRef.current || submittingRef.current) return;
      const image = captureWebcamSnapshot();
      if (!image) return;
      await fetch("/api/exam/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      }).catch(() => null);
    };

    // Initial snapshot shortly after exam starts, then every 30s
    const initialTimer = setTimeout(uploadSnapshot, 5000);
    const interval = setInterval(uploadSnapshot, 30_000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [cameraActive, captureWebcamSnapshot, examLocked, loading]);

  // Countdown Timer synced with server
  useEffect(() => {
    if (loading || !expiresAt) return;

    const tick = () => {
      const nowServer = Date.now() + serverOffset;
      const diff = expiresAt - nowServer;
      setRemainingMs(Math.max(0, diff));
      if (diff <= 0 && !submittingRef.current) {
        submitExam("TIME_EXPIRED");
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, loading, serverOffset, submitExam]);

  // Tab switch / Window Blur / Fullscreen Exit / Anti-Cheat Listeners
  useEffect(() => {
    if (loading) return;

    if (document.fullscreenElement) {
      hasEnteredFullscreenRef.current = true;
      setIsFullscreen(true);
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        reportViolation(
          "TAB_SWITCH",
          "Tab switch or browser minimization detected",
          { lockScreen: true }
        );
      }
    };

    const onBlur = () => {
      reportViolation(
        "WINDOW_BLUR",
        "Focus left the assessment window",
        { lockScreen: true }
      );
    };

    const onFullscreenChange = () => {
      const fs = Boolean(document.fullscreenElement);
      setIsFullscreen(fs);
      if (fs) {
        hasEnteredFullscreenRef.current = true;
      } else if (hasEnteredFullscreenRef.current && !submittingRef.current) {
        reportViolation(
          "FULLSCREEN_EXIT",
          "Exited fullscreen mode during assessment",
          { lockScreen: true }
        );
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      reportViolation("COPY_PASTE", "Right-click context menu blocked");
    };

    const onClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation("COPY_PASTE", "Copy/Cut/Paste action blocked");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isDevTools =
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (key === "i" || key === "j" || key === "c")) ||
        ((e.ctrlKey || e.metaKey) && key === "u");

      const isCopyShortcut =
        (e.ctrlKey || e.metaKey) &&
        (key === "c" || key === "v" || key === "x" || key === "a");

      if (isDevTools) {
        e.preventDefault();
        reportViolation(
          "DEVTOOLS_ATTEMPT",
          `Developer tools shortcut blocked (${e.key})`
        );
      } else if (isCopyShortcut || e.key === "PrintScreen") {
        e.preventDefault();
        reportViolation("COPY_PASTE", `Restricted shortcut blocked (${e.key})`);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onClipboard);
    document.addEventListener("cut", onClipboard);
    document.addEventListener("paste", onClipboard);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onClipboard);
      document.removeEventListener("cut", onClipboard);
      document.removeEventListener("paste", onClipboard);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [loading, reportViolation]);

  async function enterFullscreen() {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen().catch(() => null);
    }
  }

  async function handleAcknowledgeAndResume() {
    if (autoSubmittingLock) return;
    await enterFullscreen();
    setExamLocked(false);
    examLockedRef.current = false;
    setLockReason("");
    await startCameraStream();
  }

  async function saveAnswerToServer(
    questionId: string,
    selectedIndex?: number | null,
    markedReview?: boolean
  ) {
    setSaveState("saving");
    try {
      const res = await fetch("/api/exam/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, selectedIndex, markedReview }),
      });
      const data = await res.json();
      if (data.expired || data.alreadySubmitted) {
        router.replace("/submitted");
        return;
      }
      setSaveState(res.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }

  function handleSelectOption(questionId: string, optionIdx: number) {
    if (examLocked) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
    saveAnswerToServer(questionId, optionIdx, undefined);
  }

  function handleClearOption(questionId: string) {
    if (examLocked) return;
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
    saveAnswerToServer(questionId, null, undefined);
  }

  function handleToggleMark(questionId: string) {
    if (examLocked) return;
    const nextMarked = !marked.has(questionId);
    setMarked((prev) => {
      const copy = new Set(prev);
      if (nextMarked) copy.add(questionId);
      else copy.delete(questionId);
      return copy;
    });
    saveAnswerToServer(questionId, undefined, nextMarked);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass-card rounded-3xl px-8 py-6 text-sm text-purple-200">
          Preparing your AI-proctored KORLANCE assessment...
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const markedCount = marked.size;
  const unansweredCount = questions.length - answeredCount;
  const isLowTime = remainingMs < 5 * 60 * 1000;

  const proctorBadge = (() => {
    switch (proctorStatus) {
      case "OK":
        return {
          text: "AI Verified",
          cls: "border-emerald-400/40 bg-emerald-500/20 text-emerald-200",
        };
      case "NO_FACE":
        return {
          text: "No Face",
          cls: "border-rose-400/50 bg-rose-500/25 text-rose-200",
        };
      case "MULTIPLE_FACES":
        return {
          text: `${faceCount} Faces!`,
          cls: "border-rose-400/50 bg-rose-500/25 text-rose-200",
        };
      case "LOOKING_AWAY":
        return {
          text: "Looking Away",
          cls: "border-amber-400/50 bg-amber-500/25 text-amber-200",
        };
      case "CAMERA_BLOCKED":
        return {
          text: "Cam Blocked",
          cls: "border-rose-400/50 bg-rose-500/25 text-rose-200",
        };
      case "UNSUPPORTED":
        return {
          text: "Basic Proctor",
          cls: "border-purple-300/25 bg-white/10 text-purple-200",
        };
      default:
        return {
          text: "AI Loading...",
          cls: "border-purple-300/25 bg-white/10 text-purple-200",
        };
    }
  })();

  return (
    <div className="flex min-h-screen flex-col select-none">
      {/* Top Exam Control Bar */}
      <header className="sticky top-0 z-40 border-b border-purple-300/15 bg-[#0B0614]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <KorlanceLogo size="sm" />
            <div className="hidden h-6 w-px bg-purple-300/15 md:block" />
            <div className="hidden md:block">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-200">
                {domainName ? `${domainName} Assessment` : "AI-Proctored Assessment"}
              </p>
              <p className="text-[11px] text-[#C4B5FD]/85">
                Build capability &bull; Lead tomorrow &bull;{" "}
                {saveState === "saving"
                  ? "Saving..."
                  : saveState === "error"
                  ? "Offline - retrying"
                  : "Auto-saved"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isFullscreen && (
              <button
                onClick={enterFullscreen}
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/40 bg-blue-500/20 px-3 py-1.5 text-xs font-semibold text-blue-200 transition hover:bg-blue-500/30"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Enter Fullscreen</span>
              </button>
            )}

            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                violationCount > 0
                  ? "border-rose-400/40 bg-rose-500/20 text-rose-200"
                  : "border-purple-300/20 bg-white/5 text-purple-200"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>
                Violations: {violationCount}/{maxViolations}
              </span>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-extrabold tabular-nums ${
                isLowTime
                  ? "animate-pulse border-rose-400/50 bg-rose-500/25 text-rose-100"
                  : "border-purple-400/35 bg-purple-500/20 text-white"
              }`}
            >
              <Clock className="h-4 w-4 text-purple-200" />
              <span>{formatTimer(remainingMs)}</span>
            </div>

            <button
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition hover:brightness-110"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Submit</span>
            </button>
          </div>
        </div>
      </header>

      {/* AI Proctor Warning Banner */}
      {aiBannerWarning && (
        <div className="mx-auto mt-4 w-full max-w-7xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-400/50 bg-rose-500/20 px-4 py-3 text-sm font-semibold text-rose-100 shadow-lg">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-300" />
              <span>{aiBannerWarning}</span>
            </div>
            <button
              onClick={() => setAiBannerWarning(null)}
              className="text-xs text-rose-200 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Exam Split View */}
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
        <section className="lg:col-span-8">
          {currentQuestion && (
            <div className="glass-card flex h-full flex-col justify-between rounded-3xl p-6 sm:p-8">
              <div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-3.5 py-1 text-xs font-bold text-white">
                      Question {currentIdx + 1} of {questions.length}
                    </span>
                    <span className="rounded-full border border-purple-400/30 bg-purple-500/15 px-3 py-1 text-xs font-semibold text-purple-200">
                      {currentQuestion.domain}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleMark(currentQuestion.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                      marked.has(currentQuestion.id)
                        ? "border-amber-400/50 bg-amber-500/20 text-amber-200"
                        : "border-purple-300/20 bg-white/5 text-purple-200 hover:bg-white/10"
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>
                      {marked.has(currentQuestion.id)
                        ? "Marked for Review"
                        : "Mark for Review"}
                    </span>
                  </button>
                </div>

                <h2 className="text-lg font-semibold leading-relaxed text-white sm:text-xl">
                  {currentQuestion.prompt}
                </h2>

                <div className="mt-6 space-y-3">
                  {currentQuestion.options.map((opt, optIdx) => {
                    const isSelected = answers[currentQuestion.id] === optIdx;
                    const letter = String.fromCharCode(65 + optIdx);
                    return (
                      <button
                        key={`${currentQuestion.id}-${optIdx}`}
                        type="button"
                        onClick={() =>
                          handleSelectOption(currentQuestion.id, optIdx)
                        }
                        className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? "border-violet-400 bg-gradient-to-r from-violet-600/35 to-blue-600/25 text-white shadow-md shadow-purple-600/20"
                            : "border-purple-300/15 bg-white/[0.03] text-purple-100/90 hover:border-purple-400/40 hover:bg-white/[0.07]"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${
                            isSelected
                              ? "bg-violet-500 text-white"
                              : "bg-white/10 text-purple-200"
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="text-sm leading-relaxed sm:text-base">
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-purple-300/15 pt-5">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                    className="inline-flex items-center gap-1.5 rounded-full border border-purple-300/25 bg-white/5 px-4 py-2.5 text-xs font-bold text-purple-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>

                  {answers[currentQuestion.id] !== undefined && (
                    <button
                      type="button"
                      onClick={() => handleClearOption(currentQuestion.id)}
                      className="rounded-full border border-purple-300/20 px-4 py-2.5 text-xs font-semibold text-purple-200/80 transition hover:bg-white/10"
                    >
                      Clear Answer
                    </button>
                  )}
                </div>

                {currentIdx < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIdx((i) =>
                        Math.min(questions.length - 1, i + 1)
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-600/30 transition hover:brightness-110"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition hover:brightness-110"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Finish &amp; Submit</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right Sidebar: Question Palette */}
        <aside className="lg:col-span-4">
          <div className="glass-card rounded-3xl p-5 sm:p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-purple-200">
              Question Palette
            </h3>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 p-2.5">
                <p className="text-lg font-extrabold text-emerald-300">
                  {answeredCount}
                </p>
                <p className="text-[11px] text-emerald-200/80">Answered</p>
              </div>
              <div className="rounded-2xl border border-amber-400/25 bg-amber-500/15 p-2.5">
                <p className="text-lg font-extrabold text-amber-300">
                  {markedCount}
                </p>
                <p className="text-[11px] text-amber-200/80">Review</p>
              </div>
              <div className="rounded-2xl border border-purple-300/15 bg-white/5 p-2.5">
                <p className="text-lg font-extrabold text-purple-200">
                  {unansweredCount}
                </p>
                <p className="text-[11px] text-purple-200/70">Remaining</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-5 gap-2.5 sm:grid-cols-6 lg:grid-cols-5">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined;
                const isMarked = marked.has(q.id);
                const isCurrent = idx === currentIdx;

                let style =
                  "border-purple-300/20 bg-white/5 text-purple-200 hover:bg-white/10";
                if (isAnswered && isMarked) {
                  style =
                    "border-amber-400 bg-gradient-to-br from-emerald-500/40 to-amber-500/40 text-white";
                } else if (isMarked) {
                  style = "border-amber-400/60 bg-amber-500/25 text-amber-100";
                } else if (isAnswered) {
                  style =
                    "border-emerald-400/50 bg-emerald-500/25 text-emerald-100";
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`relative flex h-10 items-center justify-center rounded-xl border text-xs font-bold transition ${style} ${
                      isCurrent
                        ? "ring-2 ring-violet-400 ring-offset-2 ring-offset-[#0B0614]"
                        : ""
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 space-y-2 border-t border-purple-300/15 pt-4 text-xs text-purple-200/80">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-emerald-400 bg-emerald-500/40" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-amber-400 bg-amber-500/35" />
                <span>Marked for Review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-purple-300/25 bg-white/10" />
                <span>Not Answered</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Corner Live AI Camera Preview Widget */}
      <div className="fixed bottom-4 right-4 z-40 w-44 overflow-hidden rounded-2xl border border-purple-400/35 bg-[#0D071B]/95 shadow-2xl shadow-black/70 backdrop-blur-xl sm:w-52">
        <div className="relative aspect-[4/3] w-full bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/85 p-2 text-center">
              <CameraOff className="h-5 w-5 text-rose-400" />
              <span className="text-[11px] font-semibold text-rose-200">
                {cameraError || "Camera Stopped"}
              </span>
            </div>
          )}
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                cameraActive ? "animate-pulse bg-emerald-400" : "bg-rose-500"
              }`}
            />
            <span>{cameraActive ? "LIVE AI" : "OFF"}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-1.5 px-2.5 py-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${proctorBadge.cls}`}
          >
            {proctorStatus === "MULTIPLE_FACES" ? (
              <Users className="h-3 w-3" />
            ) : proctorStatus === "LOOKING_AWAY" ? (
              <Eye className="h-3 w-3" />
            ) : (
              <Camera className="h-3 w-3" />
            )}
            <span>{proctorBadge.text}</span>
          </span>
          <span className="text-[10px] text-purple-300/70">30s snap</span>
        </div>
      </div>

      {/* Full-Screen "Exam Locked" Overlay on Tab Switch / Window Blur / Fullscreen Exit */}
      {examLocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06030D]/95 p-6 backdrop-blur-xl">
          <div className="glass-card max-w-lg rounded-3xl border border-rose-500/50 p-8 text-center shadow-2xl shadow-rose-950/50">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-400/40 bg-rose-500/20 text-rose-300">
              <Lock className="h-8 w-8" />
            </div>

            <span className="mt-4 inline-flex rounded-full border border-rose-400/40 bg-rose-500/20 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-rose-200">
              Exam Locked &bull; Violation {violationCount} / {maxViolations}
            </span>

            <h2 className="mt-4 text-2xl font-extrabold text-white">
              {autoSubmittingLock
                ? "Auto-Submitted (Violation)"
                : "Focus Violation Detected"}
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-rose-100/90">
              {lockReason}
            </p>

            {!autoSubmittingLock ? (
              <>
                <p className="mt-3 text-xs text-purple-200/80">
                  Your camera stream was stopped and this incident has been
                  logged with a timestamp.{" "}
                  <strong className="text-rose-200">
                    One more violation will automatically submit your exam.
                  </strong>
                </p>
                <button
                  onClick={handleAcknowledgeAndResume}
                  className="mt-6 w-full rounded-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
                >
                  Acknowledge, Restart Camera &amp; Resume Exam
                </button>
              </>
            ) : (
              <p className="mt-4 text-xs font-semibold text-rose-200">
                Redirecting to submission confirmation...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="glass-card max-w-md rounded-3xl p-6">
            <h3 className="text-xl font-bold text-white">
              Submit Assessment?
            </h3>
            <p className="mt-2 text-sm text-purple-200/80">
              Once submitted, you cannot modify your answers or re-attempt the
              assessment.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-white/5 p-3 text-center text-xs">
              <div>
                <p className="text-base font-bold text-emerald-300">
                  {answeredCount}
                </p>
                <p className="text-purple-200/70">Answered</p>
              </div>
              <div>
                <p className="text-base font-bold text-amber-300">
                  {markedCount}
                </p>
                <p className="text-purple-200/70">Marked</p>
              </div>
              <div>
                <p className="text-base font-bold text-purple-200">
                  {unansweredCount}
                </p>
                <p className="text-purple-200/70">Unanswered</p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 rounded-full border border-purple-300/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-purple-100 hover:bg-white/10"
              >
                Review Answers
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitExam("USER_SUBMIT")}
                className="flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:brightness-110 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Confirm Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer showLeadershipCard={false} />
    </div>
  );
}
