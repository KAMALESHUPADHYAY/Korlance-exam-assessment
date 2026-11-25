"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { KorlanceLogo } from "@/components/KorlanceLogo";
import { Footer } from "@/components/Footer";

interface StudentRow {
  id: string;
  fullName: string;
  email: string;
  collegeName: string;
  domain: string;
  status: string;
  score: number | null;
  totalQuestions: number;
  violationCount: number;
  startedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  emailSent: boolean;
}

interface DomainAnalytic {
  domain: string;
  studentCount: number;
  completedCount: number;
  avgScore: number;
}

interface AdminStats {
  totalStudents: number;
  submittedCount: number;
  inProgressCount: number;
  autoSubmittedCount: number;
  avgScore: number;
}

interface ViolationItem {
  id: string;
  type: string;
  details: string | null;
  screenshot: string | null;
  createdAt: string;
}

interface DomainBreakdownItem {
  domain: string;
  total: number;
  answered: number;
  correct: number;
}

interface SnapshotItem {
  id: string;
  filePath: string;
  url: string;
  reason: string;
  violationType: string | null;
  createdAt: string;
}

interface StudentDetailResponse {
  student: StudentRow & { answeredCount: number };
  domainBreakdown: DomainBreakdownItem[];
  violations: ViolationItem[];
  snapshots: SnapshotItem[];
}

const STATUS_BADGE: Record<string, string> = {
  NOT_STARTED: "border-slate-400/30 bg-slate-500/15 text-slate-200",
  IN_PROGRESS: "border-blue-400/40 bg-blue-500/20 text-blue-200",
  SUBMITTED: "border-emerald-400/40 bg-emerald-500/20 text-emerald-200",
  AUTO_SUBMITTED: "border-rose-400/45 bg-rose-500/20 text-rose-200",
};

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  AUTO_SUBMITTED: "Auto-Submitted (Violation)",
};

export default function AdminDashboardPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [stats, setStats] = useState<AdminStats>({
    totalStudents: 0,
    submittedCount: 0,
    inProgressCount: 0,
    autoSubmittedCount: 0,
    avgScore: 0,
  });
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [colleges, setColleges] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [domainAnalytics, setDomainAnalytics] = useState<DomainAnalytic[]>([]);
  const [showScoreOnSubmit, setShowScoreOnSubmit] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [collegeFilter, setCollegeFilter] = useState("ALL");
  const [domainFilter, setDomainFilter] = useState("ALL");
  const [lastSynced, setLastSynced] = useState<number | null>(null);

  const [selectedDetail, setSelectedDetail] =
    useState<StudentDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchDashboard = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (collegeFilter !== "ALL") params.set("college", collegeFilter);
    if (domainFilter !== "ALL") params.set("domain", domainFilter);

    const res = await fetch(`/api/admin/students?${params.toString()}`);
    if (res.status === 401) {
      setAuthenticated(false);
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setStats(data.stats);
    setStudents(data.students);
    setColleges(data.colleges);
    setDomains(data.domains || []);
    setDomainAnalytics(data.domainAnalytics || []);
    setShowScoreOnSubmit(Boolean(data.settings?.showScoreOnSubmit));
    setLastSynced(data.syncedAt);
  }, [collegeFilter, domainFilter, search, statusFilter]);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/admin/login");
        if (res.ok) {
          setAuthenticated(true);
        }
      } finally {
        setAuthChecked(true);
      }
    }
    checkSession();
  }, []);

  // Poll every 10 seconds when authenticated
  useEffect(() => {
    if (!authenticated) return;
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10_000);
    return () => clearInterval(interval);
  }, [authenticated, fetchDashboard]);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Invalid credentials");
        setLoggingIn(false);
        return;
      }
      setAuthenticated(true);
      setPassword("");
    } catch {
      setLoginError("Network error while signing in.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthenticated(false);
  }

  async function toggleShowScore() {
    const next = !showScoreOnSubmit;
    setShowScoreOnSubmit(next);
    await fetch("/api/admin/students", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showScoreOnSubmit: next }),
    });
  }

  async function openStudentDetail(id: string) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/students/${id}`);
      if (res.ok) {
        const data = (await res.json()) as StudentDetailResponse;
        setSelectedDetail(data);
      }
    } finally {
      setLoadingDetail(false);
    }
  }

  async function deleteStudent(id: string) {
    if (!confirm("Delete this student record and allow a fresh attempt?")) {
      return;
    }
    await fetch(`/api/admin/students/${id}`, { method: "DELETE" });
    setSelectedDetail(null);
    fetchDashboard();
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass-card rounded-3xl px-8 py-6 text-sm text-purple-200">
          Checking admin session...
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="mb-8">
          <KorlanceLogo size="lg" subtitle="Admin Portal" />
        </div>
        <div className="glass-card glow-purple w-full max-w-md rounded-3xl p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-300">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Sign In</h1>
              <p className="text-xs text-purple-200/75">
                Protected KORLANCE Assessment Control Center
              </p>
            </div>
          </div>

          {loginError && (
            <div className="mb-4 rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-xs text-rose-200">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-purple-200">
                Admin Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                className="w-full rounded-2xl border border-purple-300/20 bg-[#0D071B]/80 px-4 py-3 text-sm text-white placeholder:text-purple-300/40 focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-purple-200">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full rounded-2xl border border-purple-300/20 bg-[#0D071B]/80 px-4 py-3 text-sm text-white placeholder:text-purple-300/40 focus:border-purple-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-600/35 transition hover:brightness-110"
            >
              {loggingIn ? "Signing In..." : "Access Admin Dashboard"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/"
              className="text-xs font-medium text-purple-300/80 hover:text-white"
            >
              &larr; Back to Student Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const exportUrl = `/api/admin/export?status=${encodeURIComponent(
    statusFilter
  )}&college=${encodeURIComponent(collegeFilter)}&domain=${encodeURIComponent(
    domainFilter
  )}`;

  return (
    <div className="min-h-screen pb-12">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-30 border-b border-purple-300/15 bg-[#0B0614]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <KorlanceLogo size="sm" subtitle="Admin Console" />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Live Polling (10s)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={toggleShowScore}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                showScoreOnSubmit
                  ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                  : "border-purple-300/20 bg-white/5 text-purple-200"
              }`}
            >
              Score on Submit: {showScoreOnSubmit ? "Visible" : "Hidden"}
            </button>

            <a
              href={exportUrl}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-purple-600/30 transition hover:brightness-110"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </a>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-purple-300/20 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-purple-100 hover:bg-rose-500/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 pt-8 sm:px-6 lg:px-8">
        {/* Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-3xl border border-violet-400/30 bg-gradient-to-br from-violet-600/25 to-purple-900/30 p-5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-violet-200">
              <span>Total Students</span>
              <Users className="h-4 w-4" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {stats.totalStudents}
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-600/25 to-teal-900/30 p-5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-emerald-200">
              <span>Submitted</span>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {stats.submittedCount}
            </p>
          </div>

          <div className="rounded-3xl border border-blue-400/30 bg-gradient-to-br from-blue-600/25 to-indigo-900/30 p-5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-blue-200">
              <span>In Progress</span>
              <Clock className="h-4 w-4" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {stats.inProgressCount}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-600/25 to-orange-900/30 p-5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-amber-200">
              <span>Auto-Submitted</span>
              <ShieldAlert className="h-4 w-4" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {stats.autoSubmittedCount}
            </p>
          </div>

          <div className="rounded-3xl border border-pink-400/30 bg-gradient-to-br from-pink-600/25 to-rose-900/30 p-5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-pink-200">
              <span>Average Score</span>
              <Award className="h-4 w-4" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {stats.avgScore}
              <span className="text-sm font-medium text-pink-200/75"> / 30</span>
            </p>
          </div>
        </div>

        {/* Domain-wise Count & Average Score Chart */}
        {domainAnalytics.length > 0 && (
          <div className="glass-card rounded-3xl p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-purple-200">
                  Domain-wise Participation &amp; Average Score
                </h2>
                <p className="text-xs text-purple-200/70">
                  Candidate distribution and mean score (out of 30) across all
                  16 domains
                </p>
              </div>
              <span className="text-xs font-semibold text-[#C4B5FD]">
                {domainAnalytics.filter((d) => d.studentCount > 0).length} / 16
                active tracks
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {domainAnalytics.map((item) => {
                const maxCount = Math.max(
                  1,
                  ...domainAnalytics.map((x) => x.studentCount)
                );
                const barWidth = Math.round(
                  (item.studentCount / maxCount) * 100
                );
                return (
                  <div
                    key={item.domain}
                    className="rounded-2xl border border-purple-300/15 bg-white/[0.03] p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-bold text-white">
                        {item.domain}
                      </span>
                      <span className="shrink-0 rounded-full bg-purple-500/20 px-2 py-0.5 text-[11px] font-bold text-purple-200">
                        {item.studentCount}{" "}
                        {item.studentCount === 1 ? "student" : "students"}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-400 to-blue-500 transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-purple-200/75">
                      <span>Completed: {item.completedCount}</span>
                      <span className="font-semibold text-emerald-300">
                        Avg:{" "}
                        {item.completedCount > 0
                          ? `${item.avgScore}/30`
                          : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="glass-card flex flex-col gap-3 rounded-3xl p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-300/70" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student by name, email, or college..."
              className="w-full rounded-full border border-purple-300/20 bg-[#0D071B]/80 py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-purple-300/40 focus:border-purple-400 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-full border border-purple-300/20 bg-[#0D071B] px-4 py-2.5 text-xs font-semibold text-purple-100 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="AUTO_SUBMITTED">Auto-Submitted</option>
            </select>

            <select
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              className="max-w-[200px] rounded-full border border-purple-300/20 bg-[#0D071B] px-4 py-2.5 text-xs font-semibold text-purple-100 focus:outline-none"
            >
              <option value="ALL">All Colleges</option>
              {colleges.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="max-w-[200px] rounded-full border border-purple-300/20 bg-[#0D071B] px-4 py-2.5 text-xs font-semibold text-purple-100 focus:outline-none"
            >
              <option value="ALL">All Domains</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <button
              onClick={fetchDashboard}
              className="inline-flex items-center gap-1.5 rounded-full border border-purple-300/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-purple-100 hover:bg-white/10"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Students Table */}
        <div className="glass-card overflow-hidden rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-purple-300/15 bg-white/[0.03] text-xs uppercase tracking-wider text-purple-200/75">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">College</th>
                  <th className="px-5 py-4">Domain</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Score</th>
                  <th className="px-5 py-4">Violations</th>
                  <th className="px-5 py-4">Submitted At</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-300/10">
                {students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-sm text-purple-200/70"
                    >
                      No candidates match the current filter.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => openStudentDetail(s.id)}
                      className="cursor-pointer transition hover:bg-white/[0.04]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">{s.fullName}</p>
                        <p className="text-xs text-purple-200/70">{s.email}</p>
                      </td>
                      <td className="px-5 py-4 text-purple-100/90">
                        {s.collegeName}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-purple-400/30 bg-purple-500/15 px-2.5 py-0.5 text-xs font-semibold text-purple-200">
                          {s.domain}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                            STATUS_BADGE[s.status] || STATUS_BADGE.NOT_STARTED
                          }`}
                        >
                          {STATUS_LABEL[s.status] || s.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-white">
                        {s.score !== null
                          ? `${s.score} / ${s.totalQuestions}`
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            s.violationCount > 0
                              ? "bg-rose-500/20 text-rose-200"
                              : "bg-white/5 text-purple-200/70"
                          }`}
                        >
                          {s.violationCount > 0 && (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {s.violationCount}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-purple-200/80">
                        {s.submittedAt
                          ? new Date(s.submittedAt).toLocaleString()
                          : "—"}
                      </td>
                      <td
                        className="px-5 py-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openStudentDetail(s.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-purple-300/25 bg-white/5 px-3 py-1.5 text-xs font-semibold text-purple-100 hover:bg-purple-500/25"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {lastSynced && (
            <div className="border-t border-purple-300/10 px-5 py-2.5 text-right text-[11px] text-purple-300/60">
              Last synced: {new Date(lastSynced).toLocaleTimeString()}
            </div>
          )}
        </div>
      </main>

      {/* Student Detail Modal */}
      {(selectedDetail || loadingDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="glass-card max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl p-6 sm:p-8">
            {loadingDetail || !selectedDetail ? (
              <p className="py-10 text-center text-sm text-purple-200">
                Loading candidate report...
              </p>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                        STATUS_BADGE[selectedDetail.student.status]
                      }`}
                    >
                      {STATUS_LABEL[selectedDetail.student.status]}
                    </span>
                    <h2 className="mt-2 text-2xl font-extrabold text-white">
                      {selectedDetail.student.fullName}
                    </h2>
                    <p className="text-sm text-purple-200/80">
                      {selectedDetail.student.email} &bull;{" "}
                      {selectedDetail.student.collegeName} &bull;{" "}
                      <strong className="text-[#C4B5FD]">
                        {selectedDetail.student.domain}
                      </strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDetail(null)}
                    className="rounded-full bg-white/10 p-2 text-purple-200 hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-white/5 p-3.5">
                    <p className="text-xs text-purple-300/75">Score</p>
                    <p className="mt-1 text-xl font-extrabold text-white">
                      {selectedDetail.student.score !== null
                        ? `${selectedDetail.student.score} / ${selectedDetail.student.totalQuestions}`
                        : "Pending"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3.5">
                    <p className="text-xs text-purple-300/75">Answered</p>
                    <p className="mt-1 text-xl font-extrabold text-white">
                      {selectedDetail.student.answeredCount} /{" "}
                      {selectedDetail.student.totalQuestions}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3.5">
                    <p className="text-xs text-purple-300/75">Violations</p>
                    <p className="mt-1 text-xl font-extrabold text-rose-300">
                      {selectedDetail.student.violationCount}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3.5">
                    <p className="text-xs text-purple-300/75">Email Notice</p>
                    <p className="mt-1 text-sm font-bold text-emerald-300">
                      {selectedDetail.student.emailSent ? "Sent" : "Not Sent"}
                    </p>
                  </div>
                </div>

                {/* Domain Breakdown */}
                {selectedDetail.domainBreakdown.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-purple-200">
                      Domain Performance
                    </h3>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {selectedDetail.domainBreakdown.map((d) => (
                        <div
                          key={d.domain}
                          className="rounded-2xl border border-purple-300/15 bg-white/[0.03] p-3"
                        >
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-white">{d.domain}</span>
                            <span className="text-purple-200">
                              {d.correct}/{d.total} correct
                            </span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                              style={{
                                width: `${
                                  d.total > 0 ? (d.correct / d.total) * 100 : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Violation Log */}
                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-purple-200">
                    Proctoring Violation Log ({selectedDetail.violations.length})
                  </h3>
                  {selectedDetail.violations.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-xs text-emerald-200">
                      Clean session — zero violations recorded.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDetail.violations.map((v) => (
                        <div
                          key={v.id}
                          className="flex flex-col justify-between gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 sm:flex-row sm:items-center"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-rose-500/30 px-2.5 py-0.5 text-[11px] font-bold text-rose-100">
                                {v.type}
                              </span>
                              <span className="text-xs text-purple-200/70">
                                {new Date(v.createdAt).toLocaleString()}
                              </span>
                            </div>
                            {v.details && (
                              <p className="mt-1.5 text-xs text-rose-100/90">
                                {v.details}
                              </p>
                            )}
                          </div>
                          {v.screenshot && (
                            <a
                              href={v.screenshot}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                src={v.screenshot}
                                alt={`Violation snapshot (${v.type})`}
                                className="h-20 w-28 rounded-xl border border-rose-300/30 object-cover transition hover:scale-105"
                              />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Snapshot Gallery */}
                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-purple-200">
                    Proctoring Snapshot Gallery (
                    {selectedDetail.snapshots?.length ?? 0})
                  </h3>
                  {!selectedDetail.snapshots ||
                  selectedDetail.snapshots.length === 0 ? (
                    <div className="rounded-2xl border border-purple-300/15 bg-white/[0.03] p-4 text-xs text-purple-200/70">
                      No periodic or violation snapshots captured yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {selectedDetail.snapshots.map((snap) => (
                        <a
                          key={snap.id}
                          href={snap.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group overflow-hidden rounded-2xl border border-purple-300/20 bg-black/40 transition hover:border-purple-400/60"
                        >
                          <img
                            src={snap.url}
                            alt={`Snapshot ${snap.reason}`}
                            className="aspect-[4/3] w-full object-cover transition group-hover:scale-105"
                          />
                          <div className="p-2 text-[10px]">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 font-bold ${
                                snap.reason === "VIOLATION"
                                  ? "bg-rose-500/30 text-rose-200"
                                  : "bg-blue-500/25 text-blue-200"
                              }`}
                            >
                              {snap.violationType || snap.reason}
                            </span>
                            <p className="mt-1 truncate text-purple-200/70">
                              {new Date(snap.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-between border-t border-purple-300/15 pt-4">
                  <button
                    onClick={() => deleteStudent(selectedDetail.student.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/35 bg-rose-500/15 px-4 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/25"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Reset / Delete Attempt</span>
                  </button>
                  <button
                    onClick={() => setSelectedDetail(null)}
                    className="rounded-full bg-white/10 px-5 py-2 text-xs font-bold text-white hover:bg-white/20"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer showLeadershipCard={false} />
    </div>
  );
}
