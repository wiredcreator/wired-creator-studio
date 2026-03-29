import { useEffect } from 'react';

/**
 * Shows the browser's native "Leave site?" dialog when the user tries to
 * close the tab, refresh, or navigate away while there are unsaved changes.
 */
export function useUnsavedChanges(hasChanges: boolean) {
  useEffect(() => {
    if (!hasChanges) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);
}
