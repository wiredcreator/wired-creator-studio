'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScoutVideo {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  viewCount: number;
  publishedAt: string;
  url: string;
  description: string;
}

interface ScoutIdea {
  _id?: string;
  title: string;
  description: string;
  category: string;
}

interface GeneratedIdea {
  title: string;
  description: string;
}

interface ScoutSource {
  _id: string;
  channelUrl: string;
  channelName: string;
  channelId: string;
  source: 'manual' | 'discovered';
}

interface DiscoveredCandidate {
  channelName: string;
  channelUrl: string;
  channelId: string;
  source: 'ai' | 'search' | 'content-dna';
  thumbnailUrl?: string;
}

type SetupStep = 'idle' | 'discovering' | 'selecting' | 'scraping' | 'done';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (weeks < 5) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString();
}

const CATEGORY_COLORS: Record<string, string> = {
  'Research Roundup': '#3ECF8E',
  'Trend Angle': '#F0B429',
  'Pattern Analysis': '#8B5CF6',
  'Craft Deep-Dive': '#EC4899',
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] || 'var(--color-accent)';
}

// ---------------------------------------------------------------------------
// Carousel Arrow Button
// ---------------------------------------------------------------------------

function CarouselArrow({
  direction,
  onClick,
}: {
  direction: 'left' | 'right';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] shadow-[var(--shadow-md)] outline-none ring-0 transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
      style={{ [direction === 'left' ? 'left' : 'right']: -18 }}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        {direction === 'left' ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        )}
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Video Card
// ---------------------------------------------------------------------------

function VideoCard({
  video,
  onClick,
}: {
  video: ScoutVideo;
  onClick: (v: ScoutVideo) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(video)}
      className="group flex w-[240px] flex-shrink-0 flex-col rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] outline-none ring-0 transition-transform duration-200 hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-lg)] hover:scale-[1.03]"
      style={{ textAlign: 'left' }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden" style={{ borderRadius: '8px 8px 0 0' }}>
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-secondary)]">
            <svg className="h-10 w-10 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
        )}
        {/* Play overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <svg
            className="h-10 w-10 text-white opacity-0 transition-opacity group-hover:opacity-90"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h4
          className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-text-primary)]"
        >
          {video.title}
        </h4>
        <p className="text-xs text-[var(--color-text-muted)]">
          {video.channelName}
          {video.publishedAt && (
            <> &middot; {relativeTime(video.publishedAt)}</>
          )}
        </p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Video Detail Modal
// ---------------------------------------------------------------------------

function VideoDetailModal({
  video,
  onClose,
  userId,
}: {
  video: ScoutVideo;
  onClose: () => void;
  userId: string;
}) {
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([]);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(true);
  const [savingIdx, setSavingIdx] = useState<Set<number>>(new Set());
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());

  // Generate ideas on mount
  useEffect(() => {
    let cancelled = false;

    async function generate() {
      setIsLoadingIdeas(true);
      try {
        const res = await fetch('/api/content-scout/ideas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: video.videoId,
            title: video.title,
            channelName: video.channelName,
            viewCount: video.viewCount,
          }),
        });
        if (!res.ok) throw new Error('Failed to generate ideas');
        const data = await res.json();
        if (!cancelled) setIdeas(data.ideas || []);
      } catch (err) {
        console.error('Failed to generate ideas from video:', err);
      } finally {
        if (!cancelled) setIsLoadingIdeas(false);
      }
    }

    generate();
    return () => { cancelled = true; };
  }, [video]);

  const handleSaveIdea = async (idea: GeneratedIdea, idx: number) => {
    setSavingIdx((prev) => new Set(prev).add(idx));
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: idea.title,
          description: idea.description,
          source: 'content-scout',
          status: 'saved',
          trendData: {
            sourceUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
            platform: 'youtube',
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to save idea');
      setSavedIdx((prev) => new Set(prev).add(idx));
    } catch (err) {
      console.error('Failed to save idea:', err);
    } finally {
      setSavingIdx((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-lg)]"
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] outline-none ring-0 transition-colors hover:text-[var(--color-text-primary)]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* YouTube embed */}
        <div className="aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.videoId}?rel=0`}
            title={video.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Video info */}
        <div className="border-b border-[var(--color-border)] px-6 py-4">
          <p className="mb-1 text-xs text-[var(--color-text-muted)]">
            {video.channelName} &middot; {relativeTime(video.publishedAt)}
          </p>
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">{video.title}</h3>
        </div>

        {/* Ideas inspired by this video */}
        <div className="px-6 py-5">
          <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
            Ideas inspired by this video
          </h4>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Generated using your AI Brain &mdash; These are angles unique to your voice and niche.
          </p>

          {isLoadingIdeas ? (
            <div className="mt-6 flex flex-col items-center gap-3 py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
              <p className="animate-pulse text-sm text-[var(--color-text-muted)]">
                Generating ideas from this video...
              </p>
            </div>
          ) : ideas.length === 0 ? (
            <div className="mt-6 py-6 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                No ideas could be generated. Try another video.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {ideas.map((idea, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
                >
                  {/* Number badge */}
                  <div
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: 'var(--color-accent-light)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    {idx + 1}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {idea.title}
                    </h5>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                      {idea.description}
                    </p>
                  </div>

                  {/* Save button */}
                  <button
                    type="button"
                    onClick={() => handleSaveIdea(idea, idx)}
                    disabled={savingIdx.has(idx) || savedIdx.has(idx)}
                    className="flex-shrink-0 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium outline-none ring-0 transition-colors disabled:opacity-60"
                    style={{
                      backgroundColor: savedIdx.has(idx)
                        ? 'var(--color-success-light)'
                        : 'var(--color-accent)',
                      color: savedIdx.has(idx)
                        ? 'var(--color-success)'
                        : 'var(--color-bg-dark)',
                    }}
                  >
                    {savedIdx.has(idx)
                      ? 'Saved'
                      : savingIdx.has(idx)
                        ? 'Saving...'
                        : 'Save Idea'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unique Idea Row
// ---------------------------------------------------------------------------

function UniqueIdeaRow({
  idea,
  onSave,
}: {
  idea: ScoutIdea;
  onSave: (idea: ScoutIdea) => void;
}) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(idea);
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 transition-colors hover:border-[var(--color-border-light)]">
      {/* Save circle button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saved || saving}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] outline-none ring-0 transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-60"
        style={{
          backgroundColor: saved ? 'var(--color-accent-light)' : 'transparent',
          color: saved ? 'var(--color-accent)' : 'var(--color-text-muted)',
        }}
        title={saved ? 'Saved to parking lot' : 'Save to parking lot'}
      >
        {saving ? (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : saved ? (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        )}
      </button>

      {/* Title */}
      <span className="flex-1 text-sm text-[var(--color-text-primary)]">{idea.title}</span>

      {/* Category pill */}
      {idea.category && (
        <span
          className="flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: categoryColor(idea.category) + '22', color: categoryColor(idea.category) }}
        >
          {idea.category}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Channel Selection Screen (shown after discovery)
// ---------------------------------------------------------------------------

function ChannelSelectionScreen({
  candidates,
  onConfirm,
  onCancel,
}: {
  candidates: DiscoveredCandidate[];
  onConfirm: (selected: DiscoveredCandidate[]) => void;
  onCancel: () => void;
}) {
  const [allCandidates, setAllCandidates] = useState<DiscoveredCandidate[]>(candidates);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(candidates.map((c) => c.channelId))
  );
  const [manualUrl, setManualUrl] = useState('');
  const [addingManual, setAddingManual] = useState(false);
  const [manualError, setManualError] = useState('');

  const toggleChannel = (channelId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  const handleAddManual = async () => {
    const url = manualUrl.trim();
    if (!url) return;

    const isHandle = /^@[\w.-]+$/.test(url);
    const isYouTubeUrl = url.includes('youtube.com') || url.includes('youtu.be');

    if (!isHandle && !isYouTubeUrl) {
      setManualError('Enter a YouTube channel URL or @handle');
      return;
    }

    const channelUrl = isHandle ? `https://www.youtube.com/${url}` : url;

    // Check if already in list
    if (allCandidates.some(c => c.channelUrl === channelUrl)) {
      setManualError('This channel is already in the list');
      return;
    }

    setAddingManual(true);
    setManualError('');

    try {
      // Resolve channel info server-side via the sources API (which resolves channelId)
      const res = await fetch('/api/content-scout/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add: { channelUrl } }),
      });
      const data = await res.json();

      if (!res.ok) {
        setManualError(data.error || 'Failed to resolve channel');
        return;
      }

      // Find the newly added source to get its channelId
      const newSource = data.sources?.find(
        (s: { channelUrl: string }) => s.channelUrl === channelUrl
      );

      if (newSource) {
        const newCandidate: DiscoveredCandidate = {
          channelName: newSource.channelName || '',
          channelUrl: newSource.channelUrl,
          channelId: newSource.channelId || channelUrl,
          source: 'content-dna',
          thumbnailUrl: undefined,
        };
        setAllCandidates(prev => [...prev, newCandidate]);
        setSelected(prev => new Set(prev).add(newCandidate.channelId));
        setManualUrl('');

        // Remove from sources since we'll re-add via confirm
        // (it was added to resolve — we'll manage it through the selection flow)
        await fetch('/api/content-scout/sources', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ remove: channelUrl }),
        });
      }
    } catch {
      setManualError('Failed to add channel');
    } finally {
      setAddingManual(false);
    }
  };

  const handleConfirm = () => {
    const selectedChannels = allCandidates.filter((c) => selected.has(c.channelId));
    onConfirm(selectedChannels);
  };

  const totalSelected = selected.size;

  return (
    <div className="my-6">
      {/* Header */}
      <div className="mb-5">
        <h3 className="text-base font-bold text-[var(--color-text-primary)]">
          Select channels to follow
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          We found {allCandidates.length} channels in your niche. Click to deselect any you don&apos;t want.
        </p>
      </div>

      {/* Card grid */}
      <div className="flex flex-wrap gap-4">
        {allCandidates.map((candidate) => {
          const isSelected = selected.has(candidate.channelId);
          const handle = candidate.channelUrl.match(/@[\w.-]+/)?.[0] || '';
          const displayName = candidate.channelName || handle || candidate.channelUrl;

          return (
            <button
              key={candidate.channelId}
              type="button"
              onClick={() => toggleChannel(candidate.channelId)}
              className="group relative flex w-[130px] flex-col items-center rounded-[var(--radius-lg)] border p-4 outline-none ring-0 transition-all duration-200"
              style={{
                borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                backgroundColor: 'var(--color-bg-card)',
                opacity: isSelected ? 1 : 0.45,
              }}
            >
              {/* Checkmark badge */}
              {isSelected && (
                <div
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
              )}

              {/* Avatar */}
              <div className="mb-2.5 h-16 w-16 flex-shrink-0 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                {candidate.thumbnailUrl ? (
                  <img
                    src={candidate.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-lg font-bold text-white"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    {displayName[0].toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name */}
              <p className="w-full truncate text-center text-xs font-semibold text-[var(--color-text-primary)]">
                {displayName}
              </p>

              {/* Handle */}
              {handle && (
                <p className="w-full truncate text-center text-[10px] text-[var(--color-text-muted)]">
                  {handle}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Add more channels */}
      <div className="mt-5">
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
          Add more channels
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualUrl}
            onChange={(e) => { setManualUrl(e.target.value); setManualError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddManual()}
            placeholder="@handle or youtube.com/..."
            className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none ring-0 placeholder:text-[var(--color-text-muted)]"
          />
          <button
            type="button"
            onClick={handleAddManual}
            disabled={addingManual || !manualUrl.trim()}
            className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] outline-none ring-0 transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
          >
            {addingManual ? 'Adding...' : 'Add'}
          </button>
        </div>
        {manualError && (
          <p className="mt-1.5 text-xs text-red-400">{manualError}</p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] outline-none ring-0 transition-colors hover:text-[var(--color-text-primary)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={totalSelected === 0}
          className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-[var(--color-bg-dark)] outline-none ring-0 transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
        >
          Follow {totalSelected} channel{totalSelected !== 1 ? 's' : ''} & scan videos
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Sources Panel
// ---------------------------------------------------------------------------

function EditSourcesPanel({
  sources,
  onSourcesChanged,
  onReset,
}: {
  sources: ScoutSource[];
  onSourcesChanged: () => void;
  onReset: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    const url = newUrl.trim();
    if (!url) return;

    // Basic validation — must look like a YouTube channel URL or handle
    const isHandle = /^@[\w.-]+$/.test(url);
    const isYouTubeUrl = url.includes('youtube.com') || url.includes('youtu.be');

    if (!isHandle && !isYouTubeUrl) {
      setError('Enter a YouTube channel URL or @handle');
      return;
    }

    // Normalize: if it's just a handle like @NateHerk, make it a full URL
    const channelUrl = isHandle
      ? `https://www.youtube.com/${url}`
      : url;

    setAdding(true);
    setError('');
    try {
      const res = await fetch('/api/content-scout/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add: { channelUrl } }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add channel');
        return;
      }
      setNewUrl('');
      onSourcesChanged();
    } catch {
      setError('Failed to add channel');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (channelUrl: string) => {
    setRemoving(channelUrl);
    try {
      const res = await fetch('/api/content-scout/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove: channelUrl }),
      });
      if (res.ok) {
        onSourcesChanged();
      }
    } catch {
      // silently fail
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] outline-none ring-0 transition-colors hover:text-[var(--color-text-secondary)]"
      >
        <svg
          className="h-3.5 w-3.5 transition-transform"
          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        Edit Sources ({sources.length} channel{sources.length !== 1 ? 's' : ''})
      </button>

      {isOpen && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          {/* Add new channel */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              Add a YouTube channel
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newUrl}
                onChange={(e) => { setNewUrl(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="@handle or youtube.com/..."
                className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none ring-0 placeholder:text-[var(--color-text-muted)]"
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={adding || !newUrl.trim()}
                className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] outline-none ring-0 transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-red-400">{error}</p>
            )}
          </div>

          {/* Source list */}
          {sources.length > 0 ? (
            <div className="space-y-1.5">
              {sources.map((source) => (
                <div
                  key={source._id}
                  className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 transition-colors hover:bg-[var(--color-bg-secondary)]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                      {source.channelName || source.channelUrl}
                    </p>
                    <p className="truncate text-xs text-[var(--color-text-muted)]">
                      {source.channelUrl}
                      {source.channelId ? '' : ' — resolving channel ID...'}
                    </p>
                  </div>
                  <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{
                    backgroundColor: source.source === 'manual' ? 'var(--color-accent-light)' : 'var(--color-bg-secondary)',
                    color: source.source === 'manual' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  }}>
                    {source.source === 'manual' ? 'Manual' : 'Discovered'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(source.channelUrl)}
                    disabled={removing === source.channelUrl}
                    className="flex-shrink-0 rounded-full p-1 text-[var(--color-text-muted)] outline-none ring-0 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Remove channel"
                  >
                    {removing === source.channelUrl ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-[var(--color-text-muted)]">
              No channels added yet. Run discovery or add one above.
            </p>
          )}

          {/* Clear (Dev) button */}
          <div className="mt-4 border-t border-[var(--color-border)] pt-3">
            <button
              type="button"
              onClick={async () => {
                setResetting(true);
                try {
                  const res = await fetch('/api/content-scout/reset', { method: 'DELETE' });
                  if (res.ok) onReset();
                } catch { /* ignore */ }
                setResetting(false);
              }}
              disabled={resetting}
              className="rounded-[var(--radius-md)] border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 outline-none ring-0 transition-colors hover:bg-red-500/10 disabled:opacity-40"
            >
              {resetting ? 'Clearing...' : 'Clear (Dev)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ContentScout Component
// ---------------------------------------------------------------------------

export default function ContentScout({ userId }: { userId: string }) {
  const [videos, setVideos] = useState<ScoutVideo[]>([]);
  const [uniqueIdeas, setUniqueIdeas] = useState<ScoutIdea[]>([]);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [setupStep, setSetupStep] = useState<SetupStep>('idle');
  const [selectedVideo, setSelectedVideo] = useState<ScoutVideo | null>(null);
  const [sources, setSources] = useState<ScoutSource[]>([]);
  const [candidates, setCandidates] = useState<DiscoveredCandidate[]>([]);

  const carouselRef = useRef<HTMLDivElement>(null);

  // --- Fetch Content Scout data ---
  const fetchScoutData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/content-scout');
      if (!res.ok) throw new Error('Failed to fetch content scout data');
      const data = await res.json();

      if (data.needsScrape) {
        setNeedsSetup(true);
      } else {
        setNeedsSetup(false);
        setVideos(data.videos || []);
        setUniqueIdeas(data.uniqueIdeas || []);
      }
    } catch (err) {
      console.error('Content Scout fetch failed:', err);
      setNeedsSetup(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Fetch sources ---
  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api/content-scout/sources');
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchScoutData();
    fetchSources();
  }, [fetchScoutData, fetchSources]);

  // --- Setup flow (Step 1: discover candidates) ---
  const handleSetup = async () => {
    try {
      setSetupStep('discovering');
      const discoverRes = await fetch('/api/content-scout/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!discoverRes.ok) throw new Error('Discovery failed');
      const data = await discoverRes.json();

      if (data.candidates && data.candidates.length > 0) {
        setCandidates(data.candidates);
        setSetupStep('selecting');
      } else {
        // No candidates found — skip to scrape with existing sources
        setSetupStep('scraping');
        await runScrape();
      }
    } catch (err) {
      console.error('Content Scout setup failed:', err);
      setSetupStep('idle');
    }
  };

  // --- Setup flow (Step 2: confirm selected channels, then scrape) ---
  const handleConfirmChannels = async (selected: DiscoveredCandidate[]) => {
    try {
      setSetupStep('scraping');

      // Save selected channels
      await fetch('/api/content-scout/discover', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: selected }),
      });

      // Scrape videos
      await runScrape();
    } catch (err) {
      console.error('Failed to confirm channels:', err);
      setSetupStep('idle');
    }
  };

  const runScrape = async () => {
    const scrapeRes = await fetch('/api/content-scout/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!scrapeRes.ok) throw new Error('Scraping failed');
    setSetupStep('done');
    await fetchScoutData();
    await fetchSources();
  };

  // --- Regenerate / refresh ---
  const handleRegenerate = async () => {
    setSetupStep('scraping');
    try {
      const res = await fetch('/api/content-scout/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Scraping failed');
      await fetchScoutData();
    } catch (err) {
      console.error('Regenerate failed:', err);
    } finally {
      setSetupStep('idle');
    }
  };

  // --- Save unique idea to parking lot ---
  const handleSaveUniqueIdea = async (idea: ScoutIdea) => {
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: idea.title,
          description: idea.description || '',
          source: 'content-scout',
          status: 'saved',
          contentPillar: idea.category || '',
        }),
      });
      if (!res.ok) throw new Error('Failed to save idea');
    } catch (err) {
      console.error('Failed to save unique idea:', err);
    }
  };

  // --- Dev reset ---
  const handleReset = useCallback(() => {
    setVideos([]);
    setUniqueIdeas([]);
    setSources([]);
    setNeedsSetup(true);
    setSetupStep('idle');
  }, []);

  // --- Carousel scroll ---
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = 260;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  // --- Setup state ---
  if (needsSetup && setupStep === 'idle') {
    return (
      <div className="my-8 flex items-center justify-center">
        <div className="w-full rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] px-8 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-bg-secondary)]">
            <svg className="h-7 w-7 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Content Scout needs to discover channels in your niche first.
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
            We&apos;ll find trending creators and videos relevant to your content — this only takes a minute.
          </p>
          <button
            type="button"
            onClick={handleSetup}
            className="mt-6 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-6 py-2.5 text-sm font-medium text-[var(--color-bg-dark)] outline-none ring-0 transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Set up Content Scout
          </button>
        </div>
      </div>
    );
  }

  // --- Channel selection screen ---
  if (setupStep === 'selecting' && candidates.length > 0) {
    return (
      <ChannelSelectionScreen
        candidates={candidates}
        onConfirm={handleConfirmChannels}
        onCancel={() => { setSetupStep('idle'); setCandidates([]); }}
      />
    );
  }

  // --- Setup in progress ---
  if (setupStep === 'discovering' || setupStep === 'scraping') {
    return (
      <div className="my-8 flex items-center justify-center">
        <div className="flex w-full flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] px-8 py-16">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-3 border-[var(--color-accent)] border-t-transparent" />
          <p className="animate-pulse text-sm font-medium text-[var(--color-accent)]">
            {setupStep === 'discovering'
              ? 'Discovering top channels in your niche...'
              : 'Scraping latest videos...'}
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            This may take a moment
          </p>
        </div>
      </div>
    );
  }

  // --- Main content ---
  return (
    <div>
      {/* ============================================================ */}
      {/* TOP SECTION: Top Videos In My Niche                          */}
      {/* ============================================================ */}
      <div className="mb-8">
        <div className="mb-4">
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">
            Top Videos In My Niche
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Trending content from creators in your space this week
          </p>
        </div>

        {videos.length > 0 ? (
          <div className="relative">
            {/* Left arrow */}
            <CarouselArrow direction="left" onClick={() => scrollCarousel('left')} />

            {/* Scrollable track */}
            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto px-1 py-2 scrollbar-hide"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {videos.map((video) => (
                <VideoCard
                  key={video.videoId}
                  video={video}
                  onClick={setSelectedVideo}
                />
              ))}
            </div>

            {/* Right arrow */}
            <CarouselArrow direction="right" onClick={() => scrollCarousel('right')} />
          </div>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              No trending videos found yet. Try regenerating.
            </p>
          </div>
        )}

        {/* Edit Sources toggle */}
        <EditSourcesPanel sources={sources} onSourcesChanged={fetchSources} onReset={handleReset} />
      </div>

      {/* ============================================================ */}
      {/* BOTTOM SECTION: Unique Ideas this week                       */}
      {/* ============================================================ */}
      <div>
        <div className="mb-4">
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">
            Unique Ideas this week
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Original angles Content Scout generated based on what&apos;s trending
          </p>
        </div>

        {uniqueIdeas.length > 0 ? (
          <div className="space-y-2">
            {uniqueIdeas.map((idea, idx) => (
              <UniqueIdeaRow
                key={idea._id || idx}
                idea={idea}
                onSave={handleSaveUniqueIdea}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              No unique ideas yet. Content Scout will generate them once videos are scraped.
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* Video Detail Modal                                            */}
      {/* ============================================================ */}
      {selectedVideo && (
        <VideoDetailModal
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
          userId={userId}
        />
      )}
    </div>
  );
}
