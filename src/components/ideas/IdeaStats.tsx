'use client';

interface IdeaStatsProps {
  total: number;
  approved: number;
  inProgress: number;
  published: number;
}

export default function IdeaStats({
  total,
  approved,
  inProgress,
  published,
}: IdeaStatsProps) {
  const stats = [
    { label: 'Total Ideas', value: total, color: 'var(--color-text-primary)' },
    { label: 'Approved', value: approved, color: 'var(--color-accent)' },
    { label: 'In Progress', value: inProgress, color: 'var(--color-warning)' },
    { label: 'Published', value: published, color: 'var(--color-success)' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] px-4 py-3 shadow-[var(--shadow-sm)]"
        >
          <p
            className="text-xl font-semibold tabular-nums"
            style={{ color: stat.color }}
          >
            {stat.value}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
