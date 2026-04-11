'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScriptStatus } from '@/models/Script';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import ModalPortal from '@/components/ModalPortal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScriptFeedbackItem {
  userId: string;
  text: string;
  createdAt: string;
}

export interface ScriptSection {
  id: string;
  title: string;
  content: string;
  source: 'ai' | 'user';
  order: number;
}

export interface ScriptEditorData {
  _id: string;
  title: string;
  fullScript: string;
  bulletPoints: string[];
  teleprompterVersion: string;
  sections?: ScriptSection[];
  platforms?: string[];
  thumbnail?: string;
  notes?: string;
  status: ScriptStatus;
  feedback: ScriptFeedbackItem[];
  version: number;
  ideaId?: {
    _id: string;
    title: string;
    contentPillar?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

interface ScriptEditorProps {
  script: ScriptEditorData;
  onSave: (updates: {
    title?: string;
    fullScript?: string;
    bulletPoints?: string[];
    teleprompterVersion?: string;
    sections?: ScriptSection[];
    status?: ScriptStatus;
    thumbnail?: string;
    platforms?: string[];
    notes?: string;
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

type ViewMode = 'full' | 'sections' | 'bullets' | 'teleprompter';

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function estimateReadTime(wordCount: number): number {
  // 150 words per minute for speaking pace
  return Math.ceil(wordCount / 150);
}

function generateSectionId(): string {
  return `section_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

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

// Section color mapping — matches the walkthrough prototype
const SECTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  hook: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: '#ef4444' },
  introduction: { bg: 'rgba(20, 184, 166, 0.1)', text: '#14b8a6', border: '#14b8a6' },
  intro: { bg: 'rgba(20, 184, 166, 0.1)', text: '#14b8a6', border: '#14b8a6' },
  'main content': { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', border: '#3b82f6' },
  'call to action': { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7', border: '#a855f7' },
  cta: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7', border: '#a855f7' },
  conclusion: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: '#f59e0b' },
};

function getSectionColor(title: string) {
  const key = title.trim().toLowerCase();
  return SECTION_COLORS[key] || { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280', border: '#6b7280' };
}

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
  useUnsavedChanges(hasChanges);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [sections, setSections] = useState<ScriptSection[]>(
    () => (script.sections || []).sort((a, b) => a.order - b.order)
  );
  const [sectionDragIndex, setSectionDragIndex] = useState<number | null>(null);
  const [sectionOverIndex, setSectionOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showInfoSidebar, setShowInfoSidebar] = useState(true);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateSuccess, setDuplicateSuccess] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>(script.platforms || []);
  const [notes, setNotes] = useState(script.notes || '');
  const [showScriptText, setShowScriptText] = useState(false);
  const [scriptTextCopied, setScriptTextCopied] = useState(false);

  // Teleprompter state
  const [teleprompterSlide, setTeleprompterSlide] = useState(0);
  const [teleprompterDarkMode, setTeleprompterDarkMode] = useState(true);
  const [teleprompterFontSize, setTeleprompterFontSize] = useState(28);
  const [teleprompterCopied, setTeleprompterCopied] = useState(false);

  const markChanged = () => {
    if (!hasChanges) setHasChanges(true);
  };

  const PLATFORM_OPTIONS = ['YouTube', 'Instagram', 'TikTok', 'Podcast', 'LinkedIn'] as const;

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
    markChanged();
  };

  const buildUpdates = useCallback((overrideStatus?: ScriptStatus) => ({
    title,
    fullScript,
    bulletPoints,
    teleprompterVersion,
    sections,
    status: overrideStatus || status,
    thumbnail,
    platforms,
    notes,
  }), [title, fullScript, bulletPoints, teleprompterVersion, sections, status, thumbnail, platforms, notes]);

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

  // --- Section handlers ---
  const handleAddSection = () => {
    const newSection: ScriptSection = {
      id: generateSectionId(),
      title: '',
      content: '',
      source: 'user',
      order: sections.length,
    };
    setSections([...sections, newSection]);
    markChanged();
  };

  const handleSectionTitleChange = (index: number, value: string) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], title: value };
    setSections(updated);
    markChanged();
  };

  const handleSectionContentChange = (index: number, value: string) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], content: value };
    setSections(updated);
    markChanged();
  };

  const handleRemoveSection = (index: number) => {
    const updated = sections.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }));
    setSections(updated);
    markChanged();
  };

  const handleSectionDragStart = (index: number) => {
    setSectionDragIndex(index);
  };

  const handleSectionDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setSectionOverIndex(index);
  };

  const handleSectionDragEnd = () => {
    setSectionDragIndex(null);
    setSectionOverIndex(null);
  };

  const handleSectionDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (sectionDragIndex === null || sectionDragIndex === dropIndex) {
      handleSectionDragEnd();
      return;
    }
    const updated = [...sections];
    const [moved] = updated.splice(sectionDragIndex, 1);
    updated.splice(dropIndex, 0, moved);
    setSections(updated.map((s, i) => ({ ...s, order: i })));
    markChanged();
    handleSectionDragEnd();
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

  const handleDuplicateToIdeas = async () => {
    setIsDuplicating(true);
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: fullScript.slice(0, 500),
          source: 'manual',
          status: 'saved',
          contentPillar: script.ideaId?.contentPillar || '',
        }),
      });
      if (!res.ok) throw new Error('Failed to duplicate');
      setDuplicateSuccess(true);
      setTimeout(() => setDuplicateSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to duplicate idea:', err);
      alert('Failed to duplicate to ideas. Please try again.');
    } finally {
      setIsDuplicating(false);
    }
  };

  const wordCount = countWords(fullScript);
  const readTime = estimateReadTime(wordCount);

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

  // --- Teleprompter helpers ---
  const teleprompterSlides = (() => {
    // Prefer sections if available
    if (sections.length > 0) {
      return sections.map((s) => ({
        title: s.title,
        content: s.content,
      }));
    }
    // Fall back to splitting teleprompterVersion (or fullScript) by double newlines
    const text = teleprompterVersion || fullScript || '';
    const parts = text.split(/\n\s*\n/).filter((p) => p.trim());
    if (parts.length === 0) return [{ title: '', content: 'No script content yet.' }];
    return parts.map((p, i) => ({ title: `Part ${i + 1}`, content: p.trim() }));
  })();

  const totalSlides = teleprompterSlides.length;

  const goToSlide = useCallback((dir: 'prev' | 'next') => {
    setTeleprompterSlide((prev) => {
      if (dir === 'prev') return Math.max(0, prev - 1);
      return Math.min(totalSlides - 1, prev + 1);
    });
  }, [totalSlides]);

  // Reset slide index when entering teleprompter or when slides change
  useEffect(() => {
    if (viewMode === 'teleprompter') {
      setTeleprompterSlide((prev) => Math.min(prev, Math.max(0, totalSlides - 1)));
    }
  }, [viewMode, totalSlides]);

  // Keyboard navigation for teleprompter
  useEffect(() => {
    if (viewMode !== 'teleprompter') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToSlide('prev'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goToSlide('next'); }
      if (e.key === 'Escape') { e.preventDefault(); setViewMode('full'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewMode, goToSlide]);

  const handleCopyScript = useCallback(() => {
    const text = teleprompterVersion || fullScript || '';
    navigator.clipboard.writeText(text).then(() => {
      setTeleprompterCopied(true);
      setTimeout(() => setTeleprompterCopied(false), 2000);
    });
  }, [teleprompterVersion, fullScript]);

  // Build clean script text organized by sections for the Script Text panel
  const cleanScriptText = (() => {
    if (sections.length > 0) {
      return sections.map((s) => ({
        title: s.title.toUpperCase(),
        content: s.content,
      }));
    }
    // Fall back to fullScript split by double newlines
    const text = fullScript || '';
    const parts = text.split(/\n\s*\n/).filter((p) => p.trim());
    if (parts.length === 0) return [{ title: '', content: 'No script content yet.' }];
    return parts.map((p) => ({ title: '', content: p.trim() }));
  })();

  const handleCopyScriptText = useCallback(() => {
    const text = sections.length > 0
      ? sections.map((s) => `${s.title.toUpperCase()}\n${s.content}`).join('\n\n')
      : fullScript || '';
    navigator.clipboard.writeText(text).then(() => {
      setScriptTextCopied(true);
      setTimeout(() => setScriptTextCopied(false), 2000);
    });
  }, [sections, fullScript]);

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
            data-transparent
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
          {/* Word count + read time */}
          <span className="hidden sm:inline text-xs text-[var(--color-text-muted)]">
            {wordCount.toLocaleString()} words
          </span>
          <span className="hidden sm:inline text-xs text-[var(--color-text-muted)]">
            ~{readTime} min
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

          {/* Script Text / Teleprompter button */}
          <button
            type="button"
            onClick={() => setShowScriptText(true)}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
            Teleprompter
          </button>

          {/* Save Script */}
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-1.5 text-xs font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Script'}
          </button>
        </div>
      </div>

      {/* Main content + sidebar layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">

      {/* View mode tabs */}
      <div className="mb-4 flex gap-1 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-1">
        {([
          { key: 'full', label: 'Full Script', icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          )},
          { key: 'sections', label: 'Sections', icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
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
            data-transparent
            value={fullScript}
            onChange={(e) => { setFullScript(e.target.value); markChanged(); }}
            className="min-h-[400px] w-full resize-y rounded-[var(--radius-lg)] border-none bg-transparent p-6 text-sm leading-relaxed text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
            placeholder="Write your full script here..."
          />
        )}

        {viewMode === 'sections' && (
          <div className="p-6 space-y-3">
            {sections.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                No sections yet. Add your first section to organize your script.
              </p>
            )}

            {sections.map((section, index) => (
              <div
                key={section.id}
                draggable
                onDragStart={() => handleSectionDragStart(index)}
                onDragOver={(e) => handleSectionDragOver(e, index)}
                onDragEnd={handleSectionDragEnd}
                onDrop={(e) => handleSectionDrop(e, index)}
                className={`group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] transition-all ${
                  sectionDragIndex === index
                    ? 'opacity-40'
                    : sectionOverIndex === index && sectionDragIndex !== null
                      ? 'border-[var(--color-accent)]'
                      : ''
                }`}
              >
                {/* Section header */}
                {(() => {
                  const sectionColor = getSectionColor(section.title);
                  const sectionWordCount = countWords(section.content);
                  return (
                <div
                  className="flex items-center gap-2 px-4 py-2.5"
                  style={{ borderBottom: `2px solid ${sectionColor.border}` }}
                >
                  {/* Drag handle */}
                  <button
                    type="button"
                    className="shrink-0 cursor-grab rounded-[var(--radius-sm)] p-0.5 text-[var(--color-text-muted)] opacity-40 transition-opacity hover:opacity-100 group-hover:opacity-70 active:cursor-grabbing"
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

                  {/* Title input with colored text */}
                  <input
                    type="text"
                    data-transparent
                    value={section.title}
                    onChange={(e) => handleSectionTitleChange(index, e.target.value)}
                    className="flex-1 border-none bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--color-text-muted)]"
                    style={{ color: sectionColor.text }}
                    placeholder="Section title..."
                  />

                  {/* Source badge */}
                  {section.source === 'ai' && (
                    <span className="shrink-0 rounded-[var(--radius-full)] bg-[var(--color-accent-light)] px-2 py-0.5 text-xs font-medium text-[var(--color-accent)]">
                      AI
                    </span>
                  )}

                  {/* Per-section word count */}
                  <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                    {sectionWordCount} words
                  </span>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveSection(index)}
                    className="shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--color-text-muted)] opacity-0 transition-all hover:bg-[var(--color-error-light)] hover:text-[var(--color-error)] group-hover:opacity-100"
                    title="Remove section"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                  );
                })()}

                {/* Section content */}
                <textarea
                  data-transparent
                  value={section.content}
                  onChange={(e) => handleSectionContentChange(index, e.target.value)}
                  className="min-h-[120px] w-full resize-y border-none bg-transparent px-4 py-3 text-sm leading-relaxed text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                  placeholder="Write this section's content..."
                />
              </div>
            ))}

            {/* Add Section button */}
            <button
              type="button"
              onClick={handleAddSection}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Section
            </button>
          </div>
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
                  data-transparent
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
          <div className="p-6 text-center text-sm text-[var(--color-text-muted)]">
            Teleprompter is open in full-screen mode.
            <button
              type="button"
              onClick={() => setViewMode('full')}
              className="ml-2 text-[var(--color-accent)] underline outline-none ring-0"
            >
              Exit teleprompter
            </button>
          </div>
        )}
      </div>

      {/* ---- Full-screen teleprompter overlay ---- */}
      {viewMode === 'teleprompter' && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{
            backgroundColor: teleprompterDarkMode ? '#030712' : '#ffffff',
            color: teleprompterDarkMode ? '#ffffff' : '#111827',
          }}
        >
          {/* Top toolbar */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{
              backgroundColor: teleprompterDarkMode ? '#111827' : '#f3f4f6',
              borderBottom: `1px solid ${teleprompterDarkMode ? '#1f2937' : '#e5e7eb'}`,
            }}
          >
            {/* Left: exit + title */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('full')}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium outline-none ring-0 transition-colors"
                style={{
                  backgroundColor: teleprompterDarkMode ? '#1f2937' : '#e5e7eb',
                  color: teleprompterDarkMode ? '#d1d5db' : '#374151',
                }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
                Exit
              </button>
              <span
                className="text-sm font-medium truncate max-w-[200px]"
                style={{ color: teleprompterDarkMode ? '#9ca3af' : '#6b7280' }}
              >
                {title || 'Teleprompter'}
              </span>
            </div>

            {/* Center: font size controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTeleprompterFontSize((s) => Math.max(18, s - 2))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold outline-none ring-0 transition-colors"
                style={{
                  backgroundColor: teleprompterDarkMode ? '#1f2937' : '#e5e7eb',
                  color: teleprompterDarkMode ? '#d1d5db' : '#374151',
                }}
                title="Decrease font size"
              >
                -
              </button>
              <span
                className="min-w-[48px] text-center text-xs font-medium tabular-nums"
                style={{ color: teleprompterDarkMode ? '#9ca3af' : '#6b7280' }}
              >
                {teleprompterFontSize}px
              </span>
              <button
                type="button"
                onClick={() => setTeleprompterFontSize((s) => Math.min(48, s + 2))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold outline-none ring-0 transition-colors"
                style={{
                  backgroundColor: teleprompterDarkMode ? '#1f2937' : '#e5e7eb',
                  color: teleprompterDarkMode ? '#d1d5db' : '#374151',
                }}
                title="Increase font size"
              >
                +
              </button>
            </div>

            {/* Right: dark/light toggle + copy */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTeleprompterDarkMode((d) => !d)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium outline-none ring-0 transition-colors"
                style={{
                  backgroundColor: teleprompterDarkMode ? '#1f2937' : '#e5e7eb',
                  color: teleprompterDarkMode ? '#d1d5db' : '#374151',
                }}
                title={teleprompterDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {teleprompterDarkMode ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                  </svg>
                )}
                {teleprompterDarkMode ? 'Light' : 'Dark'}
              </button>

              <button
                type="button"
                onClick={handleCopyScript}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium outline-none ring-0 transition-colors"
                style={{
                  backgroundColor: teleprompterCopied
                    ? (teleprompterDarkMode ? '#065f46' : '#d1fae5')
                    : (teleprompterDarkMode ? '#1f2937' : '#e5e7eb'),
                  color: teleprompterCopied
                    ? (teleprompterDarkMode ? '#6ee7b7' : '#065f46')
                    : (teleprompterDarkMode ? '#d1d5db' : '#374151'),
                }}
                title="Copy full script to clipboard"
              >
                {teleprompterCopied ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Slide content area -- click left/right halves to navigate */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            {/* Left click zone */}
            <button
              type="button"
              onClick={() => goToSlide('prev')}
              className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-w-resize outline-none ring-0"
              style={{ background: 'transparent' }}
              aria-label="Previous slide"
              disabled={teleprompterSlide === 0}
            />
            {/* Right click zone */}
            <button
              type="button"
              onClick={() => goToSlide('next')}
              className="absolute inset-y-0 right-0 z-10 w-1/3 cursor-e-resize outline-none ring-0"
              style={{ background: 'transparent' }}
              aria-label="Next slide"
              disabled={teleprompterSlide >= totalSlides - 1}
            />

            {/* Slide text */}
            <div className="z-0 flex max-h-full w-full max-w-4xl flex-col items-center justify-center px-8 py-12 text-center overflow-y-auto">
              {teleprompterSlides[teleprompterSlide]?.title && (
                <h2
                  className="mb-6 font-semibold tracking-tight"
                  style={{
                    fontSize: `${Math.min(teleprompterFontSize + 8, 56)}px`,
                    lineHeight: 1.2,
                    color: teleprompterDarkMode ? '#a78bfa' : '#7c3aed',
                  }}
                >
                  {teleprompterSlides[teleprompterSlide].title}
                </h2>
              )}
              <p
                className="whitespace-pre-wrap leading-relaxed"
                style={{
                  fontSize: `${teleprompterFontSize}px`,
                  lineHeight: 1.7,
                }}
              >
                {teleprompterSlides[teleprompterSlide]?.content}
              </p>
            </div>
          </div>

          {/* Bottom bar: slide indicator + arrow buttons */}
          <div
            className="flex items-center justify-center gap-4 px-5 py-3"
            style={{
              backgroundColor: teleprompterDarkMode ? '#111827' : '#f3f4f6',
              borderTop: `1px solid ${teleprompterDarkMode ? '#1f2937' : '#e5e7eb'}`,
            }}
          >
            <button
              type="button"
              onClick={() => goToSlide('prev')}
              disabled={teleprompterSlide === 0}
              className="flex h-9 w-9 items-center justify-center rounded-lg outline-none ring-0 transition-colors disabled:opacity-30"
              style={{
                backgroundColor: teleprompterDarkMode ? '#1f2937' : '#e5e7eb',
                color: teleprompterDarkMode ? '#d1d5db' : '#374151',
              }}
              aria-label="Previous slide"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>

            <span
              className="min-w-[60px] text-center text-sm font-medium tabular-nums"
              style={{ color: teleprompterDarkMode ? '#9ca3af' : '#6b7280' }}
            >
              {teleprompterSlide + 1} / {totalSlides}
            </span>

            <button
              type="button"
              onClick={() => goToSlide('next')}
              disabled={teleprompterSlide >= totalSlides - 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg outline-none ring-0 transition-colors disabled:opacity-30"
              style={{
                backgroundColor: teleprompterDarkMode ? '#1f2937' : '#e5e7eb',
                color: teleprompterDarkMode ? '#d1d5db' : '#374151',
              }}
              aria-label="Next slide"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="mt-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-bg-secondary)] px-3 py-2">
          <svg className="h-4 w-4 shrink-0 text-[var(--color-warning)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span className="text-sm font-medium text-[var(--color-warning)]">Unsaved changes</span>
        </div>
      )}

      {/* Secondary actions row */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
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

      {/* Mark as Ready to Film CTA */}
      {status !== 'approved' && status !== 'filming' && status !== 'completed' && status !== 'published' && (
        <button
          type="button"
          onClick={() => handleSave('approved')}
          disabled={isSaving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-accent)] py-3.5 text-sm font-semibold text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          {isSaving ? 'Saving...' : 'Mark as Ready to Film'}
        </button>
      )}

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
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] outline-none"
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

        </div>{/* end main content */}

        {/* Script Info Sidebar */}
        <div className="w-full lg:w-72 shrink-0">
          <button
            type="button"
            onClick={() => setShowInfoSidebar(!showInfoSidebar)}
            className="mb-3 flex w-full items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--color-bg-tertiary)] lg:hidden"
          >
            Script Info
            <svg className={`h-4 w-4 transition-transform ${showInfoSidebar ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          <div className={`${showInfoSidebar ? 'block' : 'hidden lg:block'}`}>
            {/* Thumbnail */}
            <div className="mb-4">
              {thumbnail ? (
                <div className="relative rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
                  <img
                    src={thumbnail}
                    alt="Script thumbnail"
                    className="block w-full object-cover"
                    style={{ aspectRatio: '16/9' }}
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
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] py-8 text-sm text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                  <span>Upload thumbnail</span>
                  <span className="text-xs text-[var(--color-text-muted)]">Drag & drop or click</span>
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

            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 space-y-5">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Script Info</h3>

              {/* Platform selector */}
              <div>
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Platform</span>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORM_OPTIONS.map((p) => {
                    const active = platforms.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors outline-none ring-0 ${
                          active
                            ? 'bg-[var(--color-accent)] text-[var(--color-bg-dark)]'
                            : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content Pillar */}
              {script.ideaId && typeof script.ideaId === 'object' && script.ideaId.contentPillar && (
                <div>
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Content Pillar</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, backgroundColor: 'rgba(74,144,217,0.1)', padding: '3px 12px', fontSize: 12, fontWeight: 500, color: '#4A90D9' }}>
                    {script.ideaId.contentPillar}
                  </span>
                </div>
              )}

              {/* Source */}
              {script.ideaId && typeof script.ideaId === 'object' && (
                <>
                  <div>
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Source</span>
                    <a
                      href="/dashboard/ideas"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)] transition-colors hover:underline"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                      </svg>
                      Ideas
                    </a>
                  </div>
                  <div>
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Original Idea</span>
                    <a
                      href={`/dashboard/ideas/${script.ideaId._id}`}
                      className="text-sm font-medium text-[var(--color-accent)] transition-colors hover:underline"
                    >
                      {script.ideaId.title}
                    </a>
                  </div>
                </>
              )}

              {/* Word Count */}
              <div>
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Word Count</span>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{wordCount.toLocaleString()} words</p>
              </div>

              {/* Estimated Read Time */}
              <div>
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Est. Read Time</span>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{readTime} min</p>
              </div>

              {/* Status */}
              <div>
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Status</span>
                <span className={`text-sm font-medium ${STATUS_COLORS[status]}`}>
                  {STATUS_OPTIONS.find((o) => o.value === status)?.label || status}
                </span>
              </div>

              {/* Created */}
              <div>
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Created</span>
                <p className="text-sm text-[var(--color-text-secondary)]">{formatDate(script.createdAt)}</p>
              </div>

              {/* Last Modified */}
              {script.updatedAt && (
                <div>
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Last Modified</span>
                  <p className="text-sm text-[var(--color-text-secondary)]">{formatDate(script.updatedAt)}</p>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-[var(--color-border)]" />

              {/* Duplicate to Ideas */}
              <button
                type="button"
                onClick={handleDuplicateToIdeas}
                disabled={isDuplicating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDuplicating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Duplicating...
                  </>
                ) : duplicateSuccess ? (
                  <>
                    <svg className="h-4 w-4 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    <span className="text-[var(--color-success)]">Duplicated!</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                    </svg>
                    Duplicate to Ideas
                  </>
                )}
              </button>

              {/* Revert to idea stage link */}
              <button
                type="button"
                onClick={() => setShowRevertConfirm(true)}
                disabled={isReverting}
                className="inline-flex w-full items-center justify-center gap-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                </svg>
                {isReverting ? 'Reverting...' : 'Revert to idea stage'}
              </button>
            </div>

            {/* Notes section */}
            <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
              <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Notes</h3>
              <textarea
                data-transparent
                value={notes}
                onChange={(e) => { setNotes(e.target.value); markChanged(); }}
                placeholder="Jot down any ideas, reminders, or things to research before filming..."
                className="min-h-[100px] w-full resize-y border-none bg-transparent text-sm leading-relaxed text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
              />
            </div>
          </div>
        </div>
      </div>{/* end flex layout */}

      {/* Script Text slide-in panel */}
      {showScriptText && (
        <ModalPortal>
        <div className="fixed inset-0 z-[9998] flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowScriptText(false)}
          />
          {/* Panel */}
          <div
            className="relative z-10 flex h-full w-full max-w-lg flex-col bg-[var(--color-bg-primary)] shadow-2xl animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-start justify-between border-b border-[var(--color-border)] px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Script Text</h2>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">Clean script to copy into any teleprompter app</p>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptText(false)}
                className="rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {cleanScriptText.map((block, i) => (
                <div key={i} className={i > 0 ? 'mt-6' : ''}>
                  {block.title && (
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      {block.title}
                    </h3>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-primary)]">
                    {block.content}
                  </p>
                </div>
              ))}
            </div>

            {/* Panel footer */}
            <div className="border-t border-[var(--color-border)] px-6 py-4 space-y-3">
              <button
                type="button"
                onClick={() => { setShowScriptText(false); setViewMode('teleprompter'); }}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-accent)] py-3 text-sm font-semibold text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
                Enter Teleprompter Mode
              </button>
              <button
                type="button"
                onClick={handleCopyScriptText}
                className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
              >
                {scriptTextCopied ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                    </svg>
                    Copy script text
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
