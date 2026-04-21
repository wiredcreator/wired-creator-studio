import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ redirectTo: '/dashboard' });
    }

    await dbConnect();
    const user = await User.findById(session.user.id)
      .select('onboardingCompleted personalBaselineCompleted')
      .lean();

    const redirectTo = !user?.onboardingCompleted
      ? '/onboarding'
      : !user?.personalBaselineCompleted
        ? '/onboarding/personal-baseline'
        : '/dashboard';

    return NextResponse.json({ redirectTo });
  } catch {
    return NextResponse.json({ redirectTo: '/dashboard' });
  }
}
