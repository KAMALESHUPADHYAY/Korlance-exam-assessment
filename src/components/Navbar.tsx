import React from "react";
import Link from "next/link";
import { KorlanceLogo } from "./KorlanceLogo";

interface NavbarProps {
  rightSlot?: React.ReactNode;
  showAdminLink?: boolean;
}

export function Navbar({ rightSlot, showAdminLink = true }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-purple-300/10 bg-[#0B0614]/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="transition-opacity hover:opacity-90">
          <KorlanceLogo size="md" subtitle="Assessment Portal" />
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-purple-400/25 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-200 sm:inline-flex">
            Hyderabad &amp; Bengaluru
          </span>
          {rightSlot}
          {showAdminLink && (
            <Link
              href="/admin"
              className="rounded-full border border-purple-300/20 bg-white/5 px-4 py-1.5 text-xs font-semibold text-purple-100 transition hover:border-purple-400/50 hover:bg-purple-500/20"
            >
              Admin
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
