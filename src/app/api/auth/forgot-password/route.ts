import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { sendPasswordResetEmail } from '@/lib/email';
import { authLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const rl = authLimiter.check(getRateLimitKey(req, 'forgot-password'));
    if (!rl.success) return rateLimitResponse(rl.resetIn);

    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // Generate a secure random token
      const token = crypto.randomBytes(32).toString('hex');

      // Store a hashed version of the token in the database
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      // Send password reset email (falls back to console.log if RESEND_API_KEY not set)
      try {
        await sendPasswordResetEmail(user.email, token);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        console.log('Password reset URL:', `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`);
      }
    }

    // Always return 200 with the same message regardless of whether the email exists
    // This prevents email enumeration attacks
    return NextResponse.json({
      message:
        'If an account exists with that email, we have sent a password reset link.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
