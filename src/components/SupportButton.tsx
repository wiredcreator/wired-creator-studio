"use client";

import { useState, useRef, useEffect } from "react";
import BugReportModal from "./BugReportModal";

export default function SupportButton() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [menuOpen]);

  // Close menu on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    if (menuOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [menuOpen]);

  return (
    <>
      <div ref={menuRef} className="fixed bottom-6 right-6 z-40">
        {/* Menu */}
        {menuOpen && (
          <div className="absolute bottom-14 right-0 w-56 rounded-[var(--radius-lg)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-xl overflow-hidden mb-2">
            <div className="px-4 py-3 border-b border-[var(--color-border)]">
              <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">Support</p>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">How can we help?</p>
            </div>

            <div className="py-1">
              {/* Coaching Bot — Coming Soon */}
              <button
                disabled
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left opacity-40 cursor-not-allowed"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)]">
                  <svg className="h-3.5 w-3.5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Coaching Bot</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Coming soon</p>
                </div>
              </button>

              {/* Report a Bug */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setBugModalOpen(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--color-bg-tertiary)] transition-colors"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)]">
                  <svg className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152-6.135c-.117-1.994-1.783-3.555-3.805-3.555h-6.5c-2.022 0-3.688 1.561-3.805 3.555a23.91 23.91 0 0 1-1.152 6.135A24.082 24.082 0 0 1 12 12.75ZM2.695 18.91a23.707 23.707 0 0 0 2.55-5.636A24.319 24.319 0 0 0 5.5 10.5c0-1.68.345-3.278.968-4.733a1.045 1.045 0 0 0-.393-1.248A2.233 2.233 0 0 0 4.93 4.13a2.25 2.25 0 0 0-1.834 3.59 23.538 23.538 0 0 1-.276 11.19Zm18.61 0a23.538 23.538 0 0 0-.276-11.19 2.25 2.25 0 0 0-1.834-3.59 2.233 2.233 0 0 0-1.145.39 1.045 1.045 0 0 0-.393 1.247A11.943 11.943 0 0 1 18.5 10.5c0 .974-.058 1.935-.17 2.878a23.707 23.707 0 0 0 2.55 5.636l.425.895Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Report a Bug</p>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">Let us know what went wrong</p>
                </div>
              </button>

              {/* Book a Support Call */}
              <a
                href="https://calendly.com/wired-creator/support"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--color-bg-tertiary)] transition-colors"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)]">
                  <svg className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Book a Support Call</p>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">Schedule a 1-on-1 session</p>
                </div>
              </a>
            </div>
          </div>
        )}

        {/* Floating Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-bg-dark)] shadow-lg hover:opacity-90 transition-all"
          aria-label="Support"
          title="Support"
        >
          {menuOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
            </svg>
          )}
        </button>
      </div>

      {/* Bug Report Modal */}
      <BugReportModal isOpen={bugModalOpen} onClose={() => setBugModalOpen(false)} />
    </>
  );
}
