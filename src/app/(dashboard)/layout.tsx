import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Sidebar from '@/components/Sidebar';

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

  // Redirect to onboarding if not completed.
  // The onboarding page lives outside this layout group, so no redirect loop.
  if (!onboardingCompleted) {
    redirect('/onboarding');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-primary)]">
      <Sidebar userName={userName} userRole={userRole} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
