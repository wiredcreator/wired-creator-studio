'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScriptStatus } from '@/models/Script';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScriptFeedbackItem {
  userId: string;
  text: string;
  createdAt: string;
}

export interface ScriptEditorData {
  _id: string;
  title: string;
  fullScript: string;
  bulletPoints: string[];
  teleprompterVersion: string;
  thumbnail?: string;
  status: ScriptStatus;
  feedback: ScriptFeedbackItem[];
  version: number;
  ideaId?: {
    _id: string;
    title: string;
  };
  createdAt: string;
}

interface ScriptEditorProps {
  script: ScriptEditorData;
  onSave: (updates: {
    title?: string;
    fullScript?: string;
    bulletPoints?: string[];
    teleprompterVersion?: string;
    status?: ScriptStatus;
    thumbnail?: string;
  }) => void;
  onRegenerate: () => void;
  onAddFeedback: (text: string) => void;
  onRevert: () => void;
  onClose: () => void;
  isSaving?: boolean;
  isRegenerating?: boolean;
  isReverting?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ViewMode = 'full' | 'bullets' | 'teleprompter';

const STATUS_OPTIONS: { value: ScriptStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'In Review' },
  { value: 'approved', label: 'Ready to Film' },
  { value: 'filming', label: 'Filming' },
  { value: 'completed', label: 'Published' },
  { value: 'published', label: 'Published' },
];

const STATUS_COLORS: Record<ScriptStatus, string> = {
  draft: 'text-[var(--color-text-secondary)]',
  review: 'text-[var(--color-warning)]',
  approved: 'text-[var(--color-accent)]',
  filming: 'text-[var(--color-success)]',
  completed: 'text-[var(--color-success)]',
  published: 'text-[var(--color-success)]',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024; // 2MB

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScriptEditor({
  script,
  onSave,
  onRegenerate,
  onAddFeedback,
  onRevert,
  onClose,
  isSaving = false,
  isRegenerating = false,
  isReverting = false,
}: ScriptEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [title, setTitle] = useState(script.title);
  const [fullScript, setFullScript] = useState(script.fullScript);
  const [bulletPoints, setBulletPoints] = useState(script.bulletPoints);
  const [teleprompterVersion, setTeleprompterVersion] = useState(script.teleprompterVersion);
  const [status, setStatus] = useState<ScriptStatus>(script.status);
  const [thumbnail, setThumbnail] = useState(script.thumbnail || '');
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const markChanged = () => {
    if (!hasChanges) setHasChanges(true);
  };

  const buildUpdates = useCallback((overrideStatus?: ScriptStatus) => ({
    title,
    fullScript,
    bulletPoints,
    teleprompterVersion,
    status: overrideStatus || status,
    thumbnail,
  }), [title, fullScript, bulletPoints, teleprompterVersion, status, thumbnail]);

  const handleSave = (overrideStatus?: ScriptStatus) => {
    if (overrideStatus) setStatus(overrideStatus);
    onSave(buildUpdates(overrideStatus));
    setHasChanges(false);
  };

  const handleBulletChange = (index: number, value: string) => {
    const updated = [...bulletPoints];
    updated[index] = value;
    setBulletPoints(updated);
    markChanged();
  };

  const handleAddBullet = () => {
    setBulletPoints([...bulletPoints, '']);
    markChanged();
  };

  const handleRemoveBullet = (index: number) => {
    setBulletPoints(bulletPoints.filter((_, i) => i !== index));
    markChanged();
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setOverIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      handleDragEnd();
      return;
    }
    const updated = [...bulletPoints];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(dropIndex, 0, moved);
    setBulletPoints(updated);
    markChanged();
    handleDragEnd();
  };

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) return;
    onAddFeedback(feedbackText.trim());
    setFeedbackText('');
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_THUMBNAIL_SIZE) {
      alert('Thumbnail must be under 2MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setThumbnail(result);
      markChanged();
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveThumbnail = () => {
    setThumbnail('');
    markChanged();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Browser-level protection: warn before closing/refreshing with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasChanges) return;
      e.preventDefault();
      // Most modern browsers ignore custom messages but still show a prompt
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);

  // Intercept the back/close button with a confirmation dialog
  const handleClose = useCallback(() => {
    if (!hasChanges) {
      onClose();
      return;
    }
    const shouldSave = window.confirm(
      'You have unsaved changes. Do you want to save before leaving?'
    );
    if (shouldSave) {
      onSave(buildUpdates());
      setHasChanges(false);
    }
    onClose();
  }, [hasChanges, onClose, onSave, buildUpdates]);

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={handleClose}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to scripts
          </button>

          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); markChanged(); }}
            className="w-full border-none bg-transparent text-xl font-semibold text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
            placeholder="Script title..."
          />

          {script.ideaId && typeof script.ideaId === 'object' && (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Based on: {script.ideaId.title}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Version badge */}
          <span className="rounded-[var(--radius-full)] bg-[var(--color-bg-secondary)] px-2.5 py-1 text-xs text-white">
            v{script.version}
          </span>

          {/* Status selector */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as ScriptStatus); markChanged(); }}
            className={`cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs font-medium outline-none transition-colors focus:border-[var(--color-accent)] ${STATUS_COLORS[status]}`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Thumbnail upload section */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Thumbnail
        </label>
        {thumbnail ? (
          <div className="relative inline-block rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
            <img
              src={thumbnail}
              alt="Script thumbnail"
              className="block max-h-48 w-auto object-contain"
            />
            <button
              type="button"
              onClick={handleRemoveThumbnail}
              className="absolute top-2 right-2 rounded-[var(--radius-md)] bg-[var(--color-bg-card)] p-1.5 text-[var(--color-text-muted)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--color-error-light)] hover:text-[var(--color-error)]"
              title="Remove thumbnail"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-4 text-sm text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
            Upload thumbnail
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleThumbnailUpload}
          className="hidden"
        />
      </div>

      {/* View mode tabs */}
      <div className="mb-4 flex gap-1 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-1">
        {([
          { key: 'full', label: 'Full Script', icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          )},
          { key: 'bullets', label: 'Key Beats', icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          )},
          { key: 'teleprompter', label: 'Teleprompter', icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
          )},
        ] as { key: ViewMode; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setViewMode(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-medium transition-all ${
              viewMode === key
                ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-sm)]">
        {viewMode === 'full' && (
          <textarea
            value={fullScript}
            onChange={(e) => { setFullScript(e.target.value); markChanged(); }}
            className="min-h-[400px] w-full resize-y rounded-[var(--radius-lg)] border-none bg-transparent p-6 text-sm leading-relaxed text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
            placeholder="Write your full script here..."
          />
        )}

        {viewMode === 'bullets' && (
          <div className="p-6 space-y-1">
            {bulletPoints.map((bullet, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
                className={`group flex items-start gap-1.5 rounded-[var(--radius-md)] px-1 transition-all ${
                  dragIndex === index
                    ? 'opacity-40'
                    : overIndex === index && dragIndex !== null
                      ? 'border-t-2 border-[var(--color-accent)]'
                      : 'border-t-2 border-transparent'
                }`}
              >
                {/* Drag handle */}
                <button
                  type="button"
                  className="mt-2 shrink-0 cursor-grab rounded-[var(--radius-sm)] p-0.5 text-[var(--color-text-muted)] opacity-40 transition-opacity hover:opacity-100 group-hover:opacity-70 active:cursor-grabbing"
                  onMouseDown={(e) => e.currentTarget.closest('[draggable]')?.setAttribute('data-dragging', 'true')}
                  title="Drag to reorder"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="6" r="1.5" />
                    <circle cx="15" cy="6" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" />
                    <circle cx="15" cy="12" r="1.5" />
                    <circle cx="9" cy="18" r="1.5" />
                    <circle cx="15" cy="18" r="1.5" />
                  </svg>
                </button>
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                <input
                  type="text"
                  value={bullet}
                  onChange={(e) => handleBulletChange(index, e.target.value)}
                  className="flex-1 rounded-[var(--radius-sm)] border-none bg-transparent py-1.5 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:bg-[var(--color-bg-secondary)]"
                  placeholder="Key beat..."
                />
                <button
                  type="button"
                  onClick={() => handleRemoveBullet(index)}
                  className="mt-1 shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-error-light)] hover:text-[var(--color-error)]"
                  title="Remove"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddBullet}
              className="mt-2 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent-light)]"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add beat
            </button>
          </div>
        )}

        {viewMode === 'teleprompter' && (
          <div className="p-6">
            <textarea
              value={teleprompterVersion}
              onChange={(e) => { setTeleprompterVersion(e.target.value); markChanged(); }}
              className="min-h-[500px] w-full resize-y rounded-[var(--radius-lg)] border-none bg-[var(--color-bg-dark)] p-8 font-mono text-2xl font-medium leading-[1.8] tracking-wide text-[var(--color-text-inverse)] outline-none"
              placeholder="Teleprompter text..."
              style={{ caretColor: 'var(--color-accent)' }}
            />
          </div>
        )}
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="mt-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-bg-secondary)] px-3 py-2">
          <svg className="h-4 w-4 shrink-0 text-[var(--color-warning)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span className="text-sm font-medium text-[var(--color-warning)]">Unsaved changes</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Save as Draft */}
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              'Save as Draft'
            )}
          </button>

          {/* Save as Ready to Film */}
          <button
            type="button"
            onClick={() => handleSave('approved')}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save as Ready to Film
          </button>

          {/* Regenerate */}
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRegenerating ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Regenerating...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                </svg>
                Regenerate
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFeedback(!showFeedback)}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
            Feedback ({script.feedback.length})
          </button>

          <button
            type="button"
            onClick={() => setShowRevertConfirm(true)}
            disabled={isReverting}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            {isReverting ? 'Reverting...' : 'Revert to idea'}
          </button>
        </div>
      </div>

      {/* Revert confirmation */}
      {showRevertConfirm && (
        <div className="mt-4 animate-fadeIn rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <p className="text-sm text-[var(--color-text-primary)]">
            Revert this script back to the idea stage? You can add more resources and regenerate the script later.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setShowRevertConfirm(false); onRevert(); }}
              disabled={isReverting}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isReverting ? 'Reverting...' : 'Yes, revert'}
            </button>
            <button
              type="button"
              onClick={() => setShowRevertConfirm(false)}
              className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Feedback section */}
      {showFeedback && (
        <div className="mt-4 animate-fadeIn rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <h4 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">Feedback & Notes</h4>

          {script.feedback.length > 0 ? (
            <div className="mb-4 space-y-3">
              {script.feedback.map((fb, i) => (
                <div
                  key={i}
                  className="rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white">Feedback</span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {formatDate(fb.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-text-primary)]">{fb.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">No feedback yet.</p>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitFeedback(); } }}
              placeholder="Leave a note..."
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] outline-none"
            />
            <button
              type="button"
              onClick={handleSubmitFeedback}
              disabled={!feedbackText.trim()}
              className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
