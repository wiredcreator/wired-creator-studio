"use client";

import { useState, useEffect } from "react";
import StatCard from "@/components/dashboard/StatCard";
import XPStreakCard from "@/components/dashboard/XPStreakCard";
import WeeklyProgress from "@/components/dashboard/WeeklyProgress";
import XPBreakdown from "@/components/dashboard/XPBreakdown";
import { useXP } from "@/hooks/useXP";

interface DashboardStats {
  tasks: number;
  ideas: number;
  scripts: number;
  sideQuests: number;
  userName: string;
}

function getGreeting(): string {
  return "Welcome back";
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const { xp, loading: xpLoading } = useXP();
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setStatsLoading(true);
      try {
        const statsRes = await fetch("/api/dashboard/stats");
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        } else {
          setStats({ tasks: 0, ideas: 0, scripts: 0, sideQuests: 0, userName: "there" });
        }
      } catch {
        setStats({ tasks: 0, ideas: 0, scripts: 0, sideQuests: 0, userName: "there" });
      } finally {
        setStatsLoading(false);
      }
    }
    fetchStats();
  }, []);

  const loading = statsLoading || xpLoading;

  const firstName = stats?.userName?.split(" ")[0] || "there";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-12">
        {/* Welcome Row */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-normal tracking-tight text-[var(--color-text-primary)]">
            {loading ? (
              <span className="inline-block h-9 w-64 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)]" />
            ) : (
              <>{getGreeting()}, {firstName} <span className="inline-block">👋</span></>
            )}
          </h1>
        </div>

        {/* Stat Cards Row */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[88px] animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)]"
              />
            ))
          ) : (
            <>
              <StatCard
                label="Tasks"
                value={stats?.tasks ?? 0}
                href="/dashboard/today"
                icon={
                  <svg className="h-4 w-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                }
              />
              <StatCard
                label="Ideas"
                value={stats?.ideas ?? 0}
                href="/dashboard/ideas"
                icon={
                  <svg className="h-4 w-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                }
              />
              <StatCard
                label="Scripts"
                value={stats?.scripts ?? 0}
                href="/dashboard/scripts"
                icon={
                  <svg className="h-4 w-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                }
              />
              <StatCard
                label="Side Quests"
                value={stats?.sideQuests ?? 0}
                href="/dashboard/side-quests"
                icon={
                  <svg className="h-4 w-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
                  </svg>
                }
              />
            </>
          )}
        </div>

        {/* Progress + XP/Streaks Row */}
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <WeeklyProgress />
          </div>
          <div>
            <XPStreakCard
              lifetimeXP={xp.lifetimeXP}
              currentStreak={xp.currentStreak}
              bestStreak={xp.bestStreak}
            />
          </div>
        </div>

        {/* XP Breakdown by Activity Type */}
        <div className="mb-6">
          <XPBreakdown />
        </div>
      </div>
    </div>
  );
}
