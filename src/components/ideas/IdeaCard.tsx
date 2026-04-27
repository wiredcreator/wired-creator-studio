'use client';

import type { ContentIdeaStatus, ContentIdeaSource, ContentIdeaPriority } from '@/models/ContentIdea';
import { useTimezone } from '@/hooks/useTimezone';

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
  tags?: string[];
  priority?: ContentIdeaPriority;
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
  onDelete?: (id: string) => void;
  /** For enter/exit animations */
  animationClass?: string;
  /** Multi-select checkbox mode for suggested cards */
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  /** User's saved tag library for color lookup */
  savedTags?: Array<{ name: string; color: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SUGGESTED_SOURCE_LABELS: Record<ContentIdeaSource, string> = {
  ai_generated: 'Brand Brain',
  brain_dump: 'Brain Dump',
  voice_storm: 'Voice Storm',
  trend_scrape: 'Content Scout',
  manual: 'Manual',
};

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

const PRIORITY_LABELS: Record<string, string> = {
  high: 'High priority',
  medium: 'Medium priority',
  low: 'Low priority',
  none: 'No priority',
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  high: { bg: 'var(--color-error)', text: '#FFFFFF' },
  medium: { bg: 'var(--color-accent)', text: '#FFFFFF' },
  low: { bg: 'var(--color-bg-elevated)', text: 'var(--color-text-primary)' },
  none: { bg: 'var(--color-bg-secondary)', text: 'var(--color-text-secondary)' },
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
  onDelete,
  animationClass,
  isSelected,
  onToggleSelect,
  savedTags,
}: IdeaCardProps) {
  const { formatDate } = useTimezone();
  const isSuggested = variant === 'suggested';

  // Suggested variant: checkbox-based multi-select (no auto-save on click)
  if (isSuggested) {
    const handleCheckboxClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSelect?.(idea._id);
    };

    return (
      <div
        className={`group relative rounded-[var(--radius-lg)] border bg-[var(--color-bg-card)] shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)] ${
          isSelected
            ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent-light)]'
            : 'border-[var(--color-border)]'
        } ${animationClass || ''}`}
      >
        <div className="flex items-start gap-3 p-5">
          {/* Main content -- clickable */}
          <button
            type="button"
            className="min-w-0 flex-1 cursor-pointer text-left"
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

            {/* Source badge + date */}
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center rounded-[var(--radius-full)] bg-[var(--color-bg-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text)]">
                {SUGGESTED_SOURCE_LABELS[idea.source]}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {formatDate(idea.createdAt, { month: 'long', day: 'numeric' })}
              </span>
            </div>
          </button>

          {/* Checkbox circle -- toggles selection, does NOT auto-save */}
          <button
            type="button"
            onClick={handleCheckboxClick}
            className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200"
            style={{
              borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
              backgroundColor: isSelected ? 'var(--color-accent)' : 'transparent',
            }}
            title={isSelected ? 'Selected' : 'Select to save'}
          >
            {isSelected && (
              <svg className="h-3.5 w-3.5 text-[var(--color-bg-dark)]" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Pipeline variant
  return (
    <div
      className={`group relative rounded-[var(--radius-lg)] border bg-[var(--color-bg-card)] shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)] ${
        idea.status === 'approved'
          ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent-light)]'
          : 'border-[var(--color-border)]'
      } ${animationClass || ''}`}
    >
      {/* Hover trash icon -- top-right corner */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(idea._id); }}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-card)] text-[var(--color-text-muted)] opacity-0 shadow-[var(--shadow-sm)] transition-all duration-150 hover:bg-[var(--color-error)] hover:text-white group-hover:opacity-100"
          title="Delete idea"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      )}

      {/* Main content -- clickable */}
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
        {idea.tags && idea.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {idea.tags.map((tag) => {
              const saved = savedTags?.find((s) => s.name === tag.toLowerCase());
              return (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-[11px] font-medium"
                  style={saved
                    ? { backgroundColor: saved.color, color: '#FFFFFF' }
                    : { border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }
                  }
                >
                  {tag}
                </span>
              );
            })}
          </div>
        )}

        {/* Priority, pillar, date row */}
        <div className={`${idea.tags && idea.tags.length > 0 ? 'mt-2' : 'mt-3'} flex flex-wrap items-center gap-2`}>
          {/* Priority tag */}
          <span
            className="inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: PRIORITY_COLORS[idea.priority || 'none'].bg,
              color: PRIORITY_COLORS[idea.priority || 'none'].text,
            }}
          >
            {PRIORITY_LABELS[idea.priority || 'none']}
          </span>

          {/* Content pillar tag */}
          {idea.contentPillar && (
            <span className="inline-flex items-center rounded-[var(--radius-full)] bg-[var(--color-accent-light)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-accent)]">
              {idea.contentPillar}
            </span>
          )}

          {/* Date */}
          <span className="ml-auto text-xs text-[var(--color-text-muted)]">
            {formatDate(idea.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </button>

      {/* Action buttons -- pipeline: status dropdown */}
      <div className="flex items-center border-t border-[var(--color-border-light)] px-2 py-1.5">
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
      </div>
    </div>
  );
}
