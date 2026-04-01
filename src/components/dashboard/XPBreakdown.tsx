"use client";

import { useState, useEffect } from "react";

interface BreakdownEntry {
  action: string;
  label: string;
  totalXP: number;
  count: number;
  percentage: number;
}

const ACTION_COLORS: Record<string, string> = {
  complete_task: "#6366f1",
  generate_idea: "#f59e0b",
  approve_script: "#10b981",
  brain_dump: "#8b5cf6",
  complete_side_quest: "#ec4899",
  voice_storm: "#06b6d4",
};

const FALLBACK_COLORS = ["#f97316", "#14b8a6", "#a78bfa", "#fb7185", "#38bdf8", "#facc15"];

function getColor(action: string, index: number): string {
  return ACTION_COLORS[action] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export default function XPBreakdown() {
  const [breakdown, setBreakdown] = useState<BreakdownEntry[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBreakdown() {
      try {
        const res = await fetch("/api/xp/breakdown");
        if (res.ok) {
          const data = await res.json();
          setBreakdown(data.breakdown || []);
          setTotalXP(data.totalXP || 0);
        }
      } catch {
        // Silently fail, show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchBreakdown();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          borderRadius: 16,
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          padding: 24,
          height: 280,
        }}
        className="animate-pulse"
      />
    );
  }

  if (breakdown.length === 0) {
    return (
      <div
        style={{
          borderRadius: 16,
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          padding: 24,
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: "var(--color-text-muted)",
            marginBottom: 16,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          XP Breakdown
        </p>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
          No XP earned yet. Complete tasks, generate ideas, or write scripts to start earning XP.
        </p>
      </div>
    );
  }

  // Build donut chart segments
  const size = 140;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  const segments = breakdown.map((entry, i) => {
    const segmentLength = (entry.percentage / 100) * circumference;
    const offset = cumulativeOffset;
    cumulativeOffset += segmentLength;
    return { ...entry, color: getColor(entry.action, i), segmentLength, offset };
  });

  return (
    <div
      style={{
        borderRadius: 16,
        backgroundColor: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        padding: 24,
      }}
    >
      <p
        style={{
          fontSize: 12,
          color: "var(--color-text-muted)",
          marginBottom: 20,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        XP Breakdown
      </p>

      <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
        {/* Donut Chart */}
        <div style={{ flexShrink: 0, position: "relative", width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--color-bg-tertiary)"
              strokeWidth={strokeWidth}
            />
            {/* Segments */}
            {segments.map((seg) => (
              <circle
                key={seg.action}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.segmentLength} ${circumference - seg.segmentLength}`}
                strokeDashoffset={-seg.offset}
                style={{
                  transform: "rotate(-90deg)",
                  transformOrigin: "center",
                  transition: "stroke-dasharray 0.4s ease",
                }}
              />
            ))}
          </svg>
          {/* Center label */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-primary)", lineHeight: 1 }}>
              {totalXP.toLocaleString()}
            </span>
            <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 2 }}>Total XP</span>
          </div>
        </div>

        {/* Legend / Bars */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          {segments.map((seg) => (
            <div key={seg.action}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      backgroundColor: seg.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>
                    {seg.label}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 500, marginLeft: 8, whiteSpace: "nowrap" }}>
                  {seg.totalXP.toLocaleString()} XP
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "var(--color-bg-tertiary)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${seg.percentage}%`,
                    borderRadius: 3,
                    backgroundColor: seg.color,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
