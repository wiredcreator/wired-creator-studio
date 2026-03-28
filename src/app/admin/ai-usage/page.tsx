"use client";

import { useState, useEffect, useCallback } from "react";
import PageWrapper from "@/components/PageWrapper";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Summary {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  avgDurationMs: number;
  errorCount: number;
}

interface ByFeature {
  _id: string;
  calls: number;
  totalTokens: number;
  costUsd: number;
  avgDurationMs: number;
}

interface ByDay {
  _id: string;
  calls: number;
  totalTokens: number;
  costUsd: number;
}

interface RecentLog {
  userId: string;
  feature: string;
  aiModel: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  success: boolean;
  durationMs: number;
  createdAt: string;
}

interface UsageData {
  period: { days: number; since: string };
  summary: Summary;
  byFeature: ByFeature[];
  byDay: ByDay[];
  recentLogs: RecentLog[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtCostPrecise(n: number): string {
  return `$${n.toFixed(4)}`;
}

function fmtDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function toTitleCase(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

const PERIODS = [7, 30, 90] as const;

function PeriodSelector({
  selected,
  onChange,
}: {
  selected: number;
  onChange: (days: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {PERIODS.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className="rounded-[var(--radius-md)] border px-4 py-1.5 text-sm font-medium transition-colors"
          style={{
            borderColor:
              selected === d
                ? "var(--color-accent)"
                : "var(--color-border)",
            backgroundColor:
              selected === d
                ? "var(--color-accent)"
                : "var(--color-bg-card)",
            color:
              selected === d ? "#fff" : "var(--color-text-primary)",
          }}
        >
          {d} days
        </button>
      ))}
    </div>
  );
}

function SummaryCards({
  summary,
  loading,
}: {
  summary: Summary | null;
  loading: boolean;
}) {
  const cards = [
    {
      label: "Total API Calls",
      value: summary ? fmt(summary.totalCalls) : "--",
    },
    {
      label: "Total Tokens",
      value: summary ? fmt(summary.totalTokens) : "--",
    },
    {
      label: "Estimated Cost",
      value: summary ? fmtCost(summary.totalCostUsd) : "--",
    },
    {
      label: "Avg Response Time",
      value: summary ? fmtDuration(summary.avgDurationMs) : "--",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]"
        >
          <p className="text-sm text-[var(--color-text-muted)]">{c.label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-24 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-border)]" />
          ) : (
            <p className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">
              {c.value}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function FeatureTable({
  features,
  loading,
}: {
  features: ByFeature[];
  loading: boolean;
}) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
        Cost by Feature
      </h2>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">
                Feature
              </th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">
                Calls
              </th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">
                Tokens
              </th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">
                Cost
              </th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">
                Avg Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [1, 2, 3].map((i) => (
                  <tr key={i} className="border-b border-[var(--color-border)]">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-16 animate-pulse rounded bg-[var(--color-border)]" />
                      </td>
                    ))}
                  </tr>
                ))
              : features.map((f) => (
                  <tr
                    key={f._id}
                    className="border-b border-[var(--color-border)] last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                      {toTitleCase(f._id)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-primary)]">
                      {fmt(f.calls)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-primary)]">
                      {fmt(f.totalTokens)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-primary)]">
                      {fmtCostPrecise(f.costUsd)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-muted)]">
                      {fmtDuration(f.avgDurationMs)}
                    </td>
                  </tr>
                ))}
            {!loading && features.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[var(--color-text-muted)]"
                >
                  No feature data for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DailyTrendTable({
  days,
  loading,
}: {
  days: ByDay[];
  loading: boolean;
}) {
  const sorted = [...days].sort(
    (a, b) => new Date(b._id).getTime() - new Date(a._id).getTime()
  );

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
        Daily Trend
      </h2>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">
                Date
              </th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">
                Calls
              </th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">
                Tokens
              </th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">
                Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b border-[var(--color-border)]">
                    {[1, 2, 3, 4].map((j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-16 animate-pulse rounded bg-[var(--color-border)]" />
                      </td>
                    ))}
                  </tr>
                ))
              : sorted.map((d) => (
                  <tr
                    key={d._id}
                    className="border-b border-[var(--color-border)] last:border-b-0"
                  >
                    <td className="px-4 py-3 text-[var(--color-text-primary)]">
                      {fmtDate(d._id)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-primary)]">
                      {fmt(d.calls)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-primary)]">
                      {fmt(d.totalTokens)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-primary)]">
                      {fmtCostPrecise(d.costUsd)}
                    </td>
                  </tr>
                ))}
            {!loading && sorted.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-[var(--color-text-muted)]"
                >
                  No daily data for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentCallsTable({
  logs,
  loading,
}: {
  logs: RecentLog[];
  loading: boolean;
}) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
        Recent Calls
      </h2>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">
                Feature
              </th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">
                In
              </th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">
                Out
              </th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">
                Cost
              </th>
              <th className="px-4 py-3 text-center font-medium text-[var(--color-text-muted)]">
                Status
              </th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">
                Duration
              </th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b border-[var(--color-border)]">
                    {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-14 animate-pulse rounded bg-[var(--color-border)]" />
                      </td>
                    ))}
                  </tr>
                ))
              : logs.slice(0, 50).map((log, i) => (
                  <tr
                    key={`${log.createdAt}-${i}`}
                    className="border-b border-[var(--color-border)] last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                      {toTitleCase(log.feature)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-primary)]">
                      {fmt(log.inputTokens)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-primary)]">
                      {fmt(log.outputTokens)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-primary)]">
                      {fmtCostPrecise(log.estimatedCostUsd)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: log.success
                            ? "var(--color-success-bg, #16a34a20)"
                            : "var(--color-error-bg, #dc262620)",
                          color: log.success
                            ? "var(--color-success, #16a34a)"
                            : "var(--color-error, #dc2626)",
                        }}
                      >
                        {log.success ? "OK" : "Error"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-muted)]">
                      {fmtDuration(log.durationMs)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--color-text-muted)]">
                      {fmtTimestamp(log.createdAt)}
                    </td>
                  </tr>
                ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-[var(--color-text-muted)]"
                >
                  No recent calls for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function AIUsagePage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (period: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/ai-usage?days=${period}`);
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const json: UsageData = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error fetching AI usage:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(days);
  }, [days, fetchData]);

  function handlePeriodChange(newDays: number) {
    setDays(newDays);
  }

  return (
    <PageWrapper
      title="AI Usage"
      subtitle="Track AI token usage and costs across the platform."
    >
      <div className="space-y-8">
        {/* Period selector */}
        <PeriodSelector selected={days} onChange={handlePeriodChange} />

        {/* Error banner */}
        {error && (
          <div
            className="rounded-[var(--radius-md)] border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--color-error, #dc2626)",
              backgroundColor: "var(--color-error-bg, #dc262610)",
              color: "var(--color-error, #dc2626)",
            }}
          >
            {error}
          </div>
        )}

        {/* Summary cards */}
        <SummaryCards summary={data?.summary ?? null} loading={loading} />

        {/* Cost by feature */}
        <FeatureTable features={data?.byFeature ?? []} loading={loading} />

        {/* Daily trend */}
        <DailyTrendTable days={data?.byDay ?? []} loading={loading} />

        {/* Recent calls */}
        <RecentCallsTable logs={data?.recentLogs ?? []} loading={loading} />
      </div>
    </PageWrapper>
  );
}
