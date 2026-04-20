'use client';

import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '@/components/PageWrapper';
import BrandBrainOverview from '@/components/brand-brain/BrandBrainOverview';
import ToneOfVoiceEditor from '@/components/brand-brain/ToneOfVoiceEditor';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types (matching the API / model shapes)
// ---------------------------------------------------------------------------

interface ContentPillar {
  title: string;
  description: string;
  keywords: string[];
}

interface IndustryData {
  field: string;
  keywords: string[];
  competitors: string[];
}

interface EquipmentProfile {
  camera: string;
  location: string;
  constraints: string;
}

interface ToneParameter {
  key: string;
  value: string;
  category:
    | 'vocabulary'
    | 'sentence_structure'
    | 'emotional_tone'
    | 'rhetorical_patterns'
    | 'phrases_to_avoid'
    | 'personality_markers';
}

interface ToneOfVoiceGuide {
  _id: string;
  parameters: ToneParameter[];
  status: 'draft' | 'review' | 'active';
  version: number;
}

interface BrandBrainData {
  _id: string;
  version: number;
  updatedAt: string;
  contentPillars: ContentPillar[];
  industryData: IndustryData;
  equipmentProfile: EquipmentProfile;
  toneOfVoiceGuide?: ToneOfVoiceGuide;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BrandBrainPage() {
  const [brandBrain, setBrandBrain] = useState<BrandBrainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showToneEditor, setShowToneEditor] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isRegeneratingPillars, setIsRegeneratingPillars] = useState(false);

  // --- Fetch session ---
  useEffect(() => {
    async function getSession() {
      try {
        const res = await fetch('/api/auth/session');
        const session = await res.json();
        if (session?.user?.name) {
          setUserName(session.user.name);
        }
      } catch {
        // Session fetch failed — name stays undefined
      }
    }
    getSession();
  }, []);

  // --- Fetch Brand Brain ---
  const fetchBrandBrain = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNotFound(false);

      const res = await fetch('/api/brand-brain');

      if (res.status === 404) {
        setNotFound(true);
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load Brand Brain data');
      }

      const data: BrandBrainData = await res.json();
      setBrandBrain(data);
    } catch (err) {
      console.error('Error fetching Brand Brain:', err);
      setError('Could not load your Brand Brain. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrandBrain();
  }, [fetchBrandBrain]);

  // --- Save helpers (optimistic) ---
  const saveBrandBrainField = useCallback(
    (field: string, value: unknown) => {
      if (!brandBrain) return;
      const previous = { ...brandBrain };
      // Optimistically update local state
      setBrandBrain((prev) => (prev ? { ...prev, [field]: value } : prev));
      setIsSaving(true);

      fetch(`/api/brand-brain/${brandBrain._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to save');
          return res.json();
        })
        .then((updated: BrandBrainData) => {
          setBrandBrain(updated);
        })
        .catch((err) => {
          console.error(`Error saving ${field}:`, err);
          // Revert to previous state
          setBrandBrain(previous);
          setError('Failed to save changes. Please try again.');
        })
        .finally(() => {
          setIsSaving(false);
        });
    },
    [brandBrain]
  );

  const handleSavePillars = useCallback(
    (pillars: ContentPillar[]) => saveBrandBrainField('contentPillars', pillars),
    [saveBrandBrainField]
  );

  const handleSaveIndustryData = useCallback(
    (data: IndustryData) => saveBrandBrainField('industryData', data),
    [saveBrandBrainField]
  );

  const handleSaveEquipmentProfile = useCallback(
    (profile: EquipmentProfile) => saveBrandBrainField('equipmentProfile', profile),
    [saveBrandBrainField]
  );

  // --- Build Tone of Voice summary for the overview component ---
  const toneOfVoiceSummary = brandBrain?.toneOfVoiceGuide
    ? {
        status: brandBrain.toneOfVoiceGuide.status,
        parameterCount: brandBrain.toneOfVoiceGuide.parameters?.length ?? 0,
        summary: buildToneSummary(brandBrain.toneOfVoiceGuide.parameters ?? []),
      }
    : undefined;

  // --- Tone of Voice Editor save handler (optimistic) ---
  const handleToneSave = useCallback(
    (params: ToneParameter[], _summary: string) => {
      if (!brandBrain) return;
      const previous = brandBrain;
      setIsSaving(true);

      if (brandBrain.toneOfVoiceGuide?._id) {
        // Update existing guide
        setBrandBrain((prev) => {
          if (!prev?.toneOfVoiceGuide) return prev;
          return {
            ...prev,
            toneOfVoiceGuide: {
              ...prev.toneOfVoiceGuide,
              parameters: params,
            },
          };
        });

        fetch(
          `/api/tone-of-voice/${brandBrain.toneOfVoiceGuide._id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parameters: params }),
          }
        )
          .then((res) => {
            if (!res.ok) return res.json().then((err: { error?: string }) => { throw new Error(err.error || 'Failed to save tone of voice'); });
            return fetchBrandBrain();
          })
          .catch((err) => {
            console.error('Error saving tone of voice:', err);
            setBrandBrain(previous);
            setError('Failed to save tone of voice changes. Please try again.');
          })
          .finally(() => {
            setIsSaving(false);
          });
      } else {
        // Create new guide
        fetch('/api/tone-of-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parameters: params, brandBrainId: brandBrain._id }),
        })
          .then((res) => {
            if (!res.ok) return res.json().then((err: { error?: string }) => { throw new Error(err.error || 'Failed to create tone of voice'); });
            return fetchBrandBrain();
          })
          .catch((err) => {
            console.error('Error creating tone of voice:', err);
            setBrandBrain(previous);
            setError('Failed to create tone of voice guide. Please try again.');
          })
          .finally(() => {
            setIsSaving(false);
          });
      }
    },
    [brandBrain, fetchBrandBrain]
  );

  // --- Tone of Voice status change handler (optimistic) ---
  const handleToneStatusChange = useCallback(
    (newStatus: 'draft' | 'review' | 'active') => {
      if (!brandBrain?.toneOfVoiceGuide?._id) return;
      const previous = brandBrain;
      // Optimistically update status in local state
      setBrandBrain((prev) => {
        if (!prev?.toneOfVoiceGuide) return prev;
        return {
          ...prev,
          toneOfVoiceGuide: {
            ...prev.toneOfVoiceGuide,
            status: newStatus,
          },
        };
      });
      setIsSaving(true);

      fetch(
        `/api/tone-of-voice/${brandBrain.toneOfVoiceGuide._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      )
        .then((res) => {
          if (!res.ok) return res.json().then((err: { error?: string }) => { throw new Error(err.error || 'Failed to update status'); });
          return fetchBrandBrain();
        })
        .catch((err) => {
          console.error('Error updating tone status:', err);
          // Revert to previous state
          setBrandBrain(previous);
          setError('Failed to update status. Please try again.');
        })
        .finally(() => {
          setIsSaving(false);
        });
    },
    [brandBrain, fetchBrandBrain]
  );

  // --- Tone of Voice regenerate handler ---
  const handleToneRegenerate = useCallback(async () => {
    if (!brandBrain?._id) return;
    setIsRegenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/tone-of-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandBrainId: brandBrain._id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to regenerate tone of voice');
      }
      // Refetch brand brain to get the newly generated guide
      await fetchBrandBrain();
    } catch (err) {
      console.error('Error regenerating tone of voice:', err);
      setError('Failed to regenerate tone of voice. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  }, [brandBrain, fetchBrandBrain]);

  // --- Content Pillars regenerate handler ---
  const handleRegeneratePillars = useCallback(async () => {
    setIsRegeneratingPillars(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/content-pillars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate content pillars');
      }
      await fetchBrandBrain();
    } catch (err) {
      console.error('Error generating content pillars:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate content pillars. Please try again.');
    } finally {
      setIsRegeneratingPillars(false);
    }
  }, [fetchBrandBrain]);

  // --- Format date for display ---
  const formattedDate = brandBrain?.updatedAt
    ? new Date(brandBrain.updatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <PageWrapper
      title="Brand Brain"
      subtitle="Your AI context layer. Everything that makes your content uniquely yours."
    >
      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)]"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-center">
          <p className="text-sm text-[var(--color-text)]">{error}</p>
          <button
            onClick={fetchBrandBrain}
            className="mt-3 text-sm font-medium text-[var(--color-accent)] hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state — no Brand Brain yet */}
      {notFound && !loading && (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-secondary)]">
            <svg
              className="h-6 w-6 text-[var(--color-text-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
              />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            No Brand Brain yet
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-text-muted)]">
            Complete your onboarding to build your Brand Brain. It pulls together
            your content pillars, industry data, equipment profile, and tone of
            voice into one AI context layer.
          </p>
          <Link
            href="/onboarding"
            className="mt-5 inline-block rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:opacity-90"
          >
            Start Onboarding
          </Link>
        </div>
      )}

      {/* Loaded state — show overview (and optionally tone editor) */}
      {brandBrain && !loading && !error && (
        <>
          {/* Saving indicator */}
          {isSaving && (
            <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
              Saving changes...
            </div>
          )}

          {showToneEditor ? (
            <>
              {/* Back button */}
              <button
                onClick={() => setShowToneEditor(false)}
                className="mb-6 flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5 8.25 12l7.5-7.5"
                  />
                </svg>
                Back to Brand Brain
              </button>

              <ToneOfVoiceEditor
                initialParameters={brandBrain.toneOfVoiceGuide?.parameters ?? []}
                initialSummary={brandBrain.toneOfVoiceGuide ? buildToneSummary(brandBrain.toneOfVoiceGuide.parameters) : ''}
                status={brandBrain.toneOfVoiceGuide?.status ?? 'draft'}
                onSave={handleToneSave}
                onRegenerate={handleToneRegenerate}
                onStatusChange={handleToneStatusChange}
                isRegenerating={isRegenerating}
              />
            </>
          ) : (
            <BrandBrainOverview
              studentName={userName}
              version={brandBrain.version}
              lastUpdated={formattedDate}
              toneOfVoice={toneOfVoiceSummary}
              contentPillars={brandBrain.contentPillars}
              industryData={
                brandBrain.industryData ?? {
                  field: '',
                  keywords: [],
                  competitors: [],
                }
              }
              equipmentProfile={
                brandBrain.equipmentProfile ?? {
                  camera: '',
                  location: '',
                  constraints: '',
                }
              }
              onEditToneOfVoice={() => setShowToneEditor(true)}
              onSavePillars={handleSavePillars}
              onSaveIndustryData={handleSaveIndustryData}
              onSaveEquipmentProfile={handleSaveEquipmentProfile}
              onRegeneratePillars={handleRegeneratePillars}
              isRegeneratingPillars={isRegeneratingPillars}
            />
          )}
        </>
      )}
    </PageWrapper>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a human-readable summary string from the tone of voice parameters.
 * Groups by category and picks the first value from each to give a quick
 * overview of the creator's voice.
 */
function buildToneSummary(parameters: ToneParameter[]): string {
  if (!parameters || parameters.length === 0) {
    return 'Tone of voice guide is being set up.';
  }

  // Grab one representative value per category to form a readable summary
  const seen = new Set<string>();
  const highlights: string[] = [];

  for (const param of parameters) {
    if (!seen.has(param.category) && highlights.length < 4) {
      seen.add(param.category);
      highlights.push(`${formatCategory(param.category)}: ${param.value}`);
    }
  }

  return highlights.join(' · ');
}

function formatCategory(category: string): string {
  return category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
