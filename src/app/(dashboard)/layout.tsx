import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Sidebar from '@/components/Sidebar';
import BrainDumpFAB from '@/components/BrainDumpFAB';
import DashboardHeader from '@/components/DashboardHeader';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // If not authenticated, the middleware already handles redirect to /login.
  // This is a safety fallback.
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Fetch the user from MongoDB to check onboarding status
  await dbConnect();
  const dbUser = await User.findById(session.user.id).lean();

  // User was deleted (e.g. after db nuke) but JWT still valid — force re-login
  if (!dbUser) {
    redirect('/login?signout=1');
  }

  const userName = dbUser.name || session.user.name || 'User';
  const userRole = (dbUser?.role || session.user.role || 'student') as 'student' | 'coach' | 'admin';
  const onboardingCompleted = dbUser?.onboardingCompleted ?? false;
  const personalBaselineCompleted = dbUser?.personalBaselineCompleted ?? false;

  // Redirect to the appropriate onboarding step if not fully completed.
  // The onboarding pages live outside this layout group, so no redirect loop.
  if (!onboardingCompleted) {
    redirect('/onboarding');
  }

  if (!personalBaselineCompleted) {
    redirect('/onboarding/personal-baseline');
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Sidebar userName={userName} userRole={userRole} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <BrainDumpFAB />
    </div>
  );
}
