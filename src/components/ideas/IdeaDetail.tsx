'use client';

import { useEffect, useState } from 'react';
import type { ContentIdeaStatus, ContentIdeaSource } from '@/models/ContentIdea';
import type { IdeaCardData } from './IdeaCard';
import ModalPortal from '@/components/ModalPortal';
import VoiceInputWrapper from '@/components/VoiceInputWrapper';
import { useTimezone } from '@/hooks/useTimezone';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IdeaDetailProps {
  idea: IdeaCardData;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<IdeaCardData>) => void;
  onDelete: (id: string) => void;
  onStartScript?: (id: string) => void;
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

const STATUS_OPTIONS: { value: ContentIdeaStatus; label: string }[] = [
  { value: 'suggested', label: 'Suggested' },
  { value: 'approved', label: 'Approved' },
  { value: 'saved', label: 'Saved for Later' },
  { value: 'scripted', label: 'Scripted' },
  { value: 'filmed', label: 'Filmed' },
  { value: 'published', label: 'Published' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IdeaDetail({
  idea,
  onClose,
  onUpdate,
  onDelete,
  onStartScript,
}: IdeaDetailProps) {
  const { formatDate } = useTimezone();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveTitle = () => {
    if (title.trim() && title !== idea.title) {
      onUpdate(idea._id, { title: title.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleSaveDescription = () => {
    if (description !== idea.description) {
      onUpdate(idea._id, { description });
    }
    setIsEditingDescription(false);
  };

  const handleStatusChange = (newStatus: ContentIdeaStatus) => {
    onUpdate(idea._id, { status: newStatus });
  };

  const handleDelete = () => {
    onDelete(idea._id);
    onClose();
  };

  useEffect(() => {
    if (!showDeleteConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowDeleteConfirm(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteConfirm]);

  const createdDate = idea.createdAt
    ? formatDate(idea.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <ModalPortal>
    {/* Backdrop */}
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      {/* Panel */}
      <div className="idea-detail-enter relative w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-lg)]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--color-border-light)] px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span>{SOURCE_LABELS[idea.source]}</span>
              {createdDate && (
                <>
                  <span className="text-[var(--color-border)]">|</span>
                  <span>{createdDate}</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {/* Title — inline editable */}
          <div className="group/title">
            {isEditingTitle ? (
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setTitle(idea.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  autoFocus
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-3 py-2 text-lg font-semibold text-[var(--color-text-primary)] outline-none"
                />
              </div>
            ) : (
              <h2
                className="cursor-pointer rounded-[var(--radius-md)] px-3 py-2 text-lg font-semibold leading-snug text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                onClick={() => setIsEditingTitle(true)}
                title="Click to edit"
              >
                {idea.title}
              </h2>
            )}
          </div>

          {/* Description — inline editable */}
          <div className="mt-3 group/desc">
            {isEditingDescription ? (
              <div>
                <VoiceInputWrapper onTranscript={(text) => setDescription((prev) => prev ? prev + '\n' + text : text)}>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleSaveDescription}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setDescription(idea.description);
                        setIsEditingDescription(false);
                      }
                    }}
                    rows={4}
                    autoFocus
                    className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-3 py-2 text-sm leading-relaxed text-[var(--color-text-secondary)] outline-none"
                  />
                </VoiceInputWrapper>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Click outside to save. Press Esc to cancel.
                </p>
              </div>
            ) : (
              <p
                className="cursor-pointer rounded-[var(--radius-md)] px-3 py-2 text-sm leading-relaxed text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                onClick={() => setIsEditingDescription(true)}
                title="Click to edit"
              >
                {idea.description || 'No description. Click to add one.'}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="mt-5 space-y-3">
            {/* Content Pillar */}
            {idea.contentPillar && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Pillar
                </span>
                <span className="rounded-[var(--radius-full)] bg-[var(--color-bg-secondary)] px-3 py-1 text-xs font-medium text-[var(--color-text)]">
                  {idea.contentPillar}
                </span>
              </div>
            )}

            {/* Status dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                Status
              </span>
              <select
                value={idea.status}
                onChange={(e) => handleStatusChange(e.target.value as ContentIdeaStatus)}
                className="cursor-pointer appearance-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] py-2 pl-3 pr-8 text-sm font-medium text-[var(--color-text-primary)] outline-none transition-colors hover:border-[var(--color-accent)]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Trend data link */}
            {idea.trendData?.sourceUrl && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Source
                </span>
                <a
                  href={idea.trendData.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  {idea.trendData.platform || 'View source'}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-[var(--color-border-light)] px-6 py-4">
          <div>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-error)]">Delete this idea?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-[var(--radius-md)] bg-[var(--color-error)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium text-[var(--color-error)] transition-colors hover:bg-[var(--color-error-light)]"
              >
                Delete
              </button>
            )}
          </div>

          {(idea.status === 'approved' || idea.status === 'saved') && onStartScript && (
            <button
              type="button"
              onClick={() => onStartScript(idea._id)}
              className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-xs font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Start Script
            </button>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
