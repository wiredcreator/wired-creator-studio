'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { IOutlineSection } from '@/models/ContentIdea';

interface OutlineTabProps {
  outlineSections: IOutlineSection[];
  setOutlineSections: (v: IOutlineSection[]) => void;
  onSave: () => void;
  onAutoGenerate: () => void;
  onTurnIntoScript: () => void;
  isSaving: boolean;
  isGenerating: boolean;
  isGeneratingScript: boolean;
  onMarkChanged: () => void;
}

const DEFAULT_SECTIONS: IOutlineSection[] = [
  { id: crypto.randomUUID(), title: 'Hook', bullets: [''], order: 0 },
  { id: crypto.randomUUID(), title: 'Body', bullets: [''], order: 1 },
  { id: crypto.randomUUID(), title: 'CTA', bullets: [''], order: 2 },
];

function DragHandle({ size = 'md' }: { size?: 'md' | 'sm' }) {
  const dim = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <svg
      className={`${dim} shrink-0 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors`}
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <circle cx="5" cy="3" r="1.2" />
      <circle cx="11" cy="3" r="1.2" />
      <circle cx="5" cy="8" r="1.2" />
      <circle cx="11" cy="8" r="1.2" />
      <circle cx="5" cy="13" r="1.2" />
      <circle cx="11" cy="13" r="1.2" />
    </svg>
  );
}

export default function OutlineTab({
  outlineSections,
  setOutlineSections,
  onSave,
  onAutoGenerate,
  onTurnIntoScript,
  isSaving,
  isGenerating,
  isGeneratingScript,
  onMarkChanged,
}: OutlineTabProps) {
  const [initialized, setInitialized] = useState(false);
  const newBulletRef = useRef<HTMLInputElement | null>(null);

  // Section drag state
  const [sectionDragIndex, setSectionDragIndex] = useState<number | null>(null);
  const [sectionOverIndex, setSectionOverIndex] = useState<number | null>(null);

  // Bullet drag state
  const [bulletDragInfo, setBulletDragInfo] = useState<{ sectionIdx: number; bulletIdx: number } | null>(null);
  const [bulletOverInfo, setBulletOverInfo] = useState<{ sectionIdx: number; bulletIdx: number } | null>(null);

  // Initialize with defaults if empty
  useEffect(() => {
    if (!initialized && outlineSections.length === 0) {
      setOutlineSections(DEFAULT_SECTIONS.map((s) => ({ ...s, id: crypto.randomUUID() })));
      setInitialized(true);
    } else if (!initialized) {
      setInitialized(true);
    }
  }, [initialized, outlineSections, setOutlineSections]);

  const updateSection = useCallback((sectionId: string, updates: Partial<IOutlineSection>) => {
    setOutlineSections(
      outlineSections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s))
    );
    onMarkChanged();
  }, [outlineSections, setOutlineSections, onMarkChanged]);

  const updateBullet = useCallback((sectionId: string, bulletIdx: number, value: string) => {
    setOutlineSections(
      outlineSections.map((s) => {
        if (s.id !== sectionId) return s;
        const newBullets = [...s.bullets];
        newBullets[bulletIdx] = value;
        return { ...s, bullets: newBullets };
      })
    );
    onMarkChanged();
  }, [outlineSections, setOutlineSections, onMarkChanged]);

  const addBullet = useCallback((sectionId: string) => {
    setOutlineSections(
      outlineSections.map((s) => {
        if (s.id !== sectionId) return s;
        return { ...s, bullets: [...s.bullets, ''] };
      })
    );
    onMarkChanged();
    // Focus new bullet on next render
    setTimeout(() => newBulletRef.current?.focus(), 50);
  }, [outlineSections, setOutlineSections, onMarkChanged]);

  const handleBulletKeyDown = useCallback((e: React.KeyboardEvent, sectionId: string, bulletIdx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Insert new bullet below current
      setOutlineSections(
        outlineSections.map((s) => {
          if (s.id !== sectionId) return s;
          const newBullets = [...s.bullets];
          newBullets.splice(bulletIdx + 1, 0, '');
          return { ...s, bullets: newBullets };
        })
      );
      onMarkChanged();
      setTimeout(() => newBulletRef.current?.focus(), 50);
    } else if (e.key === 'Backspace') {
      const section = outlineSections.find((s) => s.id === sectionId);
      if (section && section.bullets[bulletIdx] === '' && section.bullets.length > 1) {
        e.preventDefault();
        setOutlineSections(
          outlineSections.map((s) => {
            if (s.id !== sectionId) return s;
            return { ...s, bullets: s.bullets.filter((_, i) => i !== bulletIdx) };
          })
        );
        onMarkChanged();
      }
    }
  }, [outlineSections, setOutlineSections, onMarkChanged]);

  const addSection = useCallback(() => {
    const newSection: IOutlineSection = {
      id: crypto.randomUUID(),
      title: 'New Section',
      bullets: [''],
      order: outlineSections.length,
    };
    setOutlineSections([...outlineSections, newSection]);
    onMarkChanged();
  }, [outlineSections, setOutlineSections, onMarkChanged]);

  // --- Section drag handlers ---
  const handleSectionDragStart = useCallback((index: number) => {
    setSectionDragIndex(index);
  }, []);

  const handleSectionDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (sectionDragIndex !== null) {
      setSectionOverIndex(index);
    }
  }, [sectionDragIndex]);

  const handleSectionDragEnd = useCallback(() => {
    setSectionDragIndex(null);
    setSectionOverIndex(null);
  }, []);

  const handleSectionDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (sectionDragIndex === null || sectionDragIndex === dropIndex) {
      setSectionDragIndex(null);
      setSectionOverIndex(null);
      return;
    }
    const updated = [...outlineSections];
    const [dragged] = updated.splice(sectionDragIndex, 1);
    updated.splice(dropIndex, 0, dragged);
    setOutlineSections(updated.map((s, i) => ({ ...s, order: i })));
    onMarkChanged();
    setSectionDragIndex(null);
    setSectionOverIndex(null);
  }, [sectionDragIndex, outlineSections, setOutlineSections, onMarkChanged]);

  // --- Bullet drag handlers ---
  const handleBulletDragStart = useCallback((sectionIdx: number, bulletIdx: number) => {
    setBulletDragInfo({ sectionIdx, bulletIdx });
  }, []);

  const handleBulletDragOver = useCallback((e: React.DragEvent, sectionIdx: number, bulletIdx: number) => {
    e.preventDefault();
    if (bulletDragInfo) {
      setBulletOverInfo({ sectionIdx, bulletIdx });
    }
  }, [bulletDragInfo]);

  const handleBulletDragEnd = useCallback(() => {
    setBulletDragInfo(null);
    setBulletOverInfo(null);
  }, []);

  const handleBulletDrop = useCallback((e: React.DragEvent, sectionIdx: number, bulletIdx: number) => {
    e.preventDefault();
    if (!bulletDragInfo || (bulletDragInfo.sectionIdx === sectionIdx && bulletDragInfo.bulletIdx === bulletIdx)) {
      setBulletDragInfo(null);
      setBulletOverInfo(null);
      return;
    }
    const fromSection = outlineSections[bulletDragInfo.sectionIdx];
    const draggedBullet = fromSection.bullets[bulletDragInfo.bulletIdx];

    if (bulletDragInfo.sectionIdx === sectionIdx) {
      // Same section reorder
      const newBullets = [...fromSection.bullets];
      const [moved] = newBullets.splice(bulletDragInfo.bulletIdx, 1);
      newBullets.splice(bulletIdx, 0, moved);
      setOutlineSections(
        outlineSections.map((s, i) => (i === sectionIdx ? { ...s, bullets: newBullets } : s))
      );
    } else {
      // Cross-section move
      const fromBullets = fromSection.bullets.filter((_, i) => i !== bulletDragInfo.bulletIdx);
      const toSection = outlineSections[sectionIdx];
      const toBullets = [...toSection.bullets];
      toBullets.splice(bulletIdx, 0, draggedBullet);
      setOutlineSections(
        outlineSections.map((s, i) => {
          if (i === bulletDragInfo!.sectionIdx) return { ...s, bullets: fromBullets };
          if (i === sectionIdx) return { ...s, bullets: toBullets };
          return s;
        })
      );
    }
    onMarkChanged();
    setBulletDragInfo(null);
    setBulletOverInfo(null);
  }, [bulletDragInfo, outlineSections, setOutlineSections, onMarkChanged]);

  return (
    <div>
      <div className="space-y-0">
        {outlineSections.map((section, sIdx) => (
          <div
            key={section.id}
            draggable
            onDragStart={() => handleSectionDragStart(sIdx)}
            onDragOver={(e) => handleSectionDragOver(e, sIdx)}
            onDragEnd={handleSectionDragEnd}
            onDrop={(e) => handleSectionDrop(e, sIdx)}
            className={`transition-all ${
              sectionDragIndex === sIdx ? 'opacity-40' : ''
            } ${
              sectionOverIndex === sIdx && sectionDragIndex !== null && sectionDragIndex !== sIdx
                ? 'border-t-2 border-[var(--color-accent)]'
                : 'border-t-2 border-transparent'
            }`}
          >
            {sIdx > 0 && sectionOverIndex !== sIdx && (
              <div className="border-t border-[var(--color-border)] my-4" />
            )}
            {sIdx > 0 && sectionOverIndex === sIdx && <div className="my-4" />}
            <div className="space-y-2">
              {/* Section title with drag handle */}
              <div className="flex items-center gap-2">
                <div className="cursor-grab active:cursor-grabbing">
                  <DragHandle />
                </div>
                <input
                  type="text"
                  data-transparent
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm font-bold text-[var(--color-text)] bg-transparent outline-none ring-0 w-full border-b border-[var(--color-border)] pb-2"
                />
              </div>
              {/* Bullets */}
              {section.bullets.map((bullet, bIdx) => (
                <div
                  key={bIdx}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    handleBulletDragStart(sIdx, bIdx);
                  }}
                  onDragOver={(e) => {
                    e.stopPropagation();
                    handleBulletDragOver(e, sIdx, bIdx);
                  }}
                  onDragEnd={(e) => {
                    e.stopPropagation();
                    handleBulletDragEnd();
                  }}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleBulletDrop(e, sIdx, bIdx);
                  }}
                  className={`flex items-start gap-2 transition-all ${
                    bulletDragInfo?.sectionIdx === sIdx && bulletDragInfo?.bulletIdx === bIdx
                      ? 'opacity-40'
                      : ''
                  } ${
                    bulletOverInfo?.sectionIdx === sIdx &&
                    bulletOverInfo?.bulletIdx === bIdx &&
                    bulletDragInfo !== null &&
                    !(bulletDragInfo.sectionIdx === sIdx && bulletDragInfo.bulletIdx === bIdx)
                      ? 'border-t-2 border-[var(--color-accent)]'
                      : 'border-t-2 border-transparent'
                  }`}
                >
                  <div className="cursor-grab active:cursor-grabbing mt-0.5">
                    <DragHandle size="sm" />
                  </div>
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-text-muted)]" />
                  <input
                    ref={bIdx === section.bullets.length - 1 ? newBulletRef : undefined}
                    type="text"
                    data-transparent
                    value={bullet}
                    onChange={(e) => updateBullet(section.id, bIdx, e.target.value)}
                    onKeyDown={(e) => handleBulletKeyDown(e, section.id, bIdx)}
                    placeholder="Add point..."
                    className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none ring-0"
                  />
                </div>
              ))}
              <button
                onClick={() => addBullet(section.id)}
                className="text-xs text-[var(--color-accent)] hover:underline ml-4"
              >
                + Add point
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add section button */}
      <button
        onClick={addSection}
        className="mt-4 w-full rounded-lg border-2 border-dashed border-[var(--color-border)] py-3 text-sm text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        + Add section
      </button>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)] disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
          <button
            onClick={onAutoGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)] disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            {isGenerating ? 'Generating...' : 'Auto-generate'}
          </button>
        </div>
        <button
          onClick={onTurnIntoScript}
          disabled={isGeneratingScript}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#E05A47' }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          {isGeneratingScript ? 'Generating...' : 'Turn into Script'}
        </button>
      </div>
    </div>
  );
}
