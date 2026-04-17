"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { useState } from "react";

interface SidebarProps {
  userName?: string;
  userRole?: "student" | "admin";
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/dashboard/focus", label: "Focus Mode" },
  { href: "/dashboard/ideas", label: "Ideas" },
  { href: "/dashboard/scripts", label: "Scripts" },
  { href: "/dashboard/today", label: "Tasks" },
  { href: "/dashboard/brain-dump", label: "Brain Dump" },
  { href: "/dashboard/side-quests", label: "Side Quests" },
  { href: "/dashboard/support", label: "Support" },
];

// All colors now reference CSS variables from globals.css
// so they stay in sync when the theme palette changes.

export default function Sidebar({ userName, userRole = "student" }: SidebarProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const t = resolvedTheme === 'light' ? 'light' : 'dark';
  const [darkHover, setDarkHover] = useState(false);

  const activeStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-accent)',
    color: '#FFFFFF',
    borderRadius: '12px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 600,
    textAlign: 'left',
    display: 'block',
    boxShadow: '0 2px 8px var(--color-accent-light)',
  };

  const inactiveStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    borderRadius: '12px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 500,
    textAlign: 'left',
    display: 'block',
  };

  return (
    <aside style={{ width: 200, display: 'flex', flexDirection: 'column', height: '100vh', padding: '24px 16px', overflowY: 'auto' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 8, paddingRight: 8, marginBottom: 32 }}>
        <Image src={t === 'dark' ? '/logo-color-light-text.svg' : '/logo-color-dark-text.svg'} alt="Wired Creator Studio" width={120} height={32} style={{ objectFit: 'contain' }} priority />
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              style={isActive ? activeStyle : inactiveStyle}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 8, flexShrink: 0 }}>
        {/* Dark mode toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          onMouseEnter={() => setDarkHover(true)}
          onMouseLeave={() => setDarkHover(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 12,
            border: `1px solid ${t === 'light' ? '#e2e4ea' : '#2a2d3a'}`,
            backgroundColor: darkHover
              ? (t === 'light' ? '#f0f1f4' : '#23263a')
              : (t === 'light' ? '#f5f6f8' : '#1a1d2e'),
            color: 'var(--color-text-secondary)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background-color 0.15s',
          }}
        >
          {resolvedTheme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
          )}
          Dark mode
        </button>

        {userRole === 'admin' && (
          <Link
            href="/admin"
            style={pathname.startsWith("/admin") ? activeStyle : inactiveStyle}
          >
            Admin Dashboard
          </Link>
        )}
        <Link
          href="/dashboard/profile"
          style={
            pathname === "/dashboard/profile" || pathname.startsWith("/dashboard/profile/")
              ? activeStyle
              : inactiveStyle
          }
        >
          Settings
        </Link>
        {userName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px 4px', marginTop: 4 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
