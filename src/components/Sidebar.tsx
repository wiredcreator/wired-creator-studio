"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "./ThemeProvider";

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
  // { href: "/dashboard/support", label: "Support" },
];

const ACCENT = { light: '#4A90D9', dark: '#D4A843' };
const TEXT_SEC = { light: '#555770', dark: '#8B8D9E' };
const TEXT_PRI = { light: '#1A1A2E', dark: '#E4E4E7' };

export default function Sidebar({ userName, userRole = "student" }: SidebarProps) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const t = resolvedTheme === 'light' ? 'light' : 'dark';

  const activeStyle: React.CSSProperties = {
    backgroundColor: ACCENT[t],
    color: '#FFFFFF',
    borderRadius: '12px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 600,
    textAlign: 'left',
    display: 'block',
    boxShadow: `0 2px 8px ${t === 'light' ? 'rgba(74,144,217,0.35)' : 'rgba(212,168,67,0.35)'}`,
  };

  const inactiveStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    color: TEXT_SEC[t],
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
        <Image src="/logo.png" alt="Wired Creator Studio" width={120} height={32} style={{ objectFit: 'contain', filter: t === 'dark' ? 'brightness(1.8)' : 'none' }} priority />
        <div style={{ marginLeft: 'auto', paddingLeft: 12 }}>
          <ThemeToggle />
        </div>
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
              backgroundColor: ACCENT[t],
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
            <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRI[t], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
