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
  draft: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Draft' },
  review: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Review' },
  active: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Active' },
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
          <h1 className="text-2xl font-semibold text-gray-900">
            {studentName ? `${studentName}'s Brand Brain` : 'Brand Brain'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Your AI context layer — everything that shapes your content.
          </p>
        </div>
        <div className="text-right text-sm text-gray-400">
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
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
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
                <span className="text-sm text-gray-500">
                  {toneOfVoice.parameterCount} parameters
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {toneOfVoice.summary}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
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
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
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
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={pillar.title}
                      onChange={(e) => updatePillar(i, 'title', e.target.value)}
                      placeholder="Pillar title"
                      className="text-sm font-medium text-gray-900 bg-transparent border-b border-gray-300 focus:outline-none focus:border-gray-500 flex-1"
                    />
                    <button
                      onClick={() => removePillar(i)}
                      className="ml-2 p-1 text-gray-400 hover:text-red-500"
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
                    className="w-full text-sm text-gray-700 bg-transparent border-b border-gray-200 focus:outline-none focus:border-gray-400 resize-none"
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
                    className="w-full text-xs text-gray-500 bg-transparent border-b border-gray-200 focus:outline-none focus:border-gray-400"
                  />
                </div>
              ))}
              <button
                onClick={addPillar}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
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
                className="text-sm text-gray-400 hover:text-gray-600 ml-4"
              >
                Cancel
              </button>
            </div>
          ) : contentPillars.length > 0 ? (
            <div className="space-y-3">
              {contentPillars.map((pillar, i) => (
                <div key={i}>
                  <h4 className="text-sm font-medium text-gray-900">
                    {pillar.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {pillar.description}
                  </p>
                  {pillar.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {pillar.keywords.map((kw, j) => (
                        <span
                          key={j}
                          className="px-2 py-0.5 text-xs text-gray-500 bg-gray-100 rounded"
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
            <p className="text-sm text-gray-400 italic">
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
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {isEditingIndustry ? 'Save' : 'Edit'}
            </button>
          }
        >
          {isEditingIndustry ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <button
                onClick={() => {
                  setEditedIndustry(industryData);
                  setIsEditingIndustry(false);
                }}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {industryData.field ? (
                <>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Field:</span>{' '}
                    {industryData.field}
                  </p>
                  {industryData.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {industryData.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs text-gray-500 bg-gray-100 rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                  {industryData.competitors.length > 0 && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Competitors:</span>{' '}
                      {industryData.competitors.join(', ')}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">
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
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {isEditingEquipment ? 'Save' : 'Edit'}
            </button>
          }
        >
          {isEditingEquipment ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
                />
              </div>
              <button
                onClick={() => {
                  setEditedEquipment(equipmentProfile);
                  setIsEditingEquipment(false);
                }}
                className="text-sm text-gray-400 hover:text-gray-600"
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
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Camera:</span>{' '}
                      {equipmentProfile.camera}
                    </p>
                  )}
                  {equipmentProfile.location && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Location:</span>{' '}
                      {equipmentProfile.location}
                    </p>
                  )}
                  {equipmentProfile.constraints && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Constraints:</span>{' '}
                      {equipmentProfile.constraints}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">
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
    <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
