import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import PersonalBaselineClient from './PersonalBaselineClient';

export default async function OnboardingPersonalBaselinePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  await dbConnect();
  const dbUser = await User.findById(session.user.id).lean();

  if (!dbUser) {
    redirect('/login?signout=1');
  }

  // If Content DNA isn't done yet, send them there first
  if (!dbUser.onboardingCompleted) {
    redirect('/onboarding');
  }

  // If personal baseline is already done, go to dashboard
  if (dbUser.personalBaselineCompleted) {
    redirect('/dashboard');
  }

  return <PersonalBaselineClient />;
}
