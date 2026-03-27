import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import ContentDNAQuestionnaire from '@/components/onboarding/ContentDNAQuestionnaire';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const params = await searchParams;
  const forceForm = params.form !== undefined;

  // Check if the user exists and has completed onboarding
  await dbConnect();
  const dbUser = await User.findById(session.user.id).lean();

  // User deleted (e.g. after db nuke) — force re-login
  if (!dbUser) {
    redirect('/login?signout=1');
  }

  // If both onboarding steps are done, go to dashboard
  if (dbUser.onboardingCompleted && dbUser.personalBaselineCompleted && !forceForm) {
    redirect('/dashboard');
  }

  // If Content DNA is done but Personal Baseline isn't, skip to that step
  if (dbUser.onboardingCompleted && !dbUser.personalBaselineCompleted && !forceForm) {
    redirect('/onboarding/personal-baseline');
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center px-4 py-12 sm:py-16"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <p
          className="text-sm font-medium tracking-wide uppercase mb-2"
          style={{ color: 'var(--color-accent)' }}
        >
          Content DNA Questionnaire
        </p>
        <h1
          className="text-2xl sm:text-3xl font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Welcome to Wired Creator Studio
        </h1>
        <p
          className="text-base mt-2 max-w-lg mx-auto"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Answer a few questions so we can build your personalized content experience.
          Take your time - there is no rush.
        </p>
      </div>

      {/* Questionnaire */}
      <div className="w-full max-w-2xl">
        <ContentDNAQuestionnaire />
      </div>
    </main>
  );
}
