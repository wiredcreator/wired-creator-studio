'use client';

import { useState, useEffect, useCallback } from 'react';
import type { IConceptAnswers, IOutlineSection, IResource, INote, IComment } from '@/models/ContentIdea';
import ConceptTab from './draft/ConceptTab';
import ResourcesTab from './draft/ResourcesTab';
import OutlineTab from './draft/OutlineTab';
import DraftSidebar from './draft/DraftSidebar';
import FindSourcesPanel from './draft/FindSourcesPanel';

type TabId = 'concept' | 'resources' | 'outline';

interface DraftEditorProps {
  ideaId: string | null;
  onBack: () => void;
  onNewDraft: () => void;
}

interface IdeaData {
  _id: string;
  title: string;
  description: string;
  conceptAnswers?: IConceptAnswers;
  callToAction: string;
  alternativeTitles: string[];
  tags: string[];
  resources: IResource[];
  outline: string;
  outlineSections: IOutlineSection[];
  rawNotes: string;
  notes: INote[];
  comments: IComment[];
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'concept', label: 'Concept' },
  { id: 'resources', label: 'Resources' },
  { id: 'outline', label: 'Outline' },
];

export default function DraftEditor({ ideaId, onBack, onNewDraft }: DraftEditorProps) {
  const [idea, setIdea] = useState<IdeaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('concept');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showFindSources, setShowFindSources] = useState(false);

  // Editable fields
  const [title, setTitle] = useState('');
  const [conceptAnswers, setConceptAnswers] = useState<IConceptAnswers>({
    whoIsThisFor: '',
    whatWillTheyLearn: '',
    whyShouldTheyCare: '',
  });
  const [callToAction, setCallToAction] = useState('');
  const [alternativeTitles, setAlternativeTitles] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [resources, setResources] = useState<IResource[]>([]);
  const [outlineSections, setOutlineSections] = useState<IOutlineSection[]>([]);
  const [rawNotes, setRawNotes] = useState('');
  const [notes, setNotes] = useState<INote[]>([]);
  const [comments, setComments] = useState<IComment[]>([]);

  // AI generation states
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // Fetch idea data
  useEffect(() => {
    if (!ideaId) {
      setLoading(false);
      return;
    }
    async function fetchIdea() {
      try {
        const res = await fetch(`/api/ideas/${ideaId}`);
        if (res.ok) {
          const data: IdeaData = await res.json();
          setIdea(data);
          setTitle(data.title || '');
          setConceptAnswers(data.conceptAnswers || { whoIsThisFor: '', whatWillTheyLearn: '', whyShouldTheyCare: '' });
          setCallToAction(data.callToAction || '');
          setAlternativeTitles(data.alternativeTitles || []);
          setTags(data.tags || []);
          setResources(data.resources || []);
          setOutlineSections(data.outlineSections || []);
          setRawNotes(data.rawNotes || '');
          setNotes(data.notes || []);
          setComments(data.comments || []);
        }
      } catch {
        // Failed to load
      } finally {
        setLoading(false);
      }
    }
    fetchIdea();
  }, [ideaId]);

  const markChanged = useCallback(() => setHasChanges(true), []);

  const handleSave = useCallback(async () => {
    if (!ideaId || isSaving) return;
    setIsSaving(true);
    try {
      await fetch(`/api/ideas/${ideaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          conceptAnswers,
          callToAction,
          alternativeTitles,
          tags,
          resources,
          outlineSections,
          rawNotes,
          notes,
          comments,
        }),
      });
      setHasChanges(false);
    } catch {
      // Save failed
    } finally {
      setIsSaving(false);
    }
  }, [ideaId, isSaving, title, conceptAnswers, callToAction, alternativeTitles, tags, resources, outlineSections, rawNotes, notes, comments]);

  const handleAutoGenerateConcept = useCallback(async () => {
    if (!ideaId || isGeneratingConcept) return;
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
          setHasChanges(true);
        }
      }
    } catch {
      // Generation failed
    } finally {
      setIsGeneratingConcept(false);
    }
  }, [ideaId, isGeneratingConcept]);

  const handleAutoGenerateOutline = useCallback(async () => {
    if (!ideaId || isGeneratingOutline) return;
    setIsGeneratingOutline(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'outline' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.outlineSections) {
          setOutlineSections(data.outlineSections);
          setHasChanges(true);
        }
      }
    } catch {
      // Generation failed
    } finally {
      setIsGeneratingOutline(false);
    }
  }, [ideaId, isGeneratingOutline]);

  const handleTurnIntoScript = useCallback(async () => {
    if (!ideaId || isGeneratingScript) return;
    setIsGeneratingScript(true);
    try {
      await fetch(`/api/ideas/${ideaId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateScript' }),
      });
    } catch {
      // Script generation failed
    } finally {
      setIsGeneratingScript(false);
    }
  }, [ideaId, isGeneratingScript]);

  const handleSourcesFound = useCallback((newResources: IResource[]) => {
    setResources((prev) => [...prev, ...newResources]);
    setHasChanges(true);
    setShowFindSources(false);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 animate-fadeIn">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        <p className="text-sm text-[var(--color-text-muted)]">Loading draft...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
            Focus Mode &middot; Draft
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onNewDraft}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)]"
          >
            + New draft
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#E05A47' }}
          >
            {isSaving ? 'Saving...' : 'Save draft'}
          </button>
        </div>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => { setTitle(e.target.value); markChanged(); }}
        placeholder="Idea title..."
        className="mb-6 w-full bg-transparent text-2xl font-semibold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none border-none"
      />

      {/* Tabs */}
      <div className="mb-6 inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content + Sidebar */}
      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          {activeTab === 'concept' && (
            <ConceptTab
              conceptAnswers={conceptAnswers}
              setConceptAnswers={setConceptAnswers}
              rawNotes={rawNotes}
              setRawNotes={setRawNotes}
              onSave={handleSave}
              onAutoGenerate={handleAutoGenerateConcept}
              isSaving={isSaving}
              isGenerating={isGeneratingConcept}
              onMarkChanged={markChanged}
            />
          )}
          {activeTab === 'resources' && (
            <ResourcesTab
              resources={resources}
              setResources={setResources}
              onFindSources={() => setShowFindSources(true)}
              onMarkChanged={markChanged}
            />
          )}
          {activeTab === 'outline' && (
            <OutlineTab
              outlineSections={outlineSections}
              setOutlineSections={setOutlineSections}
              onSave={handleSave}
              onAutoGenerate={handleAutoGenerateOutline}
              onTurnIntoScript={handleTurnIntoScript}
              isSaving={isSaving}
              isGenerating={isGeneratingOutline}
              isGeneratingScript={isGeneratingScript}
              onMarkChanged={markChanged}
            />
          )}
        </div>
        <div className="w-[280px] flex-shrink-0 hidden lg:block">
          <DraftSidebar
            callToAction={callToAction}
            setCallToAction={setCallToAction}
            tags={tags}
            setTags={setTags}
            alternativeTitles={alternativeTitles}
            notes={notes}
            setNotes={setNotes}
            comments={comments}
            onMarkChanged={markChanged}
          />
        </div>
      </div>

      {/* Find Sources Panel */}
      <FindSourcesPanel
        isOpen={showFindSources}
        onClose={() => setShowFindSources(false)}
        ideaTitle={title}
        conceptAnswers={conceptAnswers}
        onSourcesFound={handleSourcesFound}
      />
    </div>
  );
}
