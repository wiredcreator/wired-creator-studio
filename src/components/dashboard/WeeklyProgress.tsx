"use client";

import { useState, useEffect } from "react";

type FilterPeriod = "week" | "month" | "ytd";

interface DayProgress {
  label: string;
  points: number;
}

export default function WeeklyProgress() {
  const [period, setPeriod] = useState<FilterPeriod>("week");
  const [data, setData] = useState<DayProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to fetch from XP API, fall back to empty data
    async function fetchProgress() {
      setLoading(true);
      try {
        const res = await fetch(`/api/xp/progress?period=${period}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data || []);
        } else {
          // API doesn't exist yet — generate placeholder structure
          setData(getPlaceholderData(period));
        }
      } catch {
        setData(getPlaceholderData(period));
      } finally {
        setLoading(false);
      }
    }

    fetchProgress();
  }, [period]);

  const maxPoints = Math.max(...data.map((d) => d.points), 1);

  return (
    <div style={{ borderRadius: 16, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', padding: '24px 24px 20px' }}>
      <div className="mb-5 flex items-center justify-between">
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Weekly progress
        </h3>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as FilterPeriod)}
          style={{
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '6px 12px',
            cursor: 'pointer',
          }}
        >
          <option value="week">Select</option>
          <option value="month">Month</option>
          <option value="ytd">YTD</option>
        </select>
      </div>

      {loading ? (
        <div className="flex h-40 items-end gap-2">
          {[65, 45, 80, 35, 55, 70, 50].map((h, i) => (
            <div
              key={i}
              className="flex-1 animate-pulse rounded-t-[var(--radius-sm)]"
              style={{ height: `${h}%`, backgroundColor: 'var(--color-hover)' }}
            />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            No activity yet. Complete tasks to start tracking progress.
          </p>
        </div>
      ) : (
        <div className="flex h-40 items-end gap-2">
          {data.map((day, i) => {
            const heightPercent = (day.points / maxPoints) * 100;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                  {day.points > 0 ? day.points : ""}
                </span>
                <div
                  className="w-full rounded-t-[var(--radius-sm)] bg-[var(--color-accent)] transition-all duration-500"
                  style={{
                    height: `${Math.max(heightPercent, 4)}%`,
                    opacity: day.points > 0 ? 1 : 0.2,
                  }}
                />
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getPlaceholderData(period: FilterPeriod): DayProgress[] {
  if (period === "week") {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map((label) => ({ label, points: 0 }));
  }
  if (period === "month") {
    return Array.from({ length: 4 }, (_, i) => ({
      label: `W${i + 1}`,
      points: 0,
    }));
  }
  // YTD — show months
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = new Date().getMonth();
  return months.slice(0, currentMonth + 1).map((label) => ({
    label,
    points: 0,
  }));
}
