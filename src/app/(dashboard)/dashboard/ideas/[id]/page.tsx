'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import type { IConceptAnswers, IResource } from '@/models/ContentIdea';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IdeaData {
  _id: string;
  title: string;
  description: string;
  status: string;
  source: string;
  contentPillar: string;
  conceptAnswers?: IConceptAnswers;
  callToAction: string;
  alternativeTitles: string[];
  resources: IResource[];
  outline: string;
  createdAt: string;
  updatedAt: string;
}

type Step = 'concept' | 'resources' | 'outline';

const STEPS: { key: Step; label: string; number: number }[] = [
  { key: 'concept', label: 'Concept', number: 1 },
  { key: 'resources', label: 'Resources', number: 2 },
  { key: 'outline', label: 'Outline', number: 3 },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function IdeaParkingLotPage() {
  const params = useParams();
  const router = useRouter();
  const ideaId = params.id as string;

  const [idea, setIdea] = useState<IdeaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<Step>('concept');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Concept state
  const [title, setTitle] = useState('');
  const [conceptAnswers, setConceptAnswers] = useState<IConceptAnswers>({
    whoIsThisFor: '',
    whatWillTheyLearn: '',
    whyShouldTheyCare: '',
  });
  const [callToAction, setCallToAction] = useState('');
  const [alternativeTitles, setAlternativeTitles] = useState<string[]>([]);
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);

  // Resources state
  const [resources, setResources] = useState<IResource[]>([]);
  const [showAddResource, setShowAddResource] = useState(false);
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceContent, setNewResourceContent] = useState('');
  const [expandedResource, setExpandedResource] = useState<string | null>(null);

  // Outline state
  const [outline, setOutline] = useState('');
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // --- Fetch idea on mount ---
  const fetchIdea = useCallback(async () => {
    try {
      const res = await fetch(`/api/ideas/${ideaId}`);
      if (!res.ok) {
        router.push('/dashboard/ideas');
        return;
      }
      const data: IdeaData = await res.json();
      setIdea(data);
      setTitle(data.title);
      setConceptAnswers(data.conceptAnswers || {
        whoIsThisFor: '',
        whatWillTheyLearn: '',
        whyShouldTheyCare: '',
      });
      setCallToAction(data.callToAction || '');
      setAlternativeTitles(data.alternativeTitles || []);
      setResources(data.resources || []);
      setOutline(data.outline || '');
    } catch {
      router.push('/dashboard/ideas');
    } finally {
      setIsLoading(false);
    }
  }, [ideaId, router]);

  useEffect(() => {
    fetchIdea();
  }, [fetchIdea]);

  // --- Save helpers ---
  const showSaved = () => {
    setSaveMessage('Changes saved');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const saveIdea = async (updates: Partial<IdeaData>) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setIdea(updated);
        showSaved();
      }
    } catch (err) {
      console.error('Failed to save idea:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Concept actions ---
  const handleSaveConcept = () => {
    saveIdea({ title, conceptAnswers, callToAction, alternativeTitles });
  };

  const handleGenerateConcept = async () => {
    setIsGeneratingConcept(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'concept' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conceptAnswers) {
          setConceptAnswers(data.conceptAnswers);
        }
      }
    } catch (err) {
      console.error('Failed to generate concept:', err);
    } finally {
      setIsGeneratingConcept(false);
    }
  };

  const handleGenerateTitles = async () => {
    setIsGeneratingTitles(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'alternativeTitles' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.alternativeTitles) {
          setAlternativeTitles(data.alternativeTitles);
        }
      }
    } catch (err) {
      console.error('Failed to generate titles:', err);
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  const handleSwapTitle = (altTitle: string) => {
    const oldTitle = title;
    setTitle(altTitle);
    setAlternativeTitles((prev) =>
      prev.map((t) => (t === altTitle ? oldTitle : t))
    );
  };

  // --- Resource actions ---
  const handleAddTextResource = () => {
    if (!newResourceName.trim() || !newResourceContent.trim()) return;
    const newResource: IResource = {
      type: 'text',
      name: newResourceName.trim(),
      content: newResourceContent.trim(),
      createdAt: new Date(),
    };
    const updated = [...resources, newResource];
    setResources(updated);
    setNewResourceName('');
    setNewResourceContent('');
    setShowAddResource(false);
    saveIdea({ resources: updated } as Partial<IdeaData>);
  };

  const handleRemoveResource = (index: number) => {
    const updated = resources.filter((_, i) => i !== index);
    setResources(updated);
    saveIdea({ resources: updated } as Partial<IdeaData>);
  };

  // --- Outline actions ---
  const handleGenerateOutline = async () => {
    setIsGeneratingOutline(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'outline' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.outline) {
          setOutline(data.outline);
        }
      }
    } catch (err) {
      console.error('Failed to generate outline:', err);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleSaveOutline = () => {
    saveIdea({ outline });
  };

  const handleGenerateScript = async () => {
    setIsGeneratingScript(true);
    try {
      // Save outline first
      await saveIdea({ outline });

      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId }),
      });
      if (res.ok) {
        // Update idea status to scripted
        await fetch(`/api/ideas/${ideaId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'scripted' }),
        });
        router.push('/dashboard/scripts');
      }
    } catch (err) {
      console.error('Failed to generate script:', err);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <PageWrapper title="Idea" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        </div>
      </PageWrapper>
    );
  }

  if (!idea) return null;

  return (
    <PageWrapper>
      {/* Back button + title */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push('/dashboard/ideas')}
          className="mb-4 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to Ideas
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Idea Parking Lot
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Complete each step before generating your script.
            </p>
          </div>
          {saveMessage && (
            <span className="rounded-[var(--radius-md)] bg-green-900 px-3 py-1.5 text-xs font-medium text-green-200">
              {saveMessage}
            </span>
          )}
        </div>
      </div>

      {/* Step tabs */}
      <div className="mb-8 flex gap-1 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-1">
        {STEPS.map((step) => (
          <button
            key={step.key}
            type="button"
            onClick={() => setActiveStep(step.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-medium transition-colors ${
              activeStep === step.key
                ? 'bg-[var(--color-accent)] text-[var(--color-bg-dark)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
              activeStep === step.key
                ? 'bg-[var(--color-bg-dark)] text-[var(--color-accent)]'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
            }`}>
              {step.number}
            </span>
            {step.label}
          </button>
        ))}
      </div>

      {/* Step content */}
      {activeStep === 'concept' && (
        <ConceptStep
          title={title}
          setTitle={setTitle}
          conceptAnswers={conceptAnswers}
          setConceptAnswers={setConceptAnswers}
          callToAction={callToAction}
          setCallToAction={setCallToAction}
          alternativeTitles={alternativeTitles}
          onSwapTitle={handleSwapTitle}
          isGeneratingConcept={isGeneratingConcept}
          isGeneratingTitles={isGeneratingTitles}
          onGenerateConcept={handleGenerateConcept}
          onGenerateTitles={handleGenerateTitles}
          onSave={handleSaveConcept}
          isSaving={isSaving}
        />
      )}

      {activeStep === 'resources' && (
        <ResourcesStep
          resources={resources}
          expandedResource={expandedResource}
          setExpandedResource={setExpandedResource}
          showAddResource={showAddResource}
          setShowAddResource={setShowAddResource}
          newResourceName={newResourceName}
          setNewResourceName={setNewResourceName}
          newResourceContent={newResourceContent}
          setNewResourceContent={setNewResourceContent}
          onAddTextResource={handleAddTextResource}
          onRemoveResource={handleRemoveResource}
        />
      )}

      {activeStep === 'outline' && (
        <OutlineStep
          outline={outline}
          setOutline={setOutline}
          isGeneratingOutline={isGeneratingOutline}
          isGeneratingScript={isGeneratingScript}
          onGenerateOutline={handleGenerateOutline}
          onSave={handleSaveOutline}
          onGenerateScript={handleGenerateScript}
          isSaving={isSaving}
        />
      )}
    </PageWrapper>
  );
}

// ---------------------------------------------------------------------------
// Step 1: Concept
// ---------------------------------------------------------------------------

interface ConceptStepProps {
  title: string;
  setTitle: (v: string) => void;
  conceptAnswers: IConceptAnswers;
  setConceptAnswers: (v: IConceptAnswers) => void;
  callToAction: string;
  setCallToAction: (v: string) => void;
  alternativeTitles: string[];
  onSwapTitle: (title: string) => void;
  isGeneratingConcept: boolean;
  isGeneratingTitles: boolean;
  onGenerateConcept: () => void;
  onGenerateTitles: () => void;
  onSave: () => void;
  isSaving: boolean;
}

function ConceptStep({
  title,
  setTitle,
  conceptAnswers,
  setConceptAnswers,
  callToAction,
  setCallToAction,
  alternativeTitles,
  onSwapTitle,
  isGeneratingConcept,
  isGeneratingTitles,
  onGenerateConcept,
  onGenerateTitles,
  onSave,
  isSaving,
}: ConceptStepProps) {
  const conceptQuestions = [
    {
      key: 'whoIsThisFor' as const,
      label: 'Who is this for?',
      placeholder: 'e.g. Entrepreneurs with ADHD who struggle to post consistently...',
    },
    {
      key: 'whatWillTheyLearn' as const,
      label: 'What will they learn?',
      placeholder: 'e.g. A 3-step system to batch content in under 2 hours...',
    },
    {
      key: 'whyShouldTheyCare' as const,
      label: 'Why should they care?',
      placeholder: 'e.g. Most creators quit in 90 days because they overthink content...',
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left column: Title + Questions + CTA */}
      <div className="lg:col-span-2 space-y-5">
        {/* Title */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Video Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-base font-medium text-[var(--color-text-primary)] outline-none ring-0 transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
            placeholder="Enter your video title..."
          />
        </div>

        {/* Concept questions */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Concept Questions
            </label>
            <button
              type="button"
              onClick={onGenerateConcept}
              disabled={isGeneratingConcept}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-tertiary)] disabled:text-[var(--color-text-muted)]"
            >
              {isGeneratingConcept ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                  </svg>
                  Auto-fill with AI
                </>
              )}
            </button>
          </div>
          <div className="space-y-4">
            {conceptQuestions.map((q) => (
              <div key={q.key}>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  {q.label}
                </label>
                <textarea
                  value={conceptAnswers[q.key]}
                  onChange={(e) =>
                    setConceptAnswers({ ...conceptAnswers, [q.key]: e.target.value })
                  }
                  rows={3}
                  placeholder={q.placeholder}
                  className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Call to action */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Call to Action
          </label>
          <input
            type="text"
            value={callToAction}
            onChange={(e) => setCallToAction(e.target.value)}
            placeholder="e.g. Sign up for my free webinar this month..."
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
          />
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            This CTA will be included at the end of the generated script for this video.
          </p>
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:bg-[#555] disabled:text-[#999]"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Right column: Alternative titles */}
      <div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Alternative Titles
            </label>
            <button
              type="button"
              onClick={onGenerateTitles}
              disabled={isGeneratingTitles}
              className="flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-tertiary)] disabled:text-[var(--color-text-muted)]"
            >
              {isGeneratingTitles ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                  ...
                </>
              ) : (
                <>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M15.015 4.371V9.35" />
                  </svg>
                  Generate
                </>
              )}
            </button>
          </div>

          {alternativeTitles.length > 0 ? (
            <div className="space-y-2">
              {alternativeTitles.map((altTitle, i) => (
                <div
                  key={i}
                  className="group flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3"
                >
                  <p className="flex-1 text-sm text-[var(--color-text-primary)]">
                    {altTitle}
                  </p>
                  <button
                    type="button"
                    onClick={() => onSwapTitle(altTitle)}
                    title="Use this title"
                    className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-xs font-medium text-[var(--color-accent)] opacity-0 transition-all hover:bg-[var(--color-accent)] hover:text-[var(--color-bg-dark)] group-hover:opacity-100"
                  >
                    Swap
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-[var(--color-text-muted)] py-6">
              Click &quot;Generate&quot; to get alternative title suggestions.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Resources
// ---------------------------------------------------------------------------

interface ResourcesStepProps {
  resources: IResource[];
  expandedResource: string | null;
  setExpandedResource: (v: string | null) => void;
  showAddResource: boolean;
  setShowAddResource: (v: boolean) => void;
  newResourceName: string;
  setNewResourceName: (v: string) => void;
  newResourceContent: string;
  setNewResourceContent: (v: string) => void;
  onAddTextResource: () => void;
  onRemoveResource: (index: number) => void;
}

function ResourcesStep({
  resources,
  expandedResource,
  setExpandedResource,
  showAddResource,
  setShowAddResource,
  newResourceName,
  setNewResourceName,
  newResourceContent,
  setNewResourceContent,
  onAddTextResource,
  onRemoveResource,
}: ResourcesStepProps) {
  return (
    <div className="space-y-5">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Resources
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Add notes, transcripts, research, or files to inform your script.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddResource(!showAddResource)}
          className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          + Add Resource
        </button>
      </div>

      {/* Add resource form */}
      {showAddResource && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <h4 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
            New Text Resource
          </h4>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                Name
              </label>
              <input
                type="text"
                value={newResourceName}
                onChange={(e) => setNewResourceName(e.target.value)}
                placeholder="e.g. Research notes, Interview transcript..."
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                Content
              </label>
              <textarea
                value={newResourceContent}
                onChange={(e) => setNewResourceContent(e.target.value)}
                rows={6}
                placeholder="Paste or type your notes, ideas, research, transcripts..."
                className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={onAddTextResource}
              disabled={!newResourceName.trim() || !newResourceContent.trim()}
              className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:bg-[#555] disabled:text-[#999]"
            >
              Add Resource
            </button>
            <button
              type="button"
              onClick={() => setShowAddResource(false)}
              className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Resource list */}
      {resources.length > 0 ? (
        <div className="space-y-3">
          {resources.map((resource, index) => {
            const resourceKey = `${resource.name}-${index}`;
            const isExpanded = expandedResource === resourceKey;

            return (
              <div
                key={resourceKey}
                className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)]">
                      {resource.type === 'text' ? (
                        <svg className="h-4 w-4 text-[var(--color-text-primary)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-[var(--color-text-primary)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {resource.name}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {resource.type === 'text' ? 'Text note' : resource.fileType?.toUpperCase() || 'File'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedResource(isExpanded ? null : resourceKey)
                      }
                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
                    >
                      {isExpanded ? 'Collapse' : 'View Content'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveResource(index)}
                      className="rounded-[var(--radius-md)] border border-red-800 bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-900"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">
                      {resource.content}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-bg-secondary)]">
            <svg className="h-5 w-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            No resources yet. Add notes, research, or transcripts to give your script more depth.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Outline
// ---------------------------------------------------------------------------

interface OutlineStepProps {
  outline: string;
  setOutline: (v: string) => void;
  isGeneratingOutline: boolean;
  isGeneratingScript: boolean;
  onGenerateOutline: () => void;
  onSave: () => void;
  onGenerateScript: () => void;
  isSaving: boolean;
}

function OutlineStep({
  outline,
  setOutline,
  isGeneratingOutline,
  isGeneratingScript,
  onGenerateOutline,
  onSave,
  onGenerateScript,
  isSaving,
}: OutlineStepProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Simple markdown-to-HTML renderer for outlines
  const renderedOutline = useMemo(() => {
    if (!outline.trim()) return '';

    const lines = outline.split('\n');
    const htmlLines: string[] = [];
    let inList = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Close list if current line is not a list item
      if (inList && !trimmed.startsWith('- ') && !trimmed.startsWith('* ') && !trimmed.match(/^\d+\.\s/)) {
        htmlLines.push('</ul>');
        inList = false;
      }

      if (!trimmed) {
        htmlLines.push('<div class="h-3"></div>');
      } else if (trimmed.startsWith('## ')) {
        htmlLines.push(`<h2 class="text-lg font-semibold text-[var(--color-text-primary)] mt-5 mb-2">${trimmed.slice(3)}</h2>`);
      } else if (trimmed.startsWith('# ')) {
        htmlLines.push(`<h1 class="text-xl font-bold text-[var(--color-text-primary)] mt-5 mb-2">${trimmed.slice(2)}</h1>`);
      } else if (trimmed.startsWith('### ')) {
        htmlLines.push(`<h3 class="text-base font-semibold text-[var(--color-text-primary)] mt-4 mb-1.5">${trimmed.slice(4)}</h3>`);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList) {
          htmlLines.push('<ul class="space-y-1.5 ml-1">');
          inList = true;
        }
        const content = trimmed.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--color-text-primary)]">$1</strong>');
        htmlLines.push(`<li class="flex gap-2 text-sm text-[var(--color-text-secondary)]"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"></span><span>${content}</span></li>`);
      } else if (trimmed.match(/^\d+\.\s/)) {
        if (!inList) {
          htmlLines.push('<ul class="space-y-1.5 ml-1">');
          inList = true;
        }
        const content = trimmed.replace(/^\d+\.\s/, '').replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--color-text-primary)]">$1</strong>');
        htmlLines.push(`<li class="flex gap-2 text-sm text-[var(--color-text-secondary)]"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"></span><span>${content}</span></li>`);
      } else {
        const content = trimmed.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--color-text-primary)]">$1</strong>');
        htmlLines.push(`<p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">${content}</p>`);
      }
    }

    if (inList) {
      htmlLines.push('</ul>');
    }

    return htmlLines.join('\n');
  }, [outline]);

  return (
    <div className="space-y-5">
      {/* Outline card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Video Outline
          </label>
          <div className="flex items-center gap-2">
            {outline.trim() && (
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
              >
                {isEditing ? (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                    Preview
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                    </svg>
                    Edit
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {isEditing || !outline.trim() ? (
          <textarea
            value={outline}
            onChange={(e) => setOutline(e.target.value)}
            rows={16}
            placeholder="Your video outline will appear here. Click 'Auto-generate' to create one from your concept and resources, or write your own."
            className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 font-mono text-sm leading-relaxed text-[var(--color-text-primary)] outline-none ring-0 transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
          />
        ) : (
          <div
            className="min-h-[16rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-5 py-4"
            dangerouslySetInnerHTML={{ __html: renderedOutline }}
          />
        )}
      </div>

      {/* Action buttons — matching wireframe: Save Changes, Auto-generate, Generate Script */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="rounded-[var(--radius-md)] bg-[var(--color-bg-card)] border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:text-[var(--color-text-muted)]"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          type="button"
          onClick={onGenerateOutline}
          disabled={isGeneratingOutline}
          className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:text-[var(--color-text-muted)]"
        >
          {isGeneratingOutline ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
              </svg>
              Auto-generate
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onGenerateScript}
          disabled={isGeneratingScript || !outline.trim()}
          className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:bg-[#555] disabled:text-[#999]"
        >
          {isGeneratingScript ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating Script...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
              </svg>
              Generate Script
            </>
          )}
        </button>
      </div>

      {!outline.trim() && (
        <p className="text-xs text-[var(--color-text-muted)]">
          Complete your outline before generating a script. The more detail you provide, the better the script will be.
        </p>
      )}
    </div>
  );
}
