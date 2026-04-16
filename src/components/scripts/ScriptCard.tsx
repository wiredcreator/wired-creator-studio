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
  thumbnail?: string;
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
  approved: 'Ready to Film',
  filming: 'Filming',
  completed: 'Published',
  published: 'Published',
};

const STATUS_STYLES: Record<ScriptStatus, React.CSSProperties> = {
  draft: { backgroundColor: '#E0E3EA', color: '#555770' },
  review: { backgroundColor: '#FEF3C7', color: '#92400E' },
  approved: { backgroundColor: 'rgba(74,144,217,0.12)', color: '#4A90D9' },
  filming: { backgroundColor: 'rgba(74,144,217,0.12)', color: '#4A90D9' },
  completed: { backgroundColor: 'rgba(34,197,94,0.12)', color: '#16A34A' },
  published: { backgroundColor: 'rgba(34,197,94,0.12)', color: '#16A34A' },
};

function getPreview(fullScript: string, maxLength = 80): string {
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
      className="group w-full cursor-pointer text-left transition-all duration-200 overflow-hidden flex flex-col"
      style={{ borderRadius: 16, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', boxShadow: 'var(--shadow-sm)' }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
      onClick={() => onClick?.(script)}
    >
      {/* Thumbnail */}
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        {script.thumbnail ? (
          <img
            src={script.thumbnail}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <svg className="h-10 w-10 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
          </div>
        )}

        {/* Status badge overlay */}
        <span
          className="absolute top-2.5 right-2.5"
          style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600, backdropFilter: 'blur(4px)', ...STATUS_STYLES[script.status] }}
        >
          {STATUS_LABELS[script.status]}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 min-w-0">
        {/* Title */}
        <h3 className="text-sm leading-snug line-clamp-2" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {script.title}
        </h3>

        {/* Preview snippet */}
        <p className="mt-1.5 text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
          {getPreview(script.fullScript)}
        </p>

        {/* Meta row */}
        <div className="mt-auto pt-3 flex flex-wrap items-center gap-1.5">
          {/* Content pillar */}
          {script.ideaId && typeof script.ideaId === 'object' && script.ideaId.contentPillar && (
            <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, backgroundColor: 'rgba(74,144,217,0.1)', padding: '2px 8px', fontSize: 11, fontWeight: 500, color: '#4A90D9' }}>
              {script.ideaId.contentPillar}
            </span>
          )}

          {/* Version + date */}
          <span className="ml-auto text-xs text-[var(--color-text-muted)]">
            v{script.version} · {formatDate(script.updatedAt || script.createdAt)}
          </span>
        </div>
      </div>
    </button>
  );
}
