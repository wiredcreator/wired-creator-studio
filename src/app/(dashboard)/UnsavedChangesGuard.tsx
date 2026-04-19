'use client';
import { useGlobalUnsavedChanges } from '@/hooks/useGlobalUnsavedChanges';

export default function UnsavedChangesGuard() {
  useGlobalUnsavedChanges();
  return null;
}
