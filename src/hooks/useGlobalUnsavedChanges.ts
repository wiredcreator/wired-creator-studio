'use client';
import { useEffect, useRef } from 'react';

/**
 * Watches all textareas on the page for unsaved content.
 * Triggers the browser's "Leave site?" dialog if any textarea
 * has content that differs from its last-known clean state.
 */
export function useGlobalUnsavedChanges() {
  const cleanValues = useRef<Map<HTMLTextAreaElement, string>>(new Map());

  useEffect(() => {
    const checkDirty = () => {
      const textareas = document.querySelectorAll('textarea');
      for (const ta of textareas) {
        const clean = cleanValues.current.get(ta);
        if (clean === undefined) {
          cleanValues.current.set(ta, ta.value);
        } else if (ta.value !== clean) {
          return true;
        }
      }
      return false;
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (checkDirty()) {
        e.preventDefault();
      }
    };

    const handleSubmit = () => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(ta => cleanValues.current.set(ta, ta.value));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('submit', handleSubmit);

    const interval = setInterval(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(ta => {
        if (!cleanValues.current.has(ta)) {
          cleanValues.current.set(ta, ta.value);
        }
      });
      for (const ta of cleanValues.current.keys()) {
        if (!document.contains(ta)) {
          cleanValues.current.delete(ta);
        }
      }
    }, 2000);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('submit', handleSubmit);
      clearInterval(interval);
    };
  }, []);
}
