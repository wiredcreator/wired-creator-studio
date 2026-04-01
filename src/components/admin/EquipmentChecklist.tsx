'use client';

import { useState } from 'react';

interface EquipmentChecklistItem {
  label: string;
  checked: boolean;
}

interface EquipmentChecklistProps {
  brandBrainId: string;
  items: EquipmentChecklistItem[];
}

const DEFAULT_ITEMS: EquipmentChecklistItem[] = [
  { label: 'Camera', checked: false },
  { label: 'Microphone', checked: false },
  { label: 'Lighting', checked: false },
  { label: 'Tripod', checked: false },
  { label: 'Editing Software', checked: false },
];

export default function EquipmentChecklist({ brandBrainId, items: initialItems }: EquipmentChecklistProps) {
  const [items, setItems] = useState<EquipmentChecklistItem[]>(
    initialItems.length > 0 ? initialItems : DEFAULT_ITEMS
  );
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const persistChecklist = async (updatedItems: EquipmentChecklistItem[]) => {
    setSaving(true);
    try {
      await fetch(`/api/brand-brain/${brandBrainId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentChecklist: updatedItems }),
      });
    } catch (err) {
      console.error('Failed to save equipment checklist:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (index: number) => {
    const updatedItems = items.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item
    );
    setItems(updatedItems);
    persistChecklist(updatedItems);
  };

  const handleAdd = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    const updatedItems = [...items, { label: trimmed, checked: false }];
    setItems(updatedItems);
    setNewLabel('');
    persistChecklist(updatedItems);
  };

  const handleRemove = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    persistChecklist(updatedItems);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Equipment Checklist
        </h3>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {checkedCount}/{items.length}
          {saving && (
            <span className="ml-2 text-[var(--color-text-muted)]">Saving...</span>
          )}
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="group flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-1.5 transition-colors hover:bg-[var(--color-bg-secondary)]"
          >
            <button
              type="button"
              onClick={() => handleToggle(index)}
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                item.checked
                  ? 'border-emerald-500 bg-emerald-500'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]'
              }`}
            >
              {item.checked && (
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span
              className={`flex-1 text-sm ${
                item.checked
                  ? 'text-[var(--color-text-muted)] line-through'
                  : 'text-[var(--color-text-primary)]'
              }`}
            >
              {item.label}
            </span>
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="hidden shrink-0 text-[var(--color-text-muted)] transition-colors hover:text-red-400 group-hover:block"
              title="Remove item"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add item..."
          className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newLabel.trim()}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
