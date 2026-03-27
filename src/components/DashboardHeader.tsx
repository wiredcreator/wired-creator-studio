"use client";

import { useState, useEffect } from "react";
import NotificationBell from "@/components/NotificationBell";

interface XPData {
  lifetimeXP: number;
}

export default function DashboardHeader() {
  const [xp, setXP] = useState<XPData>({ lifetimeXP: 0 });

  useEffect(() => {
    async function fetchXP() {
      try {
        const res = await fetch("/api/xp");
        if (res.ok) {
          const data = await res.json();
          setXP({ lifetimeXP: data.lifetimeXP ?? data.totalXP ?? 0 });
        }
      } catch {
        // silent fail
      }
    }
    fetchXP();
  }, []);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 24px",
        borderBottom: "1px solid var(--color-border-light)",
        backgroundColor: "var(--color-bg)",
        minHeight: 52,
        flexShrink: 0,
      }}
    >
      {/* Left: Search bar */}
      <div style={{ flex: 1, maxWidth: 400 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border-light)",
            borderRadius: 10,
            padding: "7px 12px",
          }}
        >
          <svg
            style={{ width: 16, height: 16, color: "var(--color-text-muted)", flexShrink: 0 }}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search ideas, scripts, tasks..."
            disabled
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              boxShadow: "none",
              fontSize: 13,
              color: "var(--color-text-muted)",
              cursor: "default",
            }}
          />
        </div>
      </div>

      {/* Right: XP + Notifications */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          style={{
            borderRadius: 10,
            border: "1px solid var(--color-border-light)",
            backgroundColor: "var(--color-bg-secondary)",
            padding: "7px 14px",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            cursor: "pointer",
            outline: "none",
            boxShadow: "none",
          }}
        >
          {xp.lifetimeXP > 0
            ? `XP \u00B7 ${xp.lifetimeXP.toLocaleString()}`
            : "XP Points"}
        </button>
        <NotificationBell />
      </div>
    </header>
  );
}
