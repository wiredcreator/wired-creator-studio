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
    const tension = 0;
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  const chartHeight = 140;
  const paddingTop = 20;
  const paddingBottom = 24;
  const paddingLeft = 44;
  const paddingRight = 24;
  const drawHeight = chartHeight - paddingTop - paddingBottom;
  const drawWidth = width - paddingLeft - paddingRight;

  // Y-axis ticks: 0, mid, max (deduplicated for small values)
  const niceMax = maxPoints;
  const yTicks = [...new Set([0, Math.round(niceMax / 2), niceMax])];

  const points = data.map((d, i) => {
    const x = paddingLeft + (data.length > 1 ? (i / (data.length - 1)) * drawWidth : drawWidth / 2);
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

          {/* Y-axis gridlines and labels */}
          {yTicks.map((tick, tickIdx) => {
            const yRatio = maxPoints > 0 ? tick / maxPoints : 0;
            const y = paddingTop + drawHeight - yRatio * drawHeight;
            return (
              <g key={`y-${tickIdx}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  opacity={0.45}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="var(--color-text-muted)"
                  fontSize={10}
                  fontFamily="inherit"
                >
                  {tick}
                </text>
              </g>
            );
          })}

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

          {/* Invisible wider hit targets for easier hover (rendered first so dots & tooltip paint on top) */}
          {points.map((p, i) => (
            <circle
              key={`hit-${i}`}
              cx={p.x}
              cy={p.y}
              r={12}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}

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
              style={{
                cursor: "pointer",
                transition: "transform 0.15s ease",
                transformOrigin: `${p.x}px ${p.y}px`,
                transform: hoveredIndex === i ? "scale(1.4)" : "scale(1)",
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}

          {/* Tooltip */}
          {hoveredIndex !== null && (() => {
            const tooltipText = `${data[hoveredIndex].label}: ${data[hoveredIndex].points} XP`;
            const charWidth = 6.6;
            const tooltipPadding = 16;
            const tooltipWidth = Math.max(72, tooltipText.length * charWidth + tooltipPadding);
            const halfWidth = tooltipWidth / 2;
            const minX = 2;
            const maxX = width - 2;
            const rawX = points[hoveredIndex].x;
            const clampedX = Math.max(minX + halfWidth, Math.min(maxX - halfWidth, rawX));
            return (
              <g style={{ pointerEvents: "none" }}>
                <rect
                  x={clampedX - halfWidth}
                  y={points[hoveredIndex].y - 34}
                  width={tooltipWidth}
                  height={22}
                  rx={6}
                  fill="var(--color-bg-elevated)"
                  stroke="var(--color-border)"
                  strokeWidth={1}
                />
                <text
                  x={clampedX}
                  y={points[hoveredIndex].y - 19}
                  textAnchor="middle"
                  fill="var(--color-text)"
                  fontSize={11}
                  fontWeight={500}
                  fontFamily="inherit"
                >
                  {tooltipText}
                </text>
              </g>
            );
          })()}

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
          <option value="week">Week</option>
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
