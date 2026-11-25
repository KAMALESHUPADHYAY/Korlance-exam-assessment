import React from "react";
import { Award, Mail, MapPin, Phone } from "lucide-react";
import { KorlanceLogo } from "./KorlanceLogo";
import { COMPANY_CONFIG, DEVELOPER_NAME } from "@/config/company";

interface FooterProps {
  showLeadershipCard?: boolean;
}

export function Footer({ showLeadershipCard = false }: FooterProps) {
  return (
    <footer className="mt-12 border-t border-purple-300/10 bg-[#080410]/85 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {showLeadershipCard && (
          <div className="mb-8 rounded-2xl border border-purple-400/25 bg-gradient-to-r from-violet-950/70 via-[#160B33]/80 to-blue-950/60 p-5 shadow-lg">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-lg font-extrabold text-white shadow-md shadow-purple-500/30">
                  HK
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-white">
                      Hari Kumar, CEO, Korlance
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-purple-200">
                      <Award className="h-3 w-3 text-purple-300" />
                      Leadership
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-purple-200/80">
                    Empowering engineering talent across Hyderabad &amp; Bengaluru
                    with industry-ready technical training &amp; placements.
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-serif text-lg italic text-purple-200">
                  Hari Kumar
                </p>
                <p className="text-[11px] uppercase tracking-widest text-purple-300/70">
                  Chief Executive Officer
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col justify-between gap-6 border-b border-purple-300/10 pb-6 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <KorlanceLogo size="sm" />
              <span className="rounded-full border border-purple-400/30 bg-purple-500/15 px-2.5 py-0.5 text-[11px] font-bold tracking-widest text-purple-200">
                {COMPANY_CONFIG.locations}
              </span>
            </div>
            <p className="text-xs text-purple-200/70">
              Precision learning &amp; placement assessments for emerging
              technologists.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-xs text-purple-200/85 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-purple-400" />
              <span>{COMPANY_CONFIG.BENGALURU_ADDRESS}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 shrink-0 text-purple-400" />
              <span>{COMPANY_CONFIG.CONTACT_EMAIL}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0 text-purple-400" />
              <span>{COMPANY_CONFIG.CONTACT_PHONE}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center justify-between gap-2 text-[11px] text-purple-300/65 sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {COMPANY_CONFIG.brand}. All rights
            reserved.
          </p>
          <p className="text-purple-200/75">
            Designed &amp; Developed by {DEVELOPER_NAME}
          </p>
          <p>Hyderabad &bull; Bengaluru</p>
        </div>
      </div>
    </footer>
  );
}
