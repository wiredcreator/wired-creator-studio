'use client';

import type { ScriptStatus } from '@/models/Script';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScriptCardData {
  _id: string;
  title: string;
  fullScript: string;
  status: ScriptStatus;
  ideaId?: {
    _id: string;
    title: string;
    contentPillar?: string;
  };
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface ScriptCardProps {
  script: ScriptCardData;
  onClick?: (script: ScriptCardData) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<ScriptStatus, string> = {
  draft: 'Draft',
  review: 'In Review',
  approved: 'Approved',
  filming: 'Filming',
  completed: 'Completed',
};

const STATUS_COLORS: Record<ScriptStatus, string> = {
  draft: 'bg-[var(--color-bg-secondary)] text-[var(--color-text)]',
  review: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  approved: 'bg-[var(--color-accent-light)] text-[var(--color-accent)]',
  filming: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  completed: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
};

function getPreview(fullScript: string, maxLength = 140): string {
  const trimmed = fullScript.replace(/\n+/g, ' ').trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength).trim() + '...';
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScriptCard({ script, onClick }: ScriptCardProps) {
  return (
    <button
      type="button"
      className="group w-full cursor-pointer rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 text-left shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:border-[var(--color-accent)]"
      onClick={() => onClick?.(script)}
    >
      {/* Title */}
      <h3 className="text-base font-semibold leading-snug text-[var(--color-text-primary)] line-clamp-2">
        {script.title}
      </h3>

      {/* Preview snippet */}
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)] line-clamp-3">
        {getPreview(script.fullScript)}
      </p>

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Linked idea */}
        {script.ideaId && typeof script.ideaId === 'object' && (
          <span className="inline-flex items-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-bg-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text)]">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
            {script.ideaId.title.length > 30
              ? script.ideaId.title.slice(0, 30) + '...'
              : script.ideaId.title}
          </span>
        )}

        {/* Status badge */}
        <span
          className={`inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium ${
            STATUS_COLORS[script.status]
          }`}
        >
          {STATUS_LABELS[script.status]}
        </span>

        {/* Version + date */}
        <span className="ml-auto text-xs text-[var(--color-text-muted)]">
          v{script.version} · {formatDate(script.createdAt)}
        </span>
      </div>
    </button>
  );
}
