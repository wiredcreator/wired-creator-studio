import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ success: false, error: 'missing_token' }, { status: 400 });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    await dbConnect();

    const user = await User.findOne({
      magicLinkToken: hashedToken,
      magicLinkExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'expired' }, { status: 401 });
    }

    // Clear token (one-time use)
    user.magicLinkToken = undefined;
    user.magicLinkExpires = undefined;
    user.emailVerified = true;
    await user.save();

    // Determine redirect
    const redirectTo = !user.onboardingCompleted
      ? '/onboarding'
      : !user.personalBaselineCompleted
        ? '/onboarding/personal-baseline'
        : '/dashboard';

    return NextResponse.json({
      success: true,
      userId: user._id.toString(),
      redirectTo,
    });
  } catch (error) {
    console.error('[MagicLink] Verification error:', error);
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}
