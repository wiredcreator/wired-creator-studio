'use client';

import { useRouter } from 'next/navigation';
import PersonalBaselineQuestionnaire from '@/components/onboarding/PersonalBaselineQuestionnaire';

export default function PersonalBaselineClient() {
  const router = useRouter();

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
          One More Step - Tell Us About Your Life
        </h1>
        <p
          className="text-base mt-2 max-w-lg mx-auto"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          This helps us build a content system around your actual life, not an imaginary one.
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <PersonalBaselineQuestionnaire
          onComplete={() => {
            // Fire-and-forget compile — both questionnaires are now complete
            fetch('/api/compile-profile', { method: 'POST' });
            router.push('/dashboard');
          }}
        />
      </div>
    </main>
  );
}
