"use client";

import { useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import BugReportModal from "@/components/BugReportModal";

export default function SupportPage() {
  const [bugModalOpen, setBugModalOpen] = useState(false);

  return (
    <PageWrapper>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
        {/* Heading */}
        <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
          Here to help
        </h1>
        <p className="text-[var(--color-text-secondary)] text-lg mb-12">
          What do you need support with?
        </p>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          {/* Use Coaching Bot */}
          <button
            disabled
            className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-8 text-center opacity-50 cursor-not-allowed"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-bg-tertiary)]">
              <svg
                className="h-7 w-7 text-[var(--color-text-secondary)]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                />
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                Use Coaching Bot
              </p>
              <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
                Coming soon
              </p>
            </div>
          </button>

          {/* Report a Bug */}
          <button
            onClick={() => setBugModalOpen(true)}
            className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-8 text-center hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-bg-tertiary)]">
              <svg
                className="h-7 w-7 text-[var(--color-text-secondary)]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152-6.135c-.117-1.994-1.783-3.555-3.805-3.555h-6.5c-2.022 0-3.688 1.561-3.805 3.555a23.91 23.91 0 0 1-1.152 6.135A24.082 24.082 0 0 1 12 12.75ZM2.695 18.91a23.707 23.707 0 0 0 2.55-5.636A24.319 24.319 0 0 0 5.5 10.5c0-1.68.345-3.278.968-4.733a1.045 1.045 0 0 0-.393-1.248A2.233 2.233 0 0 0 4.93 4.13a2.25 2.25 0 0 0-1.834 3.59 23.538 23.538 0 0 1-.276 11.19Zm18.61 0a23.538 23.538 0 0 0-.276-11.19 2.25 2.25 0 0 0-1.834-3.59 2.233 2.233 0 0 0-1.145.39 1.045 1.045 0 0 0-.393 1.247A11.943 11.943 0 0 1 18.5 10.5c0 .974-.058 1.935-.17 2.878a23.707 23.707 0 0 0 2.55 5.636l.425.895Z"
                />
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                Report a Bug
              </p>
              <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
                Let us know what went wrong
              </p>
            </div>
          </button>

          {/* Book a Support Call */}
          <a
            href="https://calendly.com/wired-creator/support"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-8 text-center hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-bg-tertiary)]">
              <svg
                className="h-7 w-7 text-[var(--color-text-secondary)]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                />
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                Book a Support Call
              </p>
              <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
                Schedule a 1-on-1 session
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={bugModalOpen}
        onClose={() => setBugModalOpen(false)}
      />
    </PageWrapper>
  );
}
