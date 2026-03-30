import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { checkPaidCustomer } from '@/lib/stripe';
import { sendLoginLinkEmail } from '@/lib/email';
import { authLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';

const RESPONSE_MESSAGE = 'If this email is associated with an account, a login link has been sent. Check your inbox.';

export async function POST(req: NextRequest) {
  try {
    const rl = authLimiter.check(getRateLimitKey(req, 'magic-link'));
    if (!rl.success) return rateLimitResponse(rl.resetIn);

    const { email } = await req.json();
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ message: RESPONSE_MESSAGE });
    }

    const normalizedEmail = email.toLowerCase().trim();
    await dbConnect();

    // Check if existing admin (skip Stripe)
    const existingUser = await User.findOne({ email: normalizedEmail });
    const isAdmin = existingUser?.role === 'admin';

    // Check Stripe (skipped for admins)
    let customerName = '';
    let customerId = '';
    if (!isAdmin) {
      const stripeResult = await checkPaidCustomer(normalizedEmail);
      if (!stripeResult.isPaid) {
        return NextResponse.json({ message: RESPONSE_MESSAGE });
      }
      customerName = stripeResult.customerName || '';
      customerId = stripeResult.customerId || '';
    }

    // Generate token
    const plainToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    if (existingUser) {
      existingUser.magicLinkToken = hashedToken;
      existingUser.magicLinkExpires = expires;
      if (customerId && !existingUser.stripeCustomerId) {
        existingUser.stripeCustomerId = customerId;
      }
      await existingUser.save();
      await sendLoginLinkEmail(normalizedEmail, existingUser.name, plainToken);
    } else {
      // Auto-create new user
      const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
      const newUser = await User.create({
        email: normalizedEmail,
        password: randomPassword,
        name: customerName || normalizedEmail.split('@')[0],
        role: 'student',
        magicLinkToken: hashedToken,
        magicLinkExpires: expires,
        stripeCustomerId: customerId,
        emailVerified: false,
        onboardingCompleted: false,
        personalBaselineCompleted: false,
      });
      await sendLoginLinkEmail(normalizedEmail, newUser.name, plainToken);
    }

    return NextResponse.json({ message: RESPONSE_MESSAGE });
  } catch (error) {
    console.error('[MagicLink] Error:', error);
    return NextResponse.json({ message: RESPONSE_MESSAGE });
  }
}
