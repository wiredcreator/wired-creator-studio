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

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
      <div className="space-y-0">
        {outlineSections.map((section, sIdx) => (
          <div key={section.id}>
            {sIdx > 0 && <div className="border-t border-dashed border-[var(--color-border)] my-4" />}
            <div className="space-y-2">
              {/* Section title */}
              <input
                type="text"
                value={section.title}
                onChange={(e) => updateSection(section.id, { title: e.target.value })}
                className="text-sm font-bold text-[var(--color-text)] bg-transparent outline-none ring-0 w-full"
              />
              {/* Bullets */}
              {section.bullets.map((bullet, bIdx) => (
                <div key={bIdx} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-text-muted)]" />
                  <input
                    ref={bIdx === section.bullets.length - 1 ? newBulletRef : undefined}
                    type="text"
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
