"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface SidebarProps {
  userName?: string;
  userRole?: "student" | "coach" | "admin";
}

const navItems = [
  { href: "/dashboard/today", label: "Today", icon: "today" },
  { href: "/dashboard/ideas", label: "Ideas", icon: "lightbulb" },
  { href: "/dashboard/scripts", label: "Scripts", icon: "document" },
  { href: "/dashboard/voice-storm", label: "Voice Storm", icon: "mic" },
  { href: "/dashboard/side-quests", label: "Side Quests", icon: "compass" },
  { href: "/dashboard/brand-brain", label: "Brand Brain", icon: "brain" },
  { href: "/dashboard/brain-dump", label: "Brain Dump", icon: "bolt" },
];

const iconMap: Record<string, React.ReactNode> = {
  today: (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  lightbulb: (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  document: (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
  mic: (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
    </svg>
  ),
  compass: (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m6.115 5.19.319 1.913A6 6 0 0 0 8.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 0 0 2.288-4.042 1.087 1.087 0 0 0-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 0 1-.98-.314l-.295-.295a1.125 1.125 0 0 1 0-1.591l.13-.132a1.125 1.125 0 0 1 1.3-.21l.603.302a.809.809 0 0 0 1.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 0 0 1.528-1.732l.146-.292M6.115 5.19A9 9 0 1 0 17.18 4.64M6.115 5.19A8.965 8.965 0 0 1 12 3c1.929 0 3.716.607 5.18 1.64" />
    </svg>
  ),
  brain: (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  ),
  bolt: (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  ),
};

export default function Sidebar({ userName = "Student", userRole = "student" }: SidebarProps) {
  const pathname = usePathname();

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="flex h-screen w-[260px] flex-col bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border)]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)]">
          <svg className="h-4 w-4 text-[var(--color-bg-dark)]" viewBox="0 0 24 24" fill="currentColor">
            <path d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
          </svg>
        </div>
        <Link href="/dashboard/today" className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
          Wired Studio
        </Link>
      </div>

      {/* Section label */}
      <div className="px-6 pt-4 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
          Workspace
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? "bg-[var(--color-accent)] text-[var(--color-bg-dark)] shadow-[var(--shadow-glow)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span className={`transition-colors ${isActive ? "text-[var(--color-bg-dark)]" : "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]"}`}>
                {iconMap[item.icon]}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[var(--color-border)] p-3 space-y-0.5">
        {(userRole === 'coach' || userRole === 'admin') && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
              pathname.startsWith("/admin")
                ? "bg-[var(--color-accent)] text-[var(--color-bg-dark)] shadow-[var(--shadow-glow)]"
                : "text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            Admin Dashboard
          </Link>
        )}
        <Link
          href="/dashboard/profile"
          className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
            pathname === "/dashboard/profile"
              ? "bg-[var(--color-accent)] text-[var(--color-bg-dark)]"
              : "text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          Settings
        </Link>

        {/* User card */}
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[#B8842A] text-[11px] font-bold text-[var(--color-bg-dark)]">
            {initials}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{userName}</span>
            <span className="text-[11px] text-[var(--color-text-muted)] capitalize">{userRole}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="shrink-0 p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--color-text-primary)]"
            aria-label="Sign out"
            title="Sign out"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
