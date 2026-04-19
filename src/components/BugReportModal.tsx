"use client";

import { useState, useRef, useEffect } from "react";
import ModalPortal from "@/components/ModalPortal";
import VoiceInputWrapper from "@/components/VoiceInputWrapper";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Auto-fill current page URL
  useEffect(() => {
    if (isOpen) {
      setPageUrl(window.location.pathname);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPageUrl("");
    setSeverity("medium");
    setError("");
    setSubmitted(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || !description.trim()) {
      setError("Please fill in both the title and description.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bug-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          pageUrl: pageUrl.trim(),
          severity,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit bug report");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md mx-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
            Report a Bug
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitted ? (
          /* Success state */
          <div className="px-6 py-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-[15px] font-medium text-[var(--color-text-primary)] mb-1">Bug report submitted</p>
            <p className="text-[13px] text-[var(--color-text-secondary)] mb-6">
              Thank you! We&apos;ll look into this and get it fixed.
            </p>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-[13px] font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--color-bg-dark)] hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {error && (
              <div className="px-3 py-2 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/20 text-[13px] text-red-400">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary of the issue"
                maxLength={200}
                className="w-full px-3 py-2 text-[13px] rounded-[var(--radius-md)] bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none ring-0 focus:border-[var(--color-accent)] transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">
                Description
              </label>
              <VoiceInputWrapper onTranscript={(text) => setDescription((prev) => prev ? prev + '\n' + text : text)}>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What happened? What did you expect to happen?"
                  maxLength={2000}
                  rows={4}
                  className="w-full px-3 py-2 text-[13px] rounded-[var(--radius-md)] bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none ring-0 focus:border-[var(--color-accent)] transition-colors resize-none"
                />
              </VoiceInputWrapper>
            </div>

            {/* Page URL */}
            <div>
              <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">
                Page
              </label>
              <input
                type="text"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                placeholder="/dashboard/ideas"
                className="w-full px-3 py-2 text-[13px] rounded-[var(--radius-md)] bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none ring-0 focus:border-[var(--color-accent)] transition-colors"
              />
            </div>

            {/* Severity */}
            <div>
              <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">
                Severity
              </label>
              <div className="flex gap-2">
                {(["low", "medium", "high", "critical"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSeverity(level)}
                    className={`flex-1 px-2 py-1.5 text-[12px] font-medium rounded-[var(--radius-md)] border transition-colors capitalize ${
                      severity === level
                        ? level === "critical"
                          ? "bg-red-600 border-red-600 text-white"
                          : level === "high"
                          ? "bg-orange-600 border-orange-600 text-white"
                          : level === "medium"
                          ? "bg-yellow-600 border-yellow-600 text-white"
                          : "bg-blue-600 border-blue-600 text-white"
                        : "bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 pb-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-[13px] font-medium rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-[13px] font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--color-bg-dark)] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
    </ModalPortal>
  );
}
