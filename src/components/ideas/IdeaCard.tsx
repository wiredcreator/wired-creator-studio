'use client';

import type { ContentIdeaStatus, ContentIdeaSource } from '@/models/ContentIdea';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IdeaCardData {
  _id: string;
  title: string;
  description: string;
  status: ContentIdeaStatus;
  source: ContentIdeaSource;
  contentPillar: string;
  priorityScore?: number | null;
  trendData?: {
    sourceUrl: string;
    platform: string;
  };
  createdAt: string;
}

interface IdeaCardProps {
  idea: IdeaCardData;
  /** Which action set to show based on context */
  variant?: 'suggested' | 'pipeline';
  onApprove?: (id: string) => void;
  onSave?: (id: string) => void;
  onReject?: (id: string) => void;
  onStatusChange?: (id: string, status: ContentIdeaStatus) => void;
  onClick?: (idea: IdeaCardData) => void;
  /** For enter/exit animations */
  animationClass?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SOURCE_LABELS: Record<ContentIdeaSource, string> = {
  ai_generated: 'AI Generated',
  brain_dump: 'Brain Dump',
  voice_storm: 'Voice Storm',
  trend_scrape: 'Trend',
  manual: 'Manual',
};

const SOURCE_COLORS: Record<ContentIdeaSource, string> = {
  ai_generated: 'bg-[var(--color-accent-light)] text-[var(--color-accent)]',
  brain_dump: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  voice_storm: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  trend_scrape: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  manual: 'bg-[var(--color-bg-secondary)] text-[var(--color-text)]',
};

const STATUS_LABELS: Record<ContentIdeaStatus, string> = {
  suggested: 'Suggested',
  approved: 'Approved',
  rejected: 'Rejected',
  saved: 'Saved',
  scripted: 'Scripted',
  filmed: 'Filmed',
  published: 'Published',
};

const STATUS_DOT_COLORS: Record<ContentIdeaStatus, string> = {
  suggested: 'bg-[var(--color-text-muted)]',
  approved: 'bg-[var(--color-accent)]',
  rejected: 'bg-[var(--color-error)]',
  saved: 'bg-[var(--color-warning)]',
  scripted: 'bg-[var(--color-accent)]',
  filmed: 'bg-[var(--color-success)]',
  published: 'bg-[var(--color-success)]',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IdeaCard({
  idea,
  variant = 'pipeline',
  onApprove,
  onSave,
  onReject,
  onStatusChange,
  onClick,
  animationClass,
}: IdeaCardProps) {
  const isSuggested = variant === 'suggested';

  return (
    <div
      className={`group relative rounded-[var(--radius-lg)] border bg-[var(--color-bg-card)] shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)] ${
        idea.status === 'approved'
          ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent-light)]'
          : 'border-[var(--color-border)]'
      } ${animationClass || ''}`}
    >
      {/* Main content — clickable */}
      <button
        type="button"
        className="w-full cursor-pointer p-5 text-left"
        onClick={() => onClick?.(idea)}
      >
        {/* Title */}
        <h3 className="text-base font-semibold leading-snug text-[var(--color-text-primary)] line-clamp-2">
          {idea.title}
        </h3>

        {/* Description */}
        {idea.description && (
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)] line-clamp-3">
            {idea.description}
          </p>
        )}

        {/* Tags row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* Source badge */}
          <span
            className={`inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium ${
              SOURCE_COLORS[idea.source]
            }`}
          >
            {SOURCE_LABELS[idea.source]}
          </span>

          {/* Status indicator (pipeline variant only) */}
          {!isSuggested && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLORS[idea.status]}`}
              />
              {STATUS_LABELS[idea.status]}
            </span>
          )}

          {/* Trend link */}
          {idea.trendData?.sourceUrl && (
            <a
              href={idea.trendData.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              {idea.trendData.platform || 'Source'}
            </a>
          )}
        </div>

        {/* Metadata tags: Priority Score + Content Pillar */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)]">
            Priority Score: {idea.priorityScore != null ? idea.priorityScore : 'None'}
          </span>
          <span className="inline-flex items-center rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)]">
            Content Pillar: {idea.contentPillar || 'None'}
          </span>
        </div>
      </button>

      {/* Action buttons */}
      <div className="flex border-t border-[var(--color-border-light)] px-2 py-1.5">
        {isSuggested ? (
          /* Suggested ideas: Approve / Save / Reject */
          <>
            <button
              type="button"
              onClick={() => onApprove?.(idea._id)}
              className="idea-action-btn flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] py-2 text-xs font-medium text-[var(--color-success)] transition-colors hover:bg-[var(--color-success-light)]"
              title="Approve"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Approve
            </button>
            <button
              type="button"
              onClick={() => onSave?.(idea._id)}
              className="idea-action-btn flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] py-2 text-xs font-medium text-[var(--color-warning)] transition-colors hover:bg-[var(--color-warning-light)]"
              title="Save for Later"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
              </svg>
              Save
            </button>
            <button
              type="button"
              onClick={() => onReject?.(idea._id)}
              className="idea-action-btn flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] py-2 text-xs font-medium text-[var(--color-error)] transition-colors hover:bg-[var(--color-error-light)]"
              title="Reject"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              Pass
            </button>
          </>
        ) : (
          /* Pipeline ideas: status dropdown */
          <>
            <select
              value={idea.status}
              onChange={(e) =>
                onStatusChange?.(idea._id, e.target.value as ContentIdeaStatus)
              }
              onClick={(e) => e.stopPropagation()}
              className="flex-1 cursor-pointer rounded-[var(--radius-md)] border-none bg-transparent py-2 pl-2 text-xs font-medium text-[var(--color-text-secondary)] outline-none transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              <option value="approved">Approved</option>
              <option value="saved">Saved for Later</option>
              <option value="scripted">Scripted</option>
              <option value="filmed">Filmed</option>
              <option value="published">Published</option>
            </select>
          </>
        )}
      </div>
    </div>
  );
}
