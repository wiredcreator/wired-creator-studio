'use client';

import { useState, useEffect } from 'react';
import PageWrapper from '@/components/PageWrapper';
import PersonalBaselineQuestionnaire from '@/components/onboarding/PersonalBaselineQuestionnaire';

export default function PersonalBaselinePage() {
  const [existingData, setExistingData] = useState<
    { questionId: string; question: string; answer: string }[] | null
  >(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExisting() {
      try {
        const res = await fetch('/api/onboarding/personal-baseline');
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data?.responses) {
            setExistingData(result.data.responses);
          }
        }
      } catch {
        // Silently fail — user will just start fresh
      } finally {
        setLoading(false);
      }
    }
    fetchExisting();
  }, []);

  if (loading) {
    return (
      <PageWrapper title="Personal Baseline" subtitle="Loading your survey...">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)]"
            />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center px-4 py-12 sm:py-16"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="text-center mb-6">
        <p
          className="text-sm font-medium tracking-wide uppercase mb-2"
          style={{ color: 'var(--color-accent)' }}
        >
          Personal Baseline Survey
        </p>
        <h1
          className="text-2xl sm:text-3xl font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {existingData ? 'Update Your Baseline' : 'Tell Us About Your Life'}
        </h1>
        <p
          className="text-base mt-2 max-w-lg mx-auto"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {existingData
            ? 'Review and update your answers anytime your situation changes.'
            : 'This helps us build a content system around your actual life, not an imaginary one.'}
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <PersonalBaselineQuestionnaire existingData={existingData} />
      </div>
    </main>
  );
}
