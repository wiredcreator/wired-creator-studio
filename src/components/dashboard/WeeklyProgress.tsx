"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type FilterPeriod = "week" | "month" | "ytd";

interface DayProgress {
  label: string;
  points: number;
}

/** Build a smooth cubic bezier path through the given points */
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  const d: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }
  return d.join(" ");
}

function LineChart({ data, maxPoints }: { data: DayProgress[]; maxPoints: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const measure = useCallback(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const chartHeight = 130;
  const paddingTop = 16;
  const paddingBottom = 24;
  const paddingX = 24;
  const drawHeight = chartHeight - paddingTop - paddingBottom;
  const drawWidth = width - paddingX * 2;

  const points = data.map((d, i) => {
    const x = paddingX + (data.length > 1 ? (i / (data.length - 1)) * drawWidth : drawWidth / 2);
    const yRatio = maxPoints > 0 ? d.points / maxPoints : 0;
    const y = paddingTop + drawHeight - yRatio * drawHeight;
    return { x, y };
  });

  const linePath = buildSmoothPath(points);
  const areaPath = linePath
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + drawHeight} L ${points[0].x} ${paddingTop + drawHeight} Z`
    : "";

  const gradientId = "weekly-area-grad";

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
      {width > 0 && (
        <svg
          width={width}
          height={chartHeight}
          viewBox={`0 0 ${width} ${chartHeight}`}
          style={{ display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          {areaPath && (
            <path d={areaPath} fill={`url(#${gradientId})`} />
          )}

          {/* Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data point dots */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill="var(--color-bg-card)"
              stroke="var(--color-accent)"
              strokeWidth={2}
            />
          ))}

          {/* X-axis labels */}
          {data.map((d, i) => (
            <text
              key={i}
              x={points[i].x}
              y={chartHeight - 4}
              textAnchor="middle"
              fill="var(--color-text-muted)"
              fontSize={10}
              fontFamily="inherit"
            >
              {d.label}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}

export default function WeeklyProgress() {
  const [period, setPeriod] = useState<FilterPeriod>("week");
  const [data, setData] = useState<DayProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProgress() {
      setLoading(true);
      try {
        const res = await fetch(`/api/xp/progress?period=${period}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data || []);
        } else {
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
          <option value="ytd">Year to Date</option>
        </select>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div
            className="animate-pulse rounded"
            style={{ width: '100%', height: 130, backgroundColor: 'var(--color-hover)' }}
          />
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            No activity yet. Complete tasks to start tracking progress.
          </p>
        </div>
      ) : (
        <LineChart data={data} maxPoints={maxPoints} />
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
