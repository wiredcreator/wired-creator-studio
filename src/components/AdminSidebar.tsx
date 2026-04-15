"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";

interface AdminSidebarProps {
  userName?: string;
}

const navItems = [
  { href: "/admin/students", label: "Students" },
  { href: "/admin/ai-documents", label: "AI Documents" },
  { href: "/admin/ai-usage", label: "AI Usage" },
  { href: "/admin/program", label: "Program Board" },
  { href: "/admin/task-templates", label: "Task Templates" },
  { href: "/admin/my-tasks", label: "My Tasks" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/settings", label: "Settings" },
];

const bottomItems = [
  { href: "/dashboard", label: "Back to Dashboard" },
  { href: "/dashboard/profile", label: "Settings" },
];

const ACCENT = { light: '#4A90D9', dark: '#D4A843' };
const TEXT_SEC = { light: '#555770', dark: '#8B8D9E' };
const TEXT_PRI = { light: '#1A1A2E', dark: '#E4E4E7' };

export default function AdminSidebar({ userName }: AdminSidebarProps) {
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

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside style={{ width: 200, display: 'flex', flexDirection: 'column', height: '100vh', padding: '24px 16px', overflowY: 'auto' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 8, paddingRight: 8, marginBottom: 32 }}>
        <Link href="/dashboard">
          <Image src={t === 'dark' ? '/logo-color-light-text.svg' : '/logo-color-dark-text.svg'} alt="Wired Creator Studio" width={120} height={32} style={{ objectFit: 'contain' }} priority />
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map((item, index) => (
          <div key={item.href}>
            <Link
              href={item.href}
              style={isActive(item.href) ? activeStyle : inactiveStyle}
            >
              {item.label}
            </Link>
            {/* Separator after AI Usage */}
            {index === navItems.length - 1 ? null : null}
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 8, flexShrink: 0 }}>
        {/* Separator */}
        <div style={{ height: 1, backgroundColor: t === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)', margin: '4px 8px 8px' }} />

        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={isActive(item.href) ? activeStyle : inactiveStyle}
          >
            {item.label}
          </Link>
        ))}

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
