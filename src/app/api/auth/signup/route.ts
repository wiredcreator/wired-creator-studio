import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { checkPaidCustomer } from '@/lib/stripe';
import { authLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const rl = authLimiter.check(getRateLimitKey(req, 'signup'));
    if (!rl.success) return rateLimitResponse(rl.resetIn);

    const { name, email, password } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    // Check for free signup bypass or require Stripe payment
    const freeSignups = process.env.ALLOW_FREE_SIGNUPS === 'true';

    if (!freeSignups) {
      const stripeResult = await checkPaidCustomer(normalizedEmail);
      if (!stripeResult.isPaid) {
        return NextResponse.json(
          { error: 'No active subscription found for this email. Please contact your coach to get access.' },
          { status: 403 }
        );
      }
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      name: name.trim(),
      role: 'student',
      subscriptionTier: 'full_program',
      accessStatus: 'active',
      emailVerified: false,
      onboardingCompleted: false,
      personalBaselineCompleted: false,
    });

    return NextResponse.json({ message: 'Account created. You can now sign in.' }, { status: 201 });
  } catch (error) {
    console.error('[Signup] Error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
