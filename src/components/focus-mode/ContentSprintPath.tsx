'use client';

import { useState, useCallback } from 'react';
import DraftEditor from './DraftEditor';

export default function ContentSprintPath() {
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Create the idea on-demand (when user first saves), not on mount.
  // This prevents orphaned "Untitled Draft" records from piling up.
  const createDraftIfNeeded = useCallback(async (title: string): Promise<string | null> => {
    if (ideaId) return ideaId;
    setCreating(true);
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || 'Untitled Draft', source: 'manual' }),
      });
      if (res.ok) {
        const data = await res.json();
        setIdeaId(data._id);
        return data._id as string;
      }
    } catch {
      // Failed to create
    } finally {
      setCreating(false);
    }
    return null;
  }, [ideaId]);

  const handleNewDraft = useCallback(async () => {
    // Reset to a fresh blank draft (no API call until save)
    setIdeaId(null);
  }, []);

  return (
    <DraftEditor
      ideaId={ideaId}
      onBack={() => setIdeaId(null)}
      onNewDraft={handleNewDraft}
      createDraftIfNeeded={createDraftIfNeeded}
      isCreatingDraft={creating}
    />
  );
}
