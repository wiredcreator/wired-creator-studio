"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";

interface StudentWithStats {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  totalTasks: number;
  completedTasks: number;
  todayTasks: number;
  todayCompleted: number;
}

function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export default function AdminDashboardPage() {
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeStudents: 0,
    tasksDueToday: 0,
    pendingReviews: 0,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch all students
        const usersRes = await fetch("/api/users?role=student");
        let studentsList: StudentWithStats[] = [];

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          studentsList = (usersData || []).map(
            (u: { _id: string; name: string; email: string; createdAt: string }) => ({
              ...u,
              totalTasks: 0,
              completedTasks: 0,
              todayTasks: 0,
              todayCompleted: 0,
            })
          );
        }

        // Fetch task stats for each student
        const today = getTodayISO();
        let totalDueToday = 0;
        let totalPendingReviews = 0;

        for (const student of studentsList) {
          try {
            // Get all tasks for the student
            const allTasksRes = await fetch(
              `/api/tasks?userId=${student._id}`
            );
            if (allTasksRes.ok) {
              const allTasks = await allTasksRes.json();
              student.totalTasks = allTasks.length;
              student.completedTasks = allTasks.filter(
                (t: { status: string }) => t.status === "completed"
              ).length;
            }

            // Get today's tasks
            const todayRes = await fetch(
              `/api/tasks?userId=${student._id}&date=${today}`
            );
            if (todayRes.ok) {
              const todayTasks = await todayRes.json();
              student.todayTasks = todayTasks.length;
              student.todayCompleted = todayTasks.filter(
                (t: { status: string }) => t.status === "completed"
              ).length;
              totalDueToday += student.todayTasks;

              // Count submit_content and review_script tasks that are pending
              totalPendingReviews += todayTasks.filter(
                (t: { status: string; type: string }) =>
                  (t.type === "submit_content" || t.type === "review_script") &&
                  t.status === "pending"
              ).length;
            }
          } catch {
            // Skip stats for this student on error
          }
        }

        setStudents(studentsList);
        setStats({
          activeStudents: studentsList.length,
          tasksDueToday: totalDueToday,
          pendingReviews: totalPendingReviews,
        });
      } catch (err) {
        console.error("Error fetching admin data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <PageWrapper
      title="Coach Dashboard"
      subtitle="Overview of all students and their progress."
    >
      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Active Students",
              value: loading ? "--" : String(stats.activeStudents),
            },
            {
              label: "Tasks Due Today",
              value: loading ? "--" : String(stats.tasksDueToday),
            },
            {
              label: "Pending Reviews",
              value: loading ? "--" : String(stats.pendingReviews),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]"
            >
              <p className="text-sm text-[var(--color-text-muted)]">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Student list */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
            Students
          </h2>

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)]"
                />
              ))}
            </div>
          )}

          {!loading && students.length === 0 && (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                No students enrolled yet.
              </p>
            </div>
          )}

          {!loading && students.length > 0 && (
            <div className="space-y-3">
              {students.map((student) => {
                const progressPercent =
                  student.totalTasks > 0
                    ? Math.round(
                        (student.completedTasks / student.totalTasks) * 100
                      )
                    : 0;
                const todayPercent =
                  student.todayTasks > 0
                    ? Math.round(
                        (student.todayCompleted / student.todayTasks) * 100
                      )
                    : 0;

                return (
                  <Link
                    key={student._id}
                    href={`/admin/students/${student._id}`}
                    className="block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-sm font-semibold text-[var(--color-accent)]">
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                            {student.name}
                          </h3>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {student.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Today's progress */}
                        <div className="text-right">
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Today
                          </p>
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">
                            {student.todayCompleted}/{student.todayTasks}
                            {student.todayTasks > 0 && (
                              <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                                ({todayPercent}%)
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Overall progress */}
                        <div className="text-right">
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Overall
                          </p>
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">
                            {student.completedTasks}/{student.totalTasks}
                            {student.totalTasks > 0 && (
                              <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                                ({progressPercent}%)
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Arrow */}
                        <svg
                          className="h-4 w-4 text-[var(--color-text-muted)]"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m8.25 4.5 7.5 7.5-7.5 7.5"
                          />
                        </svg>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
