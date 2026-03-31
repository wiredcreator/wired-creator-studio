import { Resend } from 'resend';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'Wired Creator <noreply@wiredcreator.com>';

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
  const resend = getResendClient();
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not configured, password reset email not sent');
    return false;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Reset Your Wired Creator Password',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a2e; margin-bottom: 16px;">Password Reset</h2>
        <p style="color: #444; line-height: 1.6;">You requested a password reset for your Wired Creator account.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">Reset Password</a>
        </p>
        <p style="color: #888; font-size: 14px; line-height: 1.5;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  return true;
}

export async function sendVerificationEmail(to: string, verificationToken: string): Promise<boolean> {
  const resend = getResendClient();
  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${verificationToken}`;

  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not configured, verification email not sent');
    return false;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Verify Your Wired Creator Email',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a2e; margin-bottom: 16px;">Welcome to Wired Creator!</h2>
        <p style="color: #444; line-height: 1.6;">Please verify your email address to get started with your content creation journey.</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">Verify Email</a>
        </p>
        <p style="color: #888; font-size: 14px; line-height: 1.5;">This link expires in 24 hours.</p>
      </div>
    `,
  });

  return true;
}

export async function sendLoginLinkEmail(
  to: string,
  name: string,
  token: string
): Promise<boolean> {
  const resend = getResendClient();
  const loginUrl = `${process.env.NEXTAUTH_URL}/verify?token=${token}`;

  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not configured, login link email not sent');
    return false;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Log in to Wired Creator Studio',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a2e; margin-bottom: 16px;">Welcome back${name ? `, ${name}` : ''}!</h2>
        <p style="color: #444; line-height: 1.6;">Click below to log in to your Wired Creator Studio account.</p>
        <p style="margin: 24px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">Log In to Wired Creator</a>
        </p>
        <p style="color: #888; font-size: 14px; line-height: 1.5;">This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  return true;
}
