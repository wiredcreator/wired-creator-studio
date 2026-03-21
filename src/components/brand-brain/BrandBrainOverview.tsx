'use client';

import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
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

interface ToneOfVoiceSummary {
  status: 'draft' | 'review' | 'active';
  parameterCount: number;
  summary: string;
}

interface BrandBrainOverviewProps {
  /** The student's name for display purposes. */
  studentName?: string;
  /** Current version number of the Brand Brain. */
  version: number;
  /** When the Brand Brain was last updated. */
  lastUpdated: string;
  /** Summary of the Tone of Voice guide. */
  toneOfVoice?: ToneOfVoiceSummary;
  /** Content pillars. */
  contentPillars: ContentPillar[];
  /** Industry data. */
  industryData: IndustryData;
  /** Equipment profile. */
  equipmentProfile: EquipmentProfile;
  /** Navigate to the Tone of Voice editor. */
  onEditToneOfVoice?: () => void;
  /** Called when content pillars are updated. */
  onSavePillars?: (pillars: ContentPillar[]) => void;
  /** Called when industry data is updated. */
  onSaveIndustryData?: (data: IndustryData) => void;
  /** Called when equipment profile is updated. */
  onSaveEquipmentProfile?: (profile: EquipmentProfile) => void;
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-[var(--color-warning-light)]', text: 'text-[var(--color-warning)]', label: 'Draft' },
  review: { bg: 'bg-blue-900', text: 'text-blue-300', label: 'In Review' },
  active: { bg: 'bg-emerald-900', text: 'text-emerald-300', label: 'Active' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BrandBrainOverview({
  studentName,
  version,
  lastUpdated,
  toneOfVoice,
  contentPillars,
  industryData,
  equipmentProfile,
  onEditToneOfVoice,
  onSavePillars,
  onSaveIndustryData,
  onSaveEquipmentProfile,
}: BrandBrainOverviewProps) {
  // --- Content Pillars editing ---
  const [isEditingPillars, setIsEditingPillars] = useState(false);
  const [editedPillars, setEditedPillars] =
    useState<ContentPillar[]>(contentPillars);

  // --- Industry Data editing ---
  const [isEditingIndustry, setIsEditingIndustry] = useState(false);
  const [editedIndustry, setEditedIndustry] =
    useState<IndustryData>(industryData);

  // --- Equipment editing ---
  const [isEditingEquipment, setIsEditingEquipment] = useState(false);
  const [editedEquipment, setEditedEquipment] =
    useState<EquipmentProfile>(equipmentProfile);

  // --- Handlers ---

  const savePillars = () => {
    onSavePillars?.(editedPillars);
    setIsEditingPillars(false);
  };

  const addPillar = () => {
    setEditedPillars((prev) => [
      ...prev,
      { title: '', description: '', keywords: [] },
    ]);
  };

  const removePillar = (index: number) => {
    setEditedPillars((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePillar = (
    index: number,
    field: keyof ContentPillar,
    value: string | string[]
  ) => {
    setEditedPillars((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const saveIndustry = () => {
    onSaveIndustryData?.(editedIndustry);
    setIsEditingIndustry(false);
  };

  const saveEquipment = () => {
    onSaveEquipmentProfile?.(editedEquipment);
    setIsEditingEquipment(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            {studentName ? `${studentName}'s Brand Brain` : 'Brand Brain'}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Your AI context layer — everything that shapes your content.
          </p>
        </div>
        <div className="text-right text-sm text-[var(--color-text-muted)]">
          <p>Version {version}</p>
          <p>Updated {lastUpdated}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ---- Tone of Voice Guide Section ---- */}
        <Section
          title="Tone of Voice Guide"
          action={
            <button
              onClick={onEditToneOfVoice}
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Open Editor
            </button>
          }
        >
          {toneOfVoice ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[toneOfVoice.status].bg} ${STATUS_STYLES[toneOfVoice.status].text}`}
                >
                  {STATUS_STYLES[toneOfVoice.status].label}
                </span>
                <span className="text-sm text-[var(--color-text-muted)]">
                  {toneOfVoice.parameterCount} parameters
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                {toneOfVoice.summary}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] italic">
              No Tone of Voice guide generated yet. Complete the Content DNA
              questionnaire to get started.
            </p>
          )}
        </Section>

        {/* ---- Content Pillars Section ---- */}
        <Section
          title="Content Pillars"
          action={
            <button
              onClick={() =>
                isEditingPillars ? savePillars() : setIsEditingPillars(true)
              }
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              {isEditingPillars ? 'Save' : 'Edit'}
            </button>
          }
        >
          {isEditingPillars ? (
            <div className="space-y-4">
              {editedPillars.map((pillar, i) => (
                <div
                  key={i}
                  className="p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={pillar.title}
                      onChange={(e) => updatePillar(i, 'title', e.target.value)}
                      placeholder="Pillar title"
                      className="text-sm font-medium text-[var(--color-text-primary)] bg-transparent border-b border-[var(--color-border)] focus:outline-none focus:border-[var(--color-text-muted)] flex-1"
                    />
                    <button
                      onClick={() => removePillar(i)}
                      className="ml-2 p-1 text-[var(--color-text-muted)] hover:text-red-500"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <textarea
                    value={pillar.description}
                    onChange={(e) =>
                      updatePillar(i, 'description', e.target.value)
                    }
                    placeholder="Description"
                    rows={2}
                    className="w-full text-sm text-[var(--color-text-primary)] bg-transparent border-b border-[var(--color-border)] focus:outline-none focus:border-[var(--color-text-muted)] resize-none"
                  />
                  <input
                    type="text"
                    value={pillar.keywords.join(', ')}
                    onChange={(e) =>
                      updatePillar(
                        i,
                        'keywords',
                        e.target.value.split(',').map((k) => k.trim())
                      )
                    }
                    placeholder="Keywords (comma-separated)"
                    className="w-full text-xs text-[var(--color-text-muted)] bg-transparent border-b border-[var(--color-border)] focus:outline-none focus:border-[var(--color-text-muted)]"
                  />
                </div>
              ))}
              <button
                onClick={addPillar}
                className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Pillar
              </button>
              <button
                onClick={() => {
                  setEditedPillars(contentPillars);
                  setIsEditingPillars(false);
                }}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] ml-4"
              >
                Cancel
              </button>
            </div>
          ) : contentPillars.length > 0 ? (
            <div className="space-y-3">
              {contentPillars.map((pillar, i) => (
                <div key={i}>
                  <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
                    {pillar.title}
                  </h4>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                    {pillar.description}
                  </p>
                  {pillar.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {pillar.keywords.map((kw, j) => (
                        <span
                          key={j}
                          className="px-2 py-0.5 text-xs text-[var(--color-text)] bg-[var(--color-bg-secondary)] rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] italic">
              No content pillars defined yet.
            </p>
          )}
        </Section>

        {/* ---- Industry Data Section ---- */}
        <Section
          title="Industry & Niche"
          action={
            <button
              onClick={() =>
                isEditingIndustry ? saveIndustry() : setIsEditingIndustry(true)
              }
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              {isEditingIndustry ? 'Save' : 'Edit'}
            </button>
          }
        >
          {isEditingIndustry ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                  Field / Industry
                </label>
                <input
                  type="text"
                  value={editedIndustry.field}
                  onChange={(e) =>
                    setEditedIndustry((prev) => ({
                      ...prev,
                      field: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={editedIndustry.keywords.join(', ')}
                  onChange={(e) =>
                    setEditedIndustry((prev) => ({
                      ...prev,
                      keywords: e.target.value
                        .split(',')
                        .map((k) => k.trim()),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                  Competitors (comma-separated)
                </label>
                <input
                  type="text"
                  value={editedIndustry.competitors.join(', ')}
                  onChange={(e) =>
                    setEditedIndustry((prev) => ({
                      ...prev,
                      competitors: e.target.value
                        .split(',')
                        .map((c) => c.trim()),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
              <button
                onClick={() => {
                  setEditedIndustry(industryData);
                  setIsEditingIndustry(false);
                }}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {industryData.field ? (
                <>
                  <p className="text-sm text-[var(--color-text-primary)]">
                    <span className="font-medium">Field:</span>{' '}
                    {industryData.field}
                  </p>
                  {industryData.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {industryData.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs text-[var(--color-text)] bg-[var(--color-bg-secondary)] rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                  {industryData.competitors.length > 0 && (
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      <span className="font-medium">Competitors:</span>{' '}
                      {industryData.competitors.join(', ')}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)] italic">
                  No industry data defined yet.
                </p>
              )}
            </div>
          )}
        </Section>

        {/* ---- Equipment Profile Section ---- */}
        <Section
          title="Equipment & Setup"
          action={
            <button
              onClick={() =>
                isEditingEquipment
                  ? saveEquipment()
                  : setIsEditingEquipment(true)
              }
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              {isEditingEquipment ? 'Save' : 'Edit'}
            </button>
          }
        >
          {isEditingEquipment ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                  Camera / Recording Setup
                </label>
                <input
                  type="text"
                  value={editedEquipment.camera}
                  onChange={(e) =>
                    setEditedEquipment((prev) => ({
                      ...prev,
                      camera: e.target.value,
                    }))
                  }
                  placeholder="e.g. iPhone 15 Pro, Sony A7IV"
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                  Filming Location
                </label>
                <input
                  type="text"
                  value={editedEquipment.location}
                  onChange={(e) =>
                    setEditedEquipment((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  placeholder="e.g. Home office, co-working space"
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                  Constraints / Notes
                </label>
                <textarea
                  value={editedEquipment.constraints}
                  onChange={(e) =>
                    setEditedEquipment((prev) => ({
                      ...prev,
                      constraints: e.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="e.g. Can only film on weekends, noisy environment"
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
                />
              </div>
              <button
                onClick={() => {
                  setEditedEquipment(equipmentProfile);
                  setIsEditingEquipment(false);
                }}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {equipmentProfile.camera ||
              equipmentProfile.location ||
              equipmentProfile.constraints ? (
                <>
                  {equipmentProfile.camera && (
                    <p className="text-sm text-[var(--color-text-primary)]">
                      <span className="font-medium">Camera:</span>{' '}
                      {equipmentProfile.camera}
                    </p>
                  )}
                  {equipmentProfile.location && (
                    <p className="text-sm text-[var(--color-text-primary)]">
                      <span className="font-medium">Location:</span>{' '}
                      {equipmentProfile.location}
                    </p>
                  )}
                  {equipmentProfile.constraints && (
                    <p className="text-sm text-[var(--color-text-primary)]">
                      <span className="font-medium">Constraints:</span>{' '}
                      {equipmentProfile.constraints}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)] italic">
                  No equipment profile defined yet.
                </p>
              )}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper — keeps the card layout consistent
// ---------------------------------------------------------------------------

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="p-5 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
