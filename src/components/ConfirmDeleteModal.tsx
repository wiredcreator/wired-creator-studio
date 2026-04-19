'use client';

import ModalPortal from '@/components/ModalPortal';

interface ConfirmDeleteModalProps {
  /** The type of item being deleted, e.g. "section", "resource", "session" */
  itemType: string;
  /** The name/title of the item being deleted (shown in quotes) */
  itemName?: string;
  /** Whether the delete is in progress */
  isDeleting?: boolean;
  /** Called when the user confirms deletion */
  onConfirm: () => void;
  /** Called when the user cancels */
  onCancel: () => void;
}

export default function ConfirmDeleteModal({
  itemType,
  itemName,
  isDeleting = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
        onClick={() => { if (!isDeleting) onCancel(); }}
      >
        <div
          className="mx-4 w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-[var(--shadow-lg)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-error-light)]">
            <svg className="h-6 w-6 text-[var(--color-error)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </div>

          <h3 className="mb-2 text-center text-lg font-bold text-[var(--color-text-primary)]">
            Delete this {itemType}?
          </h3>

          <p className="mb-6 text-center text-sm text-[var(--color-text-secondary)]">
            {itemName
              ? <>&ldquo;{itemName}&rdquo; will be permanently removed.</>
              : <>This {itemType} will be permanently removed.</>
            }
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-error)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {isDeleting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Deleting...
                </span>
              ) : (
                `Delete ${itemType}`
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
