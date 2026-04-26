'use client';

import type { SideQuestCardData } from './SideQuestCard';

interface SideQuestXPSidebarProps {
  quests: SideQuestCardData[];
}

export default function SideQuestXPSidebar({ quests }: SideQuestXPSidebarProps) {
  const completedQuests = quests.filter((q) => q.completed);
  const activeQuests = quests.filter((q) => !q.completed);

  const totalXPEarned = completedQuests.reduce((sum, q) => sum + (q.xpReward || 0), 0);
  const totalXPAvailable = activeQuests.reduce((sum, q) => sum + (q.xpReward || 0), 0);
  const totalQuests = quests.length;
  const completedCount = completedQuests.length;
  const completionPercent = totalQuests > 0 ? Math.round((completedCount / totalQuests) * 100) : 0;

  // Category breakdown for completed quests
  const categoryBreakdown: Record<string, { count: number; xp: number }> = {};
  for (const q of completedQuests) {
    const cat = q.category || 'uncategorized';
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { count: 0, xp: 0 };
    }
    categoryBreakdown[cat].count += 1;
    categoryBreakdown[cat].xp += q.xpReward || 0;
  }

  const CATEGORY_DISPLAY: Record<string, { label: string; color: string }> = {
    brand_brain_fuel: { label: 'Brand Brain Fuel', color: '#DA4114' },
    scroll_study: { label: 'Scroll Study', color: '#4A90D9' },
    hook_gym: { label: 'Hook Gym', color: '#DC3535' },
    record_button_reps: { label: 'Record Button Reps', color: '#2EA66E' },
    uncategorized: { label: 'Other', color: '#8B8D9E' },
  };

  const breakdownEntries = Object.entries(categoryBreakdown).sort((a, b) => b[1].xp - a[1].xp);

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5"
    >
      {/* Header */}
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-4"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Quest Progress
      </p>

      {/* Total XP earned from quests */}
      <div className="flex items-baseline gap-2 mb-1">
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ color: '#EAB308' }}
        >
          {totalXPEarned.toLocaleString()}
        </span>
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Quest XP
        </span>
      </div>

      {totalXPAvailable > 0 && (
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          {totalXPAvailable.toLocaleString()} XP available from {activeQuests.length} active quest{activeQuests.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Completion progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Completion
          </span>
          <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
            {completedCount}/{totalQuests}
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${completionPercent}%`,
              backgroundColor: 'var(--color-success)',
            }}
          />
        </div>
      </div>

      {/* Separator */}
      <div
        className="my-4 h-px"
        style={{ backgroundColor: 'var(--color-border-light)' }}
      />

      {/* Category breakdown */}
      {breakdownEntries.length > 0 ? (
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            XP by Category
          </p>
          <div className="space-y-2.5">
            {breakdownEntries.map(([cat, data]) => {
              const display = CATEGORY_DISPLAY[cat] || CATEGORY_DISPLAY.uncategorized;
              const barWidth = totalXPEarned > 0 ? Math.round((data.xp / totalXPEarned) * 100) : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-sm shrink-0"
                        style={{ backgroundColor: display.color }}
                      />
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {display.label}
                      </span>
                    </div>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                      {data.xp} XP
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full"
                    style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: display.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Complete quests to see your XP breakdown by category.
        </p>
      )}

      {/* Stats row */}
      {completedCount > 0 && (
        <>
          <div
            className="my-4 h-px"
            style={{ backgroundColor: 'var(--color-border-light)' }}
          />
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-[var(--radius-md)] p-3"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                {completedCount}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Quests Done
              </p>
            </div>
            <div
              className="rounded-[var(--radius-md)] p-3"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                {completionPercent}%
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Complete
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
