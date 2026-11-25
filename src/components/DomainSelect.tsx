"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { DOMAINS } from "@/lib/domains";
import { DomainIcon } from "./DomainIcon";

interface DomainSelectProps {
  value: string;
  onChange: (domain: string) => void;
}

export function DomainSelect({ value, onChange }: DomainSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedMeta = useMemo(
    () => DOMAINS.find((d) => d.name === value) ?? null,
    [value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DOMAINS;
    return DOMAINS.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.topics.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-purple-300/20 bg-[#0D071B]/80 px-4 py-3 text-left text-sm text-white transition hover:border-purple-400/50 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
      >
        <div className="flex min-w-0 items-center gap-3">
          {selectedMeta ? (
            <>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-purple-500/25 text-purple-200">
                <DomainIcon iconKey={selectedMeta.iconKey} className="h-4 w-4" />
              </span>
              <span className="truncate font-semibold text-white">
                {selectedMeta.name}
              </span>
            </>
          ) : (
            <span className="text-purple-300/45">
              Choose your assessment domain / program...
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-purple-300/70 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-purple-300/25 bg-[#120928]/95 shadow-2xl shadow-black/80 backdrop-blur-xl">
          <div className="border-b border-purple-300/15 p-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-purple-300/60" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search domain (e.g. AI, Cloud, VLSI, Finance)..."
                className="w-full rounded-xl border border-purple-300/15 bg-[#0B0614] py-2 pl-9 pr-3 text-xs text-white placeholder:text-purple-300/40 focus:border-purple-400 focus:outline-none"
              />
            </div>
          </div>

          <ul
            role="listbox"
            className="max-h-64 overflow-y-auto p-1.5"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-purple-300/60">
                No matching domain found.
              </li>
            ) : (
              filtered.map((domain) => {
                const active = domain.name === value;
                return (
                  <li key={domain.name}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(domain.name);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        active
                          ? "bg-violet-600/35 text-white"
                          : "text-purple-100 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${domain.border} bg-gradient-to-br ${domain.gradient} text-white`}
                        >
                          <DomainIcon
                            iconKey={domain.iconKey}
                            className="h-4 w-4"
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-white">
                            {domain.name}
                          </p>
                          <p className="truncate text-[11px] text-purple-200/65">
                            {domain.topics}
                          </p>
                        </div>
                      </div>
                      {active && (
                        <Check className="h-4 w-4 shrink-0 text-emerald-300" />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
