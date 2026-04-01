"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Period = "week" | "month" | "last30";

interface DailyActivity {
  date: string;
  label: string;
  tasks: number;
  ideas: number;
  scripts: number;
  brainDumps: number;
  xp: number;
}

interface ProgressData {
  period: Period;
  totals: {
    tasks: number;
    ideas: number;
    scripts: number;
    brainDumps: number;
    xp: number;
  };
  daily: DailyActivity[];
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "last30", label: "Last 30 Days" },
];

const STAT_ITEMS = [
  { key: "tasks" as const, label: "Tasks Done", color: "#3b82f6" },
  { key: "ideas" as const, label: "Ideas", color: "#8b5cf6" },
  { key: "scripts" as const, label: "Scripts", color: "#10b981" },
  { key: "brainDumps" as const, label: "Brain Dumps", color: "#f59e0b" },
  { key: "xp" as const, label: "XP Earned", color: "#ec4899" },
];

function getEmptyTotals() {
  return { tasks: 0, ideas: 0, scripts: 0, brainDumps: 0, xp: 0 };
}

function BarChart({ data, period }: { data: DailyActivity[]; period: Period }) {
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

  const chartHeight = 120;
  const paddingTop = 8;
  const paddingBottom = 20;
  const paddingX = 4;
  const drawHeight = chartHeight - paddingTop - paddingBottom;
  const drawWidth = width - paddingX * 2;

  // Sum total activity per day (excluding XP for the bar chart since it has different scale)
  const dailyTotals = data.map(
    (d) => d.tasks + d.ideas + d.scripts + d.brainDumps
  );
  const maxVal = Math.max(...dailyTotals, 1);

  // Decide how many labels to show based on period
  const showEveryN = period === "last30" ? 5 : period === "month" ? 3 : 1;

  // Bar dimensions
  const barCount = data.length;
  const gap = barCount > 15 ? 2 : 4;
  const barWidth = Math.max(
    (drawWidth - gap * (barCount - 1)) / barCount,
    3
  );

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
      {width > 0 && (
        <svg
          width={width}
          height={chartHeight}
          viewBox={`0 0 ${width} ${chartHeight}`}
          style={{ display: "block", overflow: "visible" }}
        >
          {data.map((d, i) => {
            const total = dailyTotals[i];
            const barH = maxVal > 0 ? (total / maxVal) * drawHeight : 0;
            const x = paddingX + i * (barWidth + gap);
            const y = paddingTop + drawHeight - barH;

            // Stack the segments
            const segments: { key: string; height: number; color: string }[] = [];
            const activityKeys = ["tasks", "ideas", "scripts", "brainDumps"] as const;
            const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];

            for (let s = 0; s < activityKeys.length; s++) {
              const val = d[activityKeys[s]];
              if (val > 0 && total > 0) {
                segments.push({
                  key: activityKeys[s],
                  height: (val / total) * barH,
                  color: colors[s],
                });
              }
            }

            let segY = y + barH;

            return (
              <g key={i}>
                {/* Empty state: show a thin line */}
                {total === 0 && (
                  <rect
                    x={x}
                    y={paddingTop + drawHeight - 2}
                    width={barWidth}
                    height={2}
                    rx={1}
                    fill="var(--color-border)"
                  />
                )}

                {/* Stacked segments from bottom up */}
                {segments.map((seg) => {
                  segY -= seg.height;
                  return (
                    <rect
                      key={seg.key}
                      x={x}
                      y={segY}
                      width={barWidth}
                      height={Math.max(seg.height, 0)}
                      rx={barWidth > 6 ? 3 : 1.5}
                      fill={seg.color}
                      opacity={0.85}
                    />
                  );
                })}

                {/* X-axis label */}
                {i % showEveryN === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - 2}
                    textAnchor="middle"
                    fill="var(--color-text-muted)"
                    fontSize={10}
                    fontFamily="inherit"
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

export default function ProgressWidget() {
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  // Cache previous data for optimistic display during period switching
  const [cache, setCache] = useState<Record<string, ProgressData>>({});

  useEffect(() => {
    // Show cached data immediately if available
    if (cache[period]) {
      setData(cache[period]);
      setLoading(false);
    } else {
      setLoading(true);
    }

    let cancelled = false;

    async function fetchProgress() {
      try {
        const res = await fetch(`/api/dashboard/progress?period=${period}`);
        if (res.ok && !cancelled) {
          const json: ProgressData = await res.json();
          setData(json);
          setCache((prev) => ({ ...prev, [period]: json }));
        }
      } catch {
        // Keep cached/empty data on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProgress();
    return () => {
      cancelled = true;
    };
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = data?.totals ?? getEmptyTotals();
  const daily = data?.daily ?? [];

  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid var(--color-border)",
        backgroundColor: "var(--color-bg-card)",
        padding: "24px 24px 20px",
      }}
    >
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--color-text-primary)",
          }}
        >
          Activity Overview
        </h3>

        {/* Period Tabs */}
        <div
          style={{
            display: "flex",
            gap: 2,
            backgroundColor: "var(--color-bg-secondary)",
            borderRadius: 8,
            padding: 2,
          }}
        >
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              style={{
                fontSize: 12,
                fontWeight: period === opt.value ? 600 : 400,
                color:
                  period === opt.value
                    ? "var(--color-text-primary)"
                    : "var(--color-text-secondary)",
                backgroundColor:
                  period === opt.value
                    ? "var(--color-bg-card)"
                    : "transparent",
                border: "none",
                borderRadius: 6,
                padding: "5px 10px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                outline: "none",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats Row */}
      <div
        className="mb-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 8,
        }}
      >
        {STAT_ITEMS.map((item) => (
          <div
            key={item.key}
            style={{
              textAlign: "center",
              padding: "10px 4px",
              borderRadius: 10,
              backgroundColor: "var(--color-bg-secondary)",
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                lineHeight: 1.2,
              }}
            >
              {loading && !data ? (
                <span
                  className="inline-block animate-pulse rounded"
                  style={{
                    width: 28,
                    height: 22,
                    backgroundColor: "var(--color-hover)",
                  }}
                />
              ) : (
                totals[item.key]
              )}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: item.color,
                marginTop: 2,
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      {loading && !data ? (
        <div className="flex h-[120px] items-center justify-center">
          <div
            className="animate-pulse rounded"
            style={{
              width: "100%",
              height: 120,
              backgroundColor: "var(--color-hover)",
            }}
          />
        </div>
      ) : daily.length === 0 ? (
        <div className="flex h-[120px] items-center justify-center">
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-muted)",
            }}
          >
            No activity yet. Complete tasks to start tracking.
          </p>
        </div>
      ) : (
        <BarChart data={daily} period={period} />
      )}

      {/* Legend */}
      <div
        className="mt-3 flex flex-wrap items-center justify-center"
        style={{ gap: "12px 16px" }}
      >
        {STAT_ITEMS.filter((s) => s.key !== "xp").map((item) => (
          <div
            key={item.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: item.color,
                opacity: 0.85,
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: "var(--color-text-secondary)",
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
