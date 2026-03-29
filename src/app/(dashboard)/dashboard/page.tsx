"use client";

import { useState, useEffect } from "react";
import StatCard from "@/components/dashboard/StatCard";
import XPStreakCard from "@/components/dashboard/XPStreakCard";
import WeeklyProgress from "@/components/dashboard/WeeklyProgress";

interface DashboardStats {
  tasks: number;
  ideas: number;
  scripts: number;
  readyToFilm: number;
  userName: string;
}

interface XPData {
  lifetimeXP: number;
  currentStreak: number;
  bestStreak: number;
}

function getGreeting(): string {
  return "Welcome back";
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [xp, setXP] = useState<XPData>({ lifetimeXP: 0, currentStreak: 0, bestStreak: 0 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);

      // Fetch stats and XP in parallel
      const [statsRes, xpRes] = await Promise.all([
        fetch("/api/dashboard/stats").catch(() => null),
        fetch("/api/xp").catch(() => null),
      ]);

      if (statsRes?.ok) {
        const data = await statsRes.json();
        setStats(data);
      } else {
        setStats({ tasks: 0, ideas: 0, scripts: 0, readyToFilm: 0, userName: "there" });
      }

      if (xpRes?.ok) {
        const data = await xpRes.json();
        setXP({
          lifetimeXP: data.lifetimeXP ?? data.totalXP ?? 0,
          currentStreak: data.currentStreak ?? 0,
          bestStreak: data.bestStreak ?? 0,
        });
      }

      setLoading(false);
    }

    fetchDashboard();
  }, []);

  const firstName = stats?.userName?.split(" ")[0] || "there";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-12">
        {/* Welcome Row */}
        <div className="mb-8">
          <h1 className="text-3xl font-normal tracking-tight text-[var(--color-text-primary)]">
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
                label="Ready to Film"
                value={stats?.readyToFilm ?? 0}
                href="/dashboard/scripts"
                icon={
                  <svg className="h-4 w-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                }
              />
            </>
          )}
        </div>

        {/* Progress + XP/Streaks Row */}
        <div className="grid gap-4 lg:grid-cols-3">
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
      </div>
    </div>
  );
}
