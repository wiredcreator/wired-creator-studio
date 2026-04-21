import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { checkPaidCustomer } from '@/lib/stripe';
import { sendLoginLinkEmail, MAGIC_LINK_TTL_MS } from '@/lib/email';
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
    console.log('[MagicLink] Request for:', normalizedEmail);
    await dbConnect();

    // Check for existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    const isAdmin = existingUser?.role === 'admin';
    console.log('[MagicLink] Existing user:', !!existingUser, '| isAdmin:', isAdmin);

    if (existingUser) {
      // Existing users skip Stripe entirely
      if (isAdmin) {
        console.log('[MagicLink] Admin bypass: skipping Stripe check');
      } else {
        console.log('[MagicLink] Existing account bypass: skipping Stripe check');
      }

      // Generate token
      const plainToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
      const expires = new Date(Date.now() + MAGIC_LINK_TTL_MS);

      existingUser.magicLinkToken = hashedToken;
      existingUser.magicLinkExpires = expires;
      await existingUser.save();
      console.log('[MagicLink] Token saved for existing user, sending email...');
      const emailSent = await sendLoginLinkEmail(normalizedEmail, existingUser.name, plainToken);
      console.log('[MagicLink] Email sent:', emailSent);
    } else {
      // New user: require Stripe payment before account creation
      const stripeResult = await checkPaidCustomer(normalizedEmail);
      const customerName = stripeResult.customerName || '';
      const customerId = stripeResult.customerId || '';
      console.log('[MagicLink] New user signup:', normalizedEmail, '| Stripe:', stripeResult.isPaid ? 'paid' : 'no payment');

      if (!stripeResult.isPaid) {
        // No payment found; return same generic message to avoid email enumeration
        return NextResponse.json({ message: RESPONSE_MESSAGE });
      }

      // Generate token
      const plainToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
      const expires = new Date(Date.now() + MAGIC_LINK_TTL_MS);

      // Auto-create new user
      const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
      const newUser = await User.create({
        email: normalizedEmail,
        password: randomPassword,
        name: customerName || normalizedEmail.split('@')[0],
        role: 'student',
        magicLinkToken: hashedToken,
        magicLinkExpires: expires,
        stripeCustomerId: customerId || undefined,
        subscriptionTier: 'full_program',
        accessStatus: 'active',
        emailVerified: false,
        onboardingCompleted: false,
        personalBaselineCompleted: false,
      });
      console.log('[MagicLink] New user created, sending email...');
      const emailSent = await sendLoginLinkEmail(normalizedEmail, newUser.name, plainToken);
      console.log('[MagicLink] Email sent:', emailSent);
    }

    return NextResponse.json({ message: RESPONSE_MESSAGE });
  } catch (error) {
    console.error('[MagicLink] Error:', error);
    return NextResponse.json({ message: RESPONSE_MESSAGE });
  }
}
