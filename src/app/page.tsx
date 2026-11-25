"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DomainSelect } from "@/components/DomainSelect";

export default function LoginPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCollege = collegeName.trim();

    if (trimmedName.length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid Gmail / email address.");
      return;
    }

    if (trimmedCollege.length < 2) {
      setError("Please enter your college or institution name.");
      return;
    }

    if (!domain) {
      setError("Please select your Domain / Program.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmedName,
          email: trimmedEmail,
          collegeName: trimmedCollege,
          domain,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to sign in. Please check your details.");
        setLoading(false);
        return;
      }

      if (data.student?.status === "IN_PROGRESS") {
        router.push("/exam");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-10 lg:grid-cols-12">
          {/* Left Hero Section */}
          <div className="space-y-6 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/15 px-4 py-1.5 text-xs font-semibold text-purple-200">
              <Sparkles className="h-3.5 w-3.5 text-purple-300" />
              <span>KORLANCE &bull; Hyderabad &amp; Bengaluru</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Technical Placement{" "}
              <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">
                Assessment Portal
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-purple-100/80 sm:text-lg">
              Choose your specialized domain from 16 industry tracks and
              complete your AI-proctored 30-minute technical evaluation.
            </p>

            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-2 text-purple-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Questions
                  </span>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-white">
                  30 MCQs
                </p>
                <p className="text-xs text-purple-200/70">Domain Specific</p>
              </div>

              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-2 text-blue-300">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Duration
                  </span>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-white">
                  30 Mins
                </p>
                <p className="text-xs text-purple-200/70">Auto-save enabled</p>
              </div>

              <div className="glass-card col-span-2 rounded-2xl p-4 sm:col-span-1">
                <div className="flex items-center gap-2 text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Integrity
                  </span>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-white">
                  1 Attempt
                </p>
                <p className="text-xs text-purple-200/70">AI Proctored</p>
              </div>
            </div>
          </div>

          {/* Right Login Card */}
          <div className="lg:col-span-5">
            <div className="glass-card glow-purple rounded-3xl p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Candidate Sign In
                </h2>
                <p className="mt-1 text-sm text-purple-200/75">
                  Enter your academic details and domain to begin. Only one
                  attempt is allowed per email address.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-purple-200"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-300/70" />
                    <input
                      id="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      className="w-full rounded-2xl border border-purple-300/20 bg-[#0D071B]/80 py-3 pl-11 pr-4 text-sm text-white placeholder:text-purple-300/40 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-purple-200"
                  >
                    Gmail Address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-300/70" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. aarav.sharma@gmail.com"
                      className="w-full rounded-2xl border border-purple-300/20 bg-[#0D071B]/80 py-3 pl-11 pr-4 text-sm text-white placeholder:text-purple-300/40 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="collegeName"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-purple-200"
                  >
                    College Name
                  </label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-300/70" />
                    <input
                      id="collegeName"
                      type="text"
                      required
                      value={collegeName}
                      onChange={(e) => setCollegeName(e.target.value)}
                      placeholder="e.g. JNTU Hyderabad / RVCE Bengaluru"
                      className="w-full rounded-2xl border border-purple-300/20 bg-[#0D071B]/80 py-3 pl-11 pr-4 text-sm text-white placeholder:text-purple-300/40 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-purple-200">
                    <Layers className="h-3.5 w-3.5 text-purple-300" />
                    <span>Select Your Domain / Program</span>
                  </label>
                  <DomainSelect value={domain} onChange={setDomain} />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-600/35 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    "Verifying Candidate..."
                  ) : (
                    <>
                      <span>Continue to Assessment Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer showLeadershipCard={false} />
    </div>
  );
}
