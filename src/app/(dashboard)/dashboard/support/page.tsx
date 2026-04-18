"use client";

import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";

const cards = [
  {
    href: "/dashboard/support/coaching-bot",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
    ),
    iconBg: "#7C5CFC",
    title: "Use Coaching Bot",
    subtitle: "Chat with your AI coach anytime",
  },
  {
    href: "/dashboard/support/resources",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    iconBg: "#7C5CFC",
    title: "Resources",
    subtitle: "Guides, videos & tools for creators",
  },
  {
    href: "/dashboard/support/bug-report",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152-6.135c-.117-1.994-1.783-3.555-3.805-3.555h-6.5c-2.022 0-3.688 1.561-3.805 3.555a23.91 23.91 0 0 1-1.152 6.135A24.082 24.082 0 0 1 12 12.75ZM2.695 18.91a23.707 23.707 0 0 0 2.55-5.636A24.319 24.319 0 0 0 5.5 10.5c0-1.68.345-3.278.968-4.733a1.045 1.045 0 0 0-.393-1.248A2.233 2.233 0 0 0 4.93 4.13a2.25 2.25 0 0 0-1.834 3.59 23.538 23.538 0 0 1-.276 11.19Zm18.61 0a23.538 23.538 0 0 0-.276-11.19 2.25 2.25 0 0 0-1.834-3.59 2.233 2.233 0 0 0-1.145.39 1.045 1.045 0 0 0-.393 1.247A11.943 11.943 0 0 1 18.5 10.5c0 .974-.058 1.935-.17 2.878a23.707 23.707 0 0 0 2.55 5.636l.425.895Z" />
      </svg>
    ),
    iconBg: "#EF4444",
    title: "Report a bug",
    subtitle: "Tell us about a glitch or error",
  },
  {
    href: "/dashboard/support/book-call",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
    iconBg: "#22C55E",
    title: "Book a support call",
    subtitle: "Schedule time with our team",
  },
];

export default function SupportPage() {
  return (
    <PageWrapper>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
        <h1 className="font-heading text-4xl font-bold text-[var(--color-text-primary)] mb-2">
          Here to help
        </h1>
        <p className="text-[var(--color-text-secondary)] text-lg mb-12">
          What do you need support with?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-4xl">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="flex flex-col items-center gap-4 rounded-2xl bg-[var(--color-bg-card)] px-6 py-8 text-center shadow-sm hover:shadow-md transition-shadow"
            >
              <div style={{ color: card.iconBg }}>
                {card.icon}
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  {card.title}
                </p>
                <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
                  {card.subtitle}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
