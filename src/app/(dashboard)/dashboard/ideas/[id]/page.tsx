'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import DraftSidebar from '@/components/focus-mode/draft/DraftSidebar';
import FindSourcesPanel from '@/components/focus-mode/draft/FindSourcesPanel';
import type { IConceptAnswers, INote, IComment, IResource, IOutlineSection } from '@/models/ContentIdea';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

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
  tags: string[];
  notes: INote[];
  comments: IComment[];
  resources: IResource[];
  outline: string;
  outlineSections?: IOutlineSection[];
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

const VALID_STEPS = new Set<Step>(['concept', 'resources', 'outline']);

export default function IdeaParkingLotPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ideaId = params.id as string;

  const tabParam = searchParams.get('tab') as Step | null;
  const initialTab = tabParam && VALID_STEPS.has(tabParam) ? tabParam : 'concept';

  const [idea, setIdea] = useState<IdeaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStep, setActiveStepRaw] = useState<Step>(initialTab);

  const setActiveStep = useCallback((step: Step) => {
    setActiveStepRaw(step);
    const url = new URL(window.location.href);
    if (step === 'concept') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', step);
    }
    window.history.replaceState({}, '', url.toString());
  }, []);
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
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState<INote[]>([]);
  const [comments, setComments] = useState<IComment[]>([]);
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);

  // Resources state
  const [resources, setResources] = useState<IResource[]>([]);
  const [resourceModal, setResourceModal] = useState<'picker' | 'text' | 'upload' | 'voicestorm' | 'braindump' | null>(null);
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceContent, setNewResourceContent] = useState('');
  const [expandedResource, setExpandedResource] = useState<string | null>(null);
  const [findSourcesOpen, setFindSourcesOpen] = useState(false);

  // Outline state
  const [outline, setOutline] = useState('');
  const [outlineSections, setOutlineSections] = useState<IOutlineSection[]>([]);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // Voice storm prompt state
  const [hasLinkedVoiceStorm, setHasLinkedVoiceStorm] = useState(false);
  const [voiceStormChecked, setVoiceStormChecked] = useState(false);
  const [showVoiceStormPrompt, setShowVoiceStormPrompt] = useState(false);
  const [voiceStormPromptSkipped, setVoiceStormPromptSkipped] = useState(false);

  // Error state
  const [errorMessage, setErrorMessage] = useState('');

  // Unsaved changes tracking
  const [hasChanges, setHasChanges] = useState(false);
  useUnsavedChanges(hasChanges);

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
      setTags(data.tags || []);
      setNotes(data.notes || []);
      setComments(data.comments || []);
      setResources(data.resources || []);
      setOutline(data.outline || '');
      setOutlineSections(data.outlineSections || []);
    } catch {
      router.push('/dashboard/ideas');
    } finally {
      setIsLoading(false);
    }
  }, [ideaId, router]);

  useEffect(() => {
    fetchIdea();
  }, [fetchIdea]);

  // Check if this idea already has a linked voice storm
  useEffect(() => {
    const checkVoiceStorm = async () => {
      try {
        const res = await fetch(`/api/voice-storming?linkedIdeaId=${ideaId}&limit=1`);
        if (res.ok) {
          const data = await res.json();
          const sessions = data.data || [];
          setHasLinkedVoiceStorm(sessions.length > 0);
        }
      } catch {
        // If check fails, don't block the flow
      } finally {
        setVoiceStormChecked(true);
      }
    };
    checkVoiceStorm();
  }, [ideaId]);

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 6000);
  };

  const markChanged = () => {
    if (!hasChanges) setHasChanges(true);
  };

  // --- Save helpers ---
  const showSaved = () => {
    setHasChanges(false);
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
      } else {
        showError('Failed to save changes. Please try again.');
      }
    } catch (err) {
      console.error('Failed to save idea:', err);
      showError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Concept actions ---
  const handleSaveConcept = () => {
    saveIdea({ title, conceptAnswers });
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
      } else {
        showError('Failed to generate concept. Please try again.');
      }
    } catch (err) {
      console.error('Failed to generate concept:', err);
      showError('Failed to generate concept. Please try again.');
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
      } else {
        showError('Failed to generate titles. Please try again.');
      }
    } catch (err) {
      console.error('Failed to generate titles:', err);
      showError('Failed to generate titles. Please try again.');
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
    setResourceModal(null);
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
        if (data.outlineSections && data.outlineSections.length > 0) {
          setOutlineSections(data.outlineSections);
          setOutline(data.outline || '');
          setIsGeneratingOutline(false);
          return;
        }
        if (data.outline) {
          setOutline(data.outline);
        }
        // Fallback: re-fetch idea to ensure state is fully synced
        await fetchIdea();
      } else {
        showError('Failed to generate outline. Please try again.');
      }
    } catch (err) {
      console.error('Failed to generate outline:', err);
      showError('Failed to generate outline. Please try again.');
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleSaveOutline = () => {
    saveIdea({ outlineSections, outline } as unknown as Partial<IdeaData>);
  };

  const handleGenerateScript = async () => {
    // If no linked voice storm and user hasn't skipped the prompt yet, show it
    if (voiceStormChecked && !hasLinkedVoiceStorm && !voiceStormPromptSkipped) {
      setShowVoiceStormPrompt(true);
      return;
    }

    setShowVoiceStormPrompt(false);
    setIsGeneratingScript(true);
    try {
      // Save outline first
      if (outlineSections.length > 0) {
        await saveIdea({ outlineSections } as unknown as Partial<IdeaData>);
      } else {
        await saveIdea({ outline });
      }

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
      } else {
        showError('Failed to generate script. Please try again.');
      }
    } catch (err) {
      console.error('Failed to generate script:', err);
      showError('Failed to generate script. Please try again.');
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
    <PageWrapper wide>
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push('/dashboard/ideas')}
        className="mb-4 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      {/* Idea title as page heading (editable) */}
      <input
        type="text"
        value={title}
        onChange={(e) => { setTitle(e.target.value); markChanged(); }}
        onBlur={() => { if (title !== idea.title) saveIdea({ title }); }}
        className="mb-1 w-full bg-transparent text-2xl font-bold text-[var(--color-text-primary)] outline-none ring-0"
      />

      {/* Status messages */}
      <div className="mb-6 flex items-center gap-2">
        {errorMessage && (
          <span className="rounded-[var(--radius-md)] bg-red-900 px-3 py-1.5 text-xs font-medium text-red-200">
            {errorMessage}
          </span>
        )}
        {saveMessage && (
          <span className="rounded-[var(--radius-md)] bg-green-900 px-3 py-1.5 text-xs font-medium text-green-200">
            {saveMessage}
          </span>
        )}
      </div>

      {/* Layout: main content + sidebar */}
      <div className="flex gap-6">
        {/* Main content area */}
        <div className="flex-1 min-w-0">
          {/* Full-width filled tabs */}
          <div className="mb-6 flex rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)]">
            {STEPS.map((step) => (
              <button
                key={step.key}
                type="button"
                onClick={() => setActiveStep(step.key)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeStep === step.key
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>

          {/* Step content */}
          {activeStep === 'concept' && (
            <ConceptStep
              conceptAnswers={conceptAnswers}
              setConceptAnswers={setConceptAnswers}
              isGeneratingConcept={isGeneratingConcept}
              onGenerateConcept={handleGenerateConcept}
              onSave={handleSaveConcept}
              isSaving={isSaving}
              onMarkChanged={markChanged}
            />
          )}

          {activeStep === 'resources' && (
            <ResourcesStep
              resources={resources}
              expandedResource={expandedResource}
              setExpandedResource={setExpandedResource}
              resourceModal={resourceModal}
              setResourceModal={setResourceModal}
              newResourceName={newResourceName}
              setNewResourceName={setNewResourceName}
              newResourceContent={newResourceContent}
              setNewResourceContent={setNewResourceContent}
              onAddTextResource={handleAddTextResource}
              onRemoveResource={handleRemoveResource}
              findSourcesOpen={findSourcesOpen}
              setFindSourcesOpen={setFindSourcesOpen}
              ideaTitle={title}
              conceptAnswers={conceptAnswers}
              ideaId={ideaId}
              onSourcesFound={(newResources) => {
                const updated = [...resources, ...newResources];
                setResources(updated);
                setFindSourcesOpen(false);
                saveIdea({ resources: updated } as Partial<IdeaData>);
              }}
              onAddResource={(resource) => {
                const updated = [...resources, resource];
                setResources(updated);
                saveIdea({ resources: updated } as Partial<IdeaData>);
              }}
            />
          )}

          {activeStep === 'outline' && (
            <OutlineStep
              outline={outline}
              setOutline={setOutline}
              outlineSections={outlineSections}
              setOutlineSections={setOutlineSections}
              isGeneratingOutline={isGeneratingOutline}
              isGeneratingScript={isGeneratingScript}
              onGenerateOutline={handleGenerateOutline}
              onSave={handleSaveOutline}
              onGenerateScript={handleGenerateScript}
              isSaving={isSaving}
              onMarkChanged={markChanged}
              conceptAnswers={conceptAnswers}
              showVoiceStormPrompt={showVoiceStormPrompt}
              onSkipVoiceStorm={() => {
                setVoiceStormPromptSkipped(true);
                setShowVoiceStormPrompt(false);
              }}
              onSkipAndGenerateScript={async () => {
                setVoiceStormPromptSkipped(true);
                setShowVoiceStormPrompt(false);
                setIsGeneratingScript(true);
                try {
                  if (outlineSections.length > 0) {
                    await saveIdea({ outlineSections } as unknown as Partial<IdeaData>);
                  } else {
                    await saveIdea({ outline });
                  }
                  const res = await fetch('/api/scripts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ideaId }),
                  });
                  if (res.ok) {
                    await fetch(`/api/ideas/${ideaId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'scripted' }),
                    });
                    router.push('/dashboard/scripts');
                  } else {
                    showError('Failed to generate script. Please try again.');
                  }
                } catch (err) {
                  console.error('Failed to generate script:', err);
                  showError('Failed to generate script. Please try again.');
                } finally {
                  setIsGeneratingScript(false);
                }
              }}
              ideaId={ideaId}
            />
          )}
        </div>

        {/* Right sidebar with accordion panels */}
        <div className="w-72 shrink-0">
          <DraftSidebar
            callToAction={callToAction}
            setCallToAction={setCallToAction}
            tags={tags}
            setTags={(newTags) => { setTags(newTags); saveIdea({ tags: newTags } as unknown as Partial<IdeaData>); }}
            alternativeTitles={alternativeTitles}
            notes={notes}
            setNotes={(newNotes) => { setNotes(newNotes); saveIdea({ notes: newNotes } as unknown as Partial<IdeaData>); }}
            comments={comments}
            onMarkChanged={markChanged}
            onSwapTitle={handleSwapTitle}
            onRegenerateTitles={handleGenerateTitles}
            onAddComment={async (text) => {
              try {
                const res = await fetch(`/api/ideas/${ideaId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ comments: [...comments, { text, createdAt: new Date() }] }),
                });
                if (res.ok) {
                  const updated = await res.json();
                  setComments(updated.comments || []);
                }
              } catch (err) {
                console.error('Failed to add comment:', err);
              }
            }}
          />
        </div>
      </div>
    </PageWrapper>
  );
}

// ---------------------------------------------------------------------------
// Step 1: Concept
// ---------------------------------------------------------------------------

interface ConceptStepProps {
  conceptAnswers: IConceptAnswers;
  setConceptAnswers: (v: IConceptAnswers) => void;
  isGeneratingConcept: boolean;
  onGenerateConcept: () => void;
  onSave: () => void;
  isSaving: boolean;
  onMarkChanged: () => void;
}

function ConceptStep({
  conceptAnswers,
  setConceptAnswers,
  isGeneratingConcept,
  onGenerateConcept,
  onSave,
  isSaving,
  onMarkChanged,
}: ConceptStepProps) {
  const conceptQuestions = [
    {
      key: 'whoIsThisFor' as const,
      label: 'Who is this video for?',
      placeholder: 'Explain the audience this video is targeted for.',
    },
    {
      key: 'whatWillTheyLearn' as const,
      label: 'What do they believe right now that\'s holding them back?',
      placeholder: 'The current assumption, misconception, or gap they have before watching this video.',
    },
    {
      key: 'whyShouldTheyCare' as const,
      label: 'What do they walk away with?',
      placeholder: 'The shift, takeaway, or new understanding they have after watching.',
    },
  ];

  return (
    <div>
      {/* Concept questions in a card with left accent border */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
        <div className="space-y-8">
          {conceptQuestions.map((q) => (
            <div key={q.key}>
              <label className="mb-1 block text-sm font-semibold text-[var(--color-text-primary)]">
                {q.label}
              </label>
              <p className="mb-2 text-xs text-[var(--color-text-muted)]">
                {q.placeholder}
              </p>
              <textarea
                value={conceptAnswers[q.key]}
                onChange={(e) => {
                  setConceptAnswers({ ...conceptAnswers, [q.key]: e.target.value });
                  onMarkChanged();
                }}
                rows={4}
                className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save + Auto-generate buttons */}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:text-[var(--color-text-muted)]"
        >
          {isSaving ? 'Saving...' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onGenerateConcept}
          disabled={isGeneratingConcept}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:text-[var(--color-text-muted)]"
        >
          {isGeneratingConcept ? 'Generating...' : 'Auto-generate'}
        </button>
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
  resourceModal: 'picker' | 'text' | 'upload' | 'voicestorm' | 'braindump' | null;
  setResourceModal: (v: 'picker' | 'text' | 'upload' | 'voicestorm' | 'braindump' | null) => void;
  newResourceName: string;
  setNewResourceName: (v: string) => void;
  newResourceContent: string;
  setNewResourceContent: (v: string) => void;
  onAddTextResource: () => void;
  onRemoveResource: (index: number) => void;
  findSourcesOpen: boolean;
  setFindSourcesOpen: (v: boolean) => void;
  ideaTitle: string;
  conceptAnswers: IConceptAnswers;
  ideaId: string;
  onSourcesFound: (resources: IResource[]) => void;
  onAddResource: (resource: IResource) => void;
}

function getResourceBadge(resource: IResource): { label: string; borderColor: string; bgColor: string; textColor: string } {
  const name = resource.name.toLowerCase();
  if (name.includes('voice storm') || name.includes('voicestorm')) {
    return { label: 'Voice Storm', borderColor: '#F59E0B', bgColor: '#78350F', textColor: '#FDE68A' };
  }
  if (resource.type === 'file') {
    return { label: resource.fileType?.toUpperCase() || 'File', borderColor: 'var(--color-accent)', bgColor: '#1E3A5F', textColor: '#93C5FD' };
  }
  return { label: 'Online Resource', borderColor: 'var(--color-accent)', bgColor: '#1E3A5F', textColor: '#93C5FD' };
}

function ResourcesStep({
  resources,
  expandedResource,
  setExpandedResource,
  resourceModal,
  setResourceModal,
  newResourceName,
  setNewResourceName,
  newResourceContent,
  setNewResourceContent,
  onAddTextResource,
  onRemoveResource,
  findSourcesOpen,
  setFindSourcesOpen,
  ideaTitle,
  conceptAnswers,
  ideaId,
  onSourcesFound,
  onAddResource,
}: ResourcesStepProps) {
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Voice storm recording state
  const [vsIsRecording, setVsIsRecording] = useState(false);
  const [vsRecordingTime, setVsRecordingTime] = useState(0);
  const [vsTranscribing, setVsTranscribing] = useState(false);
  const [vsTranscript, setVsTranscript] = useState('');
  const vsMediaRecorder = useRef<MediaRecorder | null>(null);
  const vsStream = useRef<MediaStream | null>(null);
  const vsTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const vsChunks = useRef<Blob[]>([]);

  const vsFormatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const vsStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      vsStream.current = stream;
      const recorder = new MediaRecorder(stream);
      vsChunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) vsChunks.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(vsChunks.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        if (blob.size > 0) {
          setVsTranscribing(true);
          try {
            const fd = new FormData();
            fd.append('audio', blob, 'recording.webm');
            const res = await fetch('/api/voice-storming/transcribe', { method: 'POST', body: fd });
            if (res.ok) {
              const data = await res.json();
              setVsTranscript((prev) => prev ? prev + '\n\n' + (data.text || '') : data.text || '');
            }
          } catch { /* ignore */ } finally { setVsTranscribing(false); }
        }
      };
      recorder.start();
      vsMediaRecorder.current = recorder;
      setVsIsRecording(true);
      setVsRecordingTime(0);
      vsTimer.current = setInterval(() => setVsRecordingTime((t) => t + 1), 1000);
    } catch {
      alert('Could not access microphone. Please allow microphone access.');
    }
  };

  const vsStopRecording = () => {
    vsMediaRecorder.current?.stop();
    setVsIsRecording(false);
    if (vsTimer.current) { clearInterval(vsTimer.current); vsTimer.current = null; }
  };

  // Brain dump selector state
  const [brainDumps, setBrainDumps] = useState<{ _id: string; transcript: string; createdAt: string; tags: string[] }[]>([]);
  const [brainDumpSearch, setBrainDumpSearch] = useState('');
  const [selectedDumps, setSelectedDumps] = useState<Set<string>>(new Set());
  const [loadingDumps, setLoadingDumps] = useState(false);

  useEffect(() => {
    if (resourceModal === 'braindump') {
      setLoadingDumps(true);
      fetch('/api/brain-dump?limit=50')
        .then((r) => r.json())
        .then((data) => setBrainDumps(data.data || []))
        .catch(() => {})
        .finally(() => setLoadingDumps(false));
    }
  }, [resourceModal]);

  const filteredDumps = brainDumps.filter((d) => {
    if (!brainDumpSearch.trim()) return true;
    const q = brainDumpSearch.toLowerCase();
    return d.transcript.toLowerCase().includes(q) || d.tags?.some((t) => t.toLowerCase().includes(q));
  });

  const toggleDump = (id: string) => {
    setSelectedDumps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addSelectedDumps = () => {
    const selected = brainDumps.filter((d) => selectedDumps.has(d._id));
    for (const dump of selected) {
      onAddResource({
        type: 'text',
        name: `Brain Dump ${new Date(dump.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        content: dump.transcript,
        createdAt: new Date(),
      });
    }
    setSelectedDumps(new Set());
    setResourceModal(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/ai-documents/upload-file', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setUploadError(errData.error || 'Upload failed. Please try again.');
        return;
      }
      const data = await res.json();
      const extractedText = data.text || data.content || '';
      const newResource: IResource = {
        type: 'text',
        name: file.name,
        content: extractedText,
        createdAt: new Date(),
      };
      onAddResource(newResource);
      setResourceModal(null);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              Resources
            </h3>
            <span className="text-xs text-[var(--color-text-muted)]">
              {resources.length} {resources.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Reference material, notes and sources for this idea.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFindSourcesOpen(true)}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
          >
            <svg className="h-4 w-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            Find online sources
          </button>
          <button
            type="button"
            onClick={() => setResourceModal('picker')}
            className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            + Add resource
          </button>
        </div>
      </div>

      {/* Resource picker modal (portaled to body to escape overflow clipping) */}
      {resourceModal !== null && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setResourceModal(null)}
            aria-hidden="true"
          />

          {/* Modal panel */}
          <div className="relative z-10 w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
              <div className="flex items-center gap-2">
                {resourceModal !== 'picker' && (
                  <button
                    type="button"
                    onClick={() => { setResourceModal('picker'); setVsTranscript(''); setVsRecordingTime(0); setSelectedDumps(new Set()); setBrainDumpSearch(''); setUploadError(''); }}
                    className="rounded-[var(--radius-md)] p-1 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                    </svg>
                  </button>
                )}
                <div>
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                    {resourceModal === 'picker' && 'Add resource'}
                    {resourceModal === 'text' && 'Write Text'}
                    {resourceModal === 'upload' && 'Upload File'}
                    {resourceModal === 'voicestorm' && 'Record Voice Storm'}
                    {resourceModal === 'braindump' && 'Select Brain Dumps'}
                  </h2>
                  {resourceModal === 'picker' && (
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Choose how you'd like to add a resource</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResourceModal(null)}
                className="rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {/* Picker grid */}
              {resourceModal === 'picker' && (
                <div className="grid grid-cols-2 gap-3">
                  {/* Voice Storm */}
                  <button
                    type="button"
                    onClick={() => setResourceModal('voicestorm')}
                    className="flex flex-col items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-left transition-colors hover:border-[var(--color-accent)] cursor-pointer"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)]">
                      <svg className="h-5 w-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">Voice Storm</p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Record your thoughts out loud</p>
                    </div>
                  </button>

                  {/* Write Text */}
                  <button
                    type="button"
                    onClick={() => setResourceModal('text')}
                    className="flex flex-col items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-left transition-colors hover:border-[var(--color-accent)] cursor-pointer"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)]">
                      <svg className="h-5 w-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">Write Text</p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Type a note or paste content</p>
                    </div>
                  </button>

                  {/* Upload File */}
                  <button
                    type="button"
                    onClick={() => setResourceModal('upload')}
                    className="flex flex-col items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-left transition-colors hover:border-[var(--color-accent)] cursor-pointer"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)]">
                      <svg className="h-5 w-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">Upload File</p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Attach a doc, image or PDF</p>
                    </div>
                  </button>

                  {/* Brain Dump */}
                  <button
                    type="button"
                    onClick={() => setResourceModal('braindump')}
                    className="flex flex-col items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-left transition-colors hover:border-[var(--color-accent)] cursor-pointer"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)]">
                      <svg className="h-5 w-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">Brain Dump</p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Pull from your saved dumps</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Text resource form */}
              {resourceModal === 'text' && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Name</label>
                    <input
                      type="text"
                      value={newResourceName}
                      onChange={(e) => setNewResourceName(e.target.value)}
                      placeholder="e.g. Research notes, Interview transcript..."
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Content</label>
                    <textarea
                      value={newResourceContent}
                      onChange={(e) => setNewResourceContent(e.target.value)}
                      rows={6}
                      placeholder="Paste or type your notes, ideas, research, transcripts..."
                      className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onAddTextResource}
                      disabled={!newResourceName.trim() || !newResourceContent.trim()}
                      className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:bg-[#555] disabled:text-[#999]"
                    >
                      Add Resource
                    </button>
                    <button
                      type="button"
                      onClick={() => setResourceModal(null)}
                      className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Upload file form */}
              {resourceModal === 'upload' && (
                <div className="space-y-4">
                  <label className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] px-6 py-10 cursor-pointer transition-colors hover:border-[var(--color-accent)]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-bg-secondary)]">
                      <svg className="h-5 w-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {isUploading ? 'Uploading...' : 'Click to choose a file'}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        PDF, TXT, DOCX, DOC, MD, JPG, PNG
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.txt,.docx,.doc,.md,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="sr-only"
                    />
                  </label>
                  {uploadError && (
                    <p className="rounded-[var(--radius-md)] bg-red-900 px-3 py-2 text-xs text-red-200">
                      {uploadError}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setResourceModal(null); setUploadError(''); }}
                      className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Voice storm recorder */}
              {resourceModal === 'voicestorm' && (
                <div className="space-y-4">
                  {/* Mic button */}
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={vsIsRecording ? vsStopRecording : vsStartRecording}
                      disabled={vsTranscribing && !vsIsRecording}
                      className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
                        vsIsRecording ? 'bg-red-500 animate-pulse' : 'bg-[var(--color-accent)] hover:opacity-90'
                      } disabled:opacity-50`}
                    >
                      {vsIsRecording ? (
                        <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                      ) : (
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Status text */}
                  <div className="text-center">
                    {vsIsRecording && (
                      <div className="flex items-center justify-center gap-2 text-sm text-red-400">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        Recording {vsFormatTime(vsRecordingTime)}
                      </div>
                    )}
                    {!vsIsRecording && vsRecordingTime === 0 && !vsTranscribing && !vsTranscript && (
                      <p className="text-xs text-[var(--color-text-muted)]">Tap to start recording</p>
                    )}
                    {!vsIsRecording && vsRecordingTime > 0 && !vsTranscribing && (
                      <p className="text-xs text-[var(--color-text-muted)]">Recorded {vsFormatTime(vsRecordingTime)}</p>
                    )}
                    {vsTranscribing && (
                      <div className="flex items-center justify-center gap-2 text-sm text-[var(--color-accent)]">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Transcribing...
                      </div>
                    )}
                  </div>

                  {/* Transcript preview */}
                  <textarea
                    readOnly
                    value={vsTranscript}
                    rows={4}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm text-[var(--color-text-primary)] resize-none outline-none ring-0 max-h-40 overflow-y-auto"
                  />

                  {/* Save / Redo / Cancel */}
                  <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-3">
                    {vsTranscript && !vsIsRecording && (
                      <button
                        type="button"
                        onClick={() => { setVsTranscript(''); setVsRecordingTime(0); }}
                        disabled={vsTranscribing}
                        className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
                      >
                        Re-record
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setResourceModal(null); setVsTranscript(''); setVsRecordingTime(0); }}
                      className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!vsTranscript.trim()) return;
                        onAddResource({
                          type: 'text',
                          name: `Voice Storm ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                          content: vsTranscript.trim(),
                          createdAt: new Date(),
                        });
                        setVsTranscript('');
                        setVsRecordingTime(0);
                        setResourceModal(null);
                      }}
                      disabled={!vsTranscript.trim() || vsTranscribing}
                      className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:bg-[#555] disabled:text-[#999]"
                    >
                      Save resource
                    </button>
                  </div>
                </div>
              )}

              {/* Brain dump selector */}
              {resourceModal === 'braindump' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={brainDumpSearch}
                    onChange={(e) => setBrainDumpSearch(e.target.value)}
                    placeholder="Search your brain dumps..."
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none ring-0 placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
                  />

                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {loadingDumps ? (
                      <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">Loading...</div>
                    ) : filteredDumps.length === 0 ? (
                      <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                        {brainDumps.length === 0 ? 'No brain dumps yet.' : 'No matches found.'}
                      </div>
                    ) : (
                      filteredDumps.map((dump) => {
                        const isSelected = selectedDumps.has(dump._id);
                        const dateStr = new Date(dump.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const preview = dump.transcript.slice(0, 120) + (dump.transcript.length > 120 ? '...' : '');
                        return (
                          <button
                            key={dump._id}
                            type="button"
                            onClick={() => toggleDump(dump._id)}
                            className={`w-full rounded-[var(--radius-lg)] border p-3 text-left transition-colors ${
                              isSelected
                                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                                : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${isSelected ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-[var(--color-border)]'}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                                  {dump.transcript.split('\n')[0]?.slice(0, 60) || 'Brain dump'}
                                </p>
                                <p className="text-xs text-[var(--color-accent)] mt-0.5">{dateStr}</p>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-2">{preview}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-3">
                    <button
                      type="button"
                      onClick={() => { setResourceModal('picker'); setSelectedDumps(new Set()); setBrainDumpSearch(''); }}
                      className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={addSelectedDumps}
                      disabled={selectedDumps.size === 0}
                      className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:bg-[#555] disabled:text-[#999]"
                    >
                      Add brain dumps ({selectedDumps.size})
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Resource list */}
      {resources.length > 0 ? (
        <div className="space-y-3">
          {resources.map((resource, index) => {
            const resourceKey = `${resource.name}-${index}`;
            const isExpanded = expandedResource === resourceKey;
            const badge = getResourceBadge(resource);
            const dateStr = resource.createdAt
              ? new Date(resource.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : '';

            return (
              <div
                key={resourceKey}
                className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)]"
                style={{ borderLeftWidth: '3px', borderLeftColor: badge.borderColor }}
              >
                {/* Main row */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: badge.bgColor, color: badge.textColor }}
                    >
                      {badge.label}
                    </span>
                    <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                      {resource.name}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {dateStr && (
                      <span className="text-xs text-[var(--color-text-muted)]">{dateStr}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveResource(index)}
                      className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-red-400"
                      title="Remove resource"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Action row */}
                <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2">
                  <button
                    type="button"
                    onClick={() => setExpandedResource(isExpanded ? null : resourceKey)}
                    className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                  >
                    <svg
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                    View content
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isExpanded) setExpandedResource(resourceKey);
                      else setExpandedResource(null);
                    }}
                    className="text-xs font-medium text-[var(--color-accent)] transition-colors hover:opacity-80"
                  >
                    Edit
                  </button>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">
                      {resource.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                        /^https?:\/\//.test(part) ? (
                          <a
                            key={i}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-accent)] underline hover:opacity-80 break-all"
                          >
                            {part}
                          </a>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
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

      {/* Find Sources Panel */}
      <FindSourcesPanel
        isOpen={findSourcesOpen}
        onClose={() => setFindSourcesOpen(false)}
        ideaId={ideaId}
        ideaTitle={ideaTitle}
        conceptAnswers={conceptAnswers}
        onSourcesFound={onSourcesFound}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Outline
// ---------------------------------------------------------------------------

const MIN_OUTLINE_WORDS = 50;

interface OutlineStepProps {
  outline: string;
  setOutline: (v: string) => void;
  outlineSections: IOutlineSection[];
  setOutlineSections: (v: IOutlineSection[]) => void;
  isGeneratingOutline: boolean;
  isGeneratingScript: boolean;
  onGenerateOutline: () => void;
  onSave: () => void;
  onGenerateScript: () => void;
  isSaving: boolean;
  onMarkChanged: () => void;
  conceptAnswers: IConceptAnswers;
  showVoiceStormPrompt: boolean;
  onSkipVoiceStorm: () => void;
  onSkipAndGenerateScript: () => void;
  ideaId: string;
}

function OutlineStep({
  outline,
  setOutline,
  outlineSections,
  setOutlineSections,
  isGeneratingOutline,
  isGeneratingScript,
  onGenerateOutline,
  onSave,
  onGenerateScript,
  isSaving,
  onMarkChanged,
  conceptAnswers,
  showVoiceStormPrompt,
  onSkipVoiceStorm,
  onSkipAndGenerateScript,
  ideaId,
}: OutlineStepProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [dragState, setDragState] = useState<{ sectionId: string; bulletIdx: number } | null>(null);
  const [dragOverState, setDragOverState] = useState<{ sectionId: string; bulletIdx: number } | null>(null);
  const [sectionDragIndex, setSectionDragIndex] = useState<number | null>(null);
  const [sectionOverIndex, setSectionOverIndex] = useState<number | null>(null);
  const hasStructuredSections = outlineSections && outlineSections.length > 0;
  const hasContent = hasStructuredSections || outline.trim();

  // Word count across all outline content (structured sections + freeform)
  const outlineText = hasStructuredSections
    ? outlineSections
        .map((s) => `${s.title} ${s.bullets.join(' ')}`)
        .join(' ')
    : outline;
  const outlineWordCount = outlineText.trim().split(/\s+/).filter(Boolean).length;
  const hasEnoughWords = outlineWordCount >= MIN_OUTLINE_WORDS;

  // Concept answers must be filled in before script generation
  const hasConceptAnswers =
    conceptAnswers.whoIsThisFor.trim().length > 0 &&
    conceptAnswers.whatWillTheyLearn.trim().length > 0 &&
    conceptAnswers.whyShouldTheyCare.trim().length > 0;

  const canGenerateScript = hasContent && hasEnoughWords && hasConceptAnswers;

  // --- Section editing helpers ---
  const updateSectionTitle = (sectionId: string, newTitle: string) => {
    setOutlineSections(
      outlineSections.map((s) =>
        s.id === sectionId ? { ...s, title: newTitle } : s
      )
    );
    onMarkChanged();
  };

  const updateBullet = (sectionId: string, bulletIndex: number, newValue: string) => {
    setOutlineSections(
      outlineSections.map((s) =>
        s.id === sectionId
          ? { ...s, bullets: s.bullets.map((b, i) => (i === bulletIndex ? newValue : b)) }
          : s
      )
    );
    onMarkChanged();
  };

  const addBullet = (sectionId: string) => {
    setOutlineSections(
      outlineSections.map((s) =>
        s.id === sectionId ? { ...s, bullets: [...s.bullets, ''] } : s
      )
    );
    onMarkChanged();
  };

  const removeBullet = (sectionId: string, bulletIndex: number) => {
    setOutlineSections(
      outlineSections.map((s) =>
        s.id === sectionId
          ? { ...s, bullets: s.bullets.filter((_, i) => i !== bulletIndex) }
          : s
      )
    );
    onMarkChanged();
  };

  const removeSection = (sectionId: string) => {
    const updated = outlineSections
      .filter((s) => s.id !== sectionId)
      .map((s, i) => ({ ...s, order: i }));
    setOutlineSections(updated);
    onMarkChanged();
  };

  const addSection = () => {
    const newSection: IOutlineSection = {
      id: crypto.randomUUID(),
      title: '',
      bullets: [''],
      order: outlineSections.length,
    };
    setOutlineSections([...outlineSections, newSection]);
    onMarkChanged();
  };

  const reorderBullets = (fromSectionId: string, fromIdx: number, toSectionId: string, toIdx: number) => {
    if (fromSectionId === toSectionId && fromIdx === toIdx) return;

    if (fromSectionId === toSectionId) {
      // Same section reorder
      setOutlineSections(
        outlineSections.map((s) => {
          if (s.id !== fromSectionId) return s;
          const bullets = [...s.bullets];
          const [moved] = bullets.splice(fromIdx, 1);
          bullets.splice(toIdx, 0, moved);
          return { ...s, bullets };
        })
      );
    } else {
      // Cross-section move
      const fromSection = outlineSections.find((s) => s.id === fromSectionId);
      if (!fromSection) return;
      const draggedBullet = fromSection.bullets[fromIdx];
      setOutlineSections(
        outlineSections.map((s) => {
          if (s.id === fromSectionId) return { ...s, bullets: s.bullets.filter((_, i) => i !== fromIdx) };
          if (s.id === toSectionId) {
            const newBullets = [...s.bullets];
            newBullets.splice(toIdx, 0, draggedBullet);
            return { ...s, bullets: newBullets };
          }
          return s;
        })
      );
    }
    onMarkChanged();
  };

  // --- Section drag handlers ---
  const handleSectionDragStart = (index: number) => {
    setSectionDragIndex(index);
  };

  const handleSectionDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (sectionDragIndex !== null) {
      setSectionOverIndex(index);
    }
  };

  const handleSectionDragEnd = () => {
    setSectionDragIndex(null);
    setSectionOverIndex(null);
  };

  const handleSectionDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (sectionDragIndex === null || sectionDragIndex === dropIndex) {
      setSectionDragIndex(null);
      setSectionOverIndex(null);
      return;
    }
    const sorted = [...outlineSections].sort((a, b) => a.order - b.order);
    const [dragged] = sorted.splice(sectionDragIndex, 1);
    sorted.splice(dropIndex, 0, dragged);
    setOutlineSections(sorted.map((s, i) => ({ ...s, order: i })));
    onMarkChanged();
    setSectionDragIndex(null);
    setSectionOverIndex(null);
  };

  // Escape HTML entities to prevent XSS in rendered outline
  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Simple markdown-to-HTML renderer for legacy outlines
  const renderedOutline = useMemo(() => {
    if (hasStructuredSections || !outline.trim()) return '';

    const lines = outline.split('\n');
    const htmlLines: string[] = [];
    let inList = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (inList && !trimmed.startsWith('- ') && !trimmed.startsWith('* ') && !trimmed.match(/^\d+\.\s/)) {
        htmlLines.push('</ul>');
        inList = false;
      }

      if (!trimmed) {
        htmlLines.push('<div class="h-3"></div>');
      } else if (trimmed.startsWith('## ')) {
        htmlLines.push(`<h2 class="text-lg font-semibold text-[var(--color-text-primary)] mt-5 mb-2">${escapeHtml(trimmed.slice(3))}</h2>`);
      } else if (trimmed.startsWith('# ')) {
        htmlLines.push(`<h1 class="text-xl font-bold text-[var(--color-text-primary)] mt-5 mb-2">${escapeHtml(trimmed.slice(2))}</h1>`);
      } else if (trimmed.startsWith('### ')) {
        htmlLines.push(`<h3 class="text-base font-semibold text-[var(--color-text-primary)] mt-4 mb-1.5">${escapeHtml(trimmed.slice(4))}</h3>`);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList) {
          htmlLines.push('<ul class="space-y-1.5 ml-1">');
          inList = true;
        }
        const content = escapeHtml(trimmed.slice(2)).replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--color-text-primary)]">$1</strong>');
        htmlLines.push(`<li class="flex gap-2 text-sm text-[var(--color-text-secondary)]"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"></span><span>${content}</span></li>`);
      } else if (trimmed.match(/^\d+\.\s/)) {
        if (!inList) {
          htmlLines.push('<ul class="space-y-1.5 ml-1">');
          inList = true;
        }
        const content = escapeHtml(trimmed.replace(/^\d+\.\s/, '')).replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--color-text-primary)]">$1</strong>');
        htmlLines.push(`<li class="flex gap-2 text-sm text-[var(--color-text-secondary)]"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"></span><span>${content}</span></li>`);
      } else {
        const content = escapeHtml(trimmed).replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--color-text-primary)]">$1</strong>');
        htmlLines.push(`<p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">${content}</p>`);
      }
    }

    if (inList) {
      htmlLines.push('</ul>');
    }

    return htmlLines.join('\n');
  }, [outline, hasStructuredSections]);

  return (
    <div className="space-y-5">
      {/* Outline card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Video Outline
          </label>
          <div className="flex items-center gap-2">
            {/* Only show Edit/Preview toggle for legacy markdown outlines */}
            {!hasStructuredSections && outline.trim() && (
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

        {/* Structured sections view */}
        {hasStructuredSections ? (
          <div className="space-y-4">
            {[...outlineSections]
              .sort((a, b) => a.order - b.order)
              .map((section, sortedIdx) => (
                <div
                  key={section.id}
                  draggable
                  onDragStart={() => handleSectionDragStart(sortedIdx)}
                  onDragOver={(e) => handleSectionDragOver(e, sortedIdx)}
                  onDragEnd={handleSectionDragEnd}
                  onDrop={(e) => handleSectionDrop(e, sortedIdx)}
                  className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 transition-all ${
                    sectionDragIndex === sortedIdx ? 'opacity-40' : ''
                  } ${
                    sectionOverIndex === sortedIdx && sectionDragIndex !== null && sectionDragIndex !== sortedIdx
                      ? 'ring-2 ring-[var(--color-accent)]'
                      : ''
                  }`}
                >
                  {/* Section header: drag handle + editable title + trash icon */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="shrink-0 cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
                        <svg className="h-5 w-5" viewBox="0 0 16 16" fill="currentColor">
                          <circle cx="5" cy="3" r="1.2" />
                          <circle cx="11" cy="3" r="1.2" />
                          <circle cx="5" cy="8" r="1.2" />
                          <circle cx="11" cy="8" r="1.2" />
                          <circle cx="5" cy="13" r="1.2" />
                          <circle cx="11" cy="13" r="1.2" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                        placeholder="Section title..."
                        className="flex-1 bg-transparent text-base font-bold text-[var(--color-text-primary)] outline-none ring-0 placeholder:text-[var(--color-text-muted)]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSection(section.id)}
                      title="Remove section"
                      className="shrink-0 ml-3 p-1.5 text-[var(--color-text-muted)] transition-colors hover:text-red-400"
                    >
                      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>

                  {/* Bullet points */}
                  <div className="space-y-1">
                    {section.bullets.map((bullet, bulletIdx) => (
                      <div
                        key={bulletIdx}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          setDragState({ sectionId: section.id, bulletIdx });
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragState) {
                            setDragOverState({ sectionId: section.id, bulletIdx });
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (dragState) {
                            reorderBullets(dragState.sectionId, dragState.bulletIdx, section.id, bulletIdx);
                          }
                          setDragState(null);
                          setDragOverState(null);
                        }}
                        onDragEnd={(e) => {
                          e.stopPropagation();
                          setDragState(null);
                          setDragOverState(null);
                        }}
                        className={`group flex items-center gap-2 rounded-[var(--radius-sm)] px-1 py-1.5 transition-colors hover:bg-[var(--color-bg-secondary)] ${
                          dragState?.sectionId === section.id && dragState?.bulletIdx === bulletIdx ? 'opacity-40' : ''
                        } ${
                          dragOverState?.sectionId === section.id && dragOverState?.bulletIdx === bulletIdx && dragState && !(dragState.sectionId === section.id && dragState.bulletIdx === bulletIdx)
                            ? 'border-t-2 border-[var(--color-accent)]'
                            : ''
                        }`}
                      >
                        {/* Drag handle dots */}
                        <span className="shrink-0 cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
                          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="5.5" cy="3.5" r="1.2" />
                            <circle cx="10.5" cy="3.5" r="1.2" />
                            <circle cx="5.5" cy="8" r="1.2" />
                            <circle cx="10.5" cy="8" r="1.2" />
                            <circle cx="5.5" cy="12.5" r="1.2" />
                            <circle cx="10.5" cy="12.5" r="1.2" />
                          </svg>
                        </span>
                        {/* Bullet text (editable inline) */}
                        <input
                          type="text"
                          value={bullet}
                          onChange={(e) => updateBullet(section.id, bulletIdx, e.target.value)}
                          placeholder="Talking point..."
                          className="flex-1 bg-transparent px-1 py-0.5 text-sm text-[var(--color-text-primary)] outline-none ring-0 placeholder:text-[var(--color-text-muted)]"
                        />
                        {/* Remove bullet X */}
                        <button
                          type="button"
                          onClick={() => removeBullet(section.id, bulletIdx)}
                          title="Remove point"
                          className="shrink-0 p-1 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* + Add point link */}
                  <button
                    type="button"
                    onClick={() => addBullet(section.id)}
                    className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add point
                  </button>
                </div>
              ))}

            {/* + Add section (dashed border card, full width) */}
            <button
              type="button"
              onClick={addSection}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add section
            </button>
          </div>
        ) : isEditing || !outline.trim() ? (
          /* Legacy markdown editing */
          <textarea
            value={outline}
            onChange={(e) => { setOutline(e.target.value); onMarkChanged(); }}
            rows={16}
            placeholder="Your video outline will appear here. Click 'Auto-generate' to create one from your concept and resources, or write your own."
            className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 font-mono text-sm leading-relaxed text-[var(--color-text-primary)] outline-none ring-0 transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
          />
        ) : (
          /* Legacy markdown preview */
          <div
            className="min-h-[16rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-4"
            dangerouslySetInnerHTML={{ __html: renderedOutline }}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:text-[var(--color-text-muted)]"
        >
          {isSaving ? 'Saving...' : 'Save changes'}
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

        {/* Spacer to push Generate Script to the right */}
        <div className="flex-1" />

        <button
          type="button"
          onClick={onGenerateScript}
          disabled={isGeneratingScript || !canGenerateScript}
          className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[#E05A47] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#C94D3C] disabled:bg-[#555] disabled:text-[#999]"
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

      {/* Voice Storm Prompt */}
      {showVoiceStormPrompt && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-accent)] bg-[var(--color-bg-card)] p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="h-5 w-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-[var(--color-text)]">
                Want a better script?
              </h4>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Record a quick voice storm about this idea first. Your raw thoughts and natural speaking style become the foundation of a more authentic script.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <a
                  href={`/dashboard/voice-storm?linkIdea=${ideaId}`}
                  className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                  Voice Storm First
                </a>
                <button
                  type="button"
                  onClick={onSkipAndGenerateScript}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
                >
                  Skip, Generate Script
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!canGenerateScript && !isGeneratingScript && (
        <div className="space-y-1.5">
          {!hasContent && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Add some content to your outline to get started.
            </p>
          )}
          {hasContent && !hasEnoughWords && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Your outline needs at least {MIN_OUTLINE_WORDS} words before generating a script. Current: {outlineWordCount} {outlineWordCount === 1 ? 'word' : 'words'}.
            </p>
          )}
          {!hasConceptAnswers && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Fill in all three concept questions (who, what, why) in the Concept step so the script knows your audience and angle.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
