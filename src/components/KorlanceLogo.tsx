import React from "react";

interface KorlanceLogoProps {
  size?: "sm" | "md" | "lg";
  subtitle?: string;
}

export function KorlanceLogo({ size = "md", subtitle }: KorlanceLogoProps) {
  const iconDim = size === "sm" ? 32 : size === "lg" ? 44 : 38;
  const textSize =
    size === "sm"
      ? "text-base tracking-[0.22em]"
      : size === "lg"
      ? "text-2xl tracking-[0.26em]"
      : "text-lg tracking-[0.24em]";

  return (
    <div className="inline-flex items-center gap-3 select-none">
      <svg
        width={iconDim}
        height={iconDim}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="KORLANCE Logo"
        className="shrink-0 drop-shadow-[0_0_16px_rgba(124,58,237,0.55)]"
      >
        <defs>
          <linearGradient
            id="korlanceKGrad"
            x1="8"
            y1="6"
            x2="58"
            y2="58"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="50%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient
            id="korlanceKInner"
            x1="20"
            y1="14"
            x2="50"
            y2="52"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#E9D5FF" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
        </defs>
        <rect
          x="3"
          y="3"
          width="58"
          height="58"
          rx="16"
          fill="#110824"
          stroke="url(#korlanceKGrad)"
          strokeWidth="2.5"
        />
        {/* Stylized K stem */}
        <path
          d="M19 15C19 13.8954 19.8954 13 21 13H26C27.1046 13 28 13.8954 28 15V49C28 50.1046 27.1046 51 26 51H21C19.8954 51 19 50.1046 19 49V15Z"
          fill="url(#korlanceKGrad)"
        />
        {/* Upper stylized diagonal arm */}
        <path
          d="M28 31L42.5 14.2C43.25 13.34 44.52 13.18 45.46 13.84L48.1 15.68C49.12 16.39 49.28 17.82 48.45 18.74L34.5 34.2L28 31Z"
          fill="url(#korlanceKInner)"
        />
        {/* Lower stylized diagonal leg */}
        <path
          d="M32.2 29.8L48.6 46.5C49.45 47.37 49.32 48.79 48.32 49.49L45.55 51.43C44.62 52.08 43.35 51.92 42.6 51.07L27.5 34L32.2 29.8Z"
          fill="url(#korlanceKGrad)"
        />
      </svg>
      <div className="flex flex-col">
        <span
          className={`font-extrabold uppercase bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent ${textSize}`}
        >
          KORLANCE
        </span>
        {subtitle && (
          <span className="text-[11px] font-medium tracking-wider text-purple-300/80 uppercase">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
