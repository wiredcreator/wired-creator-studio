import { Resend } from 'resend';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'Wired Creator <noreply@wiredcreator.com>';

// Brand colors
const BRAND_GOLD = '#DA4114';
const BRAND_GOLD_DARK = '#C23810';
const BRAND_BG = '#0F0F14';
const BRAND_CARD = '#1A1A24';
const BRAND_TEXT = '#E8E8ED';
const BRAND_TEXT_MUTED = '#9E9EAD';
const BRAND_BORDER = '#2A2A38';

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || 'https://app.wiredcreator.com';
}

/** Magic link expiration in milliseconds. Used by both token generation and email copy. */
export const MAGIC_LINK_TTL_MS = 24 * 60 * 60 * 1000;

function formatTtl(ms: number): string {
  const hours = ms / (1000 * 60 * 60);
  if (hours >= 24) {
    const days = Math.round(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  if (hours >= 1) {
    const h = Math.round(hours);
    return `${h} hour${h !== 1 ? 's' : ''}`;
  }
  const mins = Math.round(ms / (1000 * 60));
  return `${mins} minute${mins !== 1 ? 's' : ''}`;
}

/**
 * Wraps email content in a full HTML document with proper structure.
 * Using a complete HTML email template reduces spam/phishing flags because:
 * - Proper DOCTYPE and meta tags signal a legitimate sender
 * - Structured table layout is expected by email clients
 * - Preheader text gives context before opening
 * - Footer with company info satisfies CAN-SPAM requirements
 */
function wrapEmailHtml(options: {
  preheader: string;
  heading: string;
  body: string;
  ctaUrl: string;
  ctaLabel: string;
  footer: string;
}): string {
  const { preheader, heading, body, ctaUrl, ctaLabel, footer } = options;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND_BG}; font-family: 'Atkinson Hyperlegible', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text (hidden, shows in email list preview) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preheader}
    ${'&zwnj;&nbsp;'.repeat(30)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND_BG};">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto;">

          <!-- Logo / Brand -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <span style="font-size: 22px; font-weight: 700; color: ${BRAND_GOLD}; letter-spacing: 0.5px;">Wired Creator</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color: ${BRAND_CARD}; border: 1px solid ${BRAND_BORDER}; border-radius: 12px; padding: 40px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <!-- Heading -->
                <tr>
                  <td style="color: ${BRAND_TEXT}; font-size: 22px; font-weight: 700; padding-bottom: 16px;">
                    ${heading}
                  </td>
                </tr>
                <!-- Body text -->
                <tr>
                  <td style="color: ${BRAND_TEXT_MUTED}; font-size: 16px; line-height: 1.6; padding-bottom: 28px;">
                    ${body}
                  </td>
                </tr>
                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding-bottom: 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="background-color: ${BRAND_GOLD}; border-radius: 8px;">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${ctaUrl}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="17%" fillcolor="${BRAND_GOLD}">
                            <w:anchorlock/>
                            <center style="color:#0F0F14;font-family:sans-serif;font-size:16px;font-weight:bold;">${ctaLabel}</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${ctaUrl}" style="display: inline-block; background-color: ${BRAND_GOLD}; color: ${BRAND_BG}; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; mso-padding-alt: 0; text-align: center;">${ctaLabel}</a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Footer text -->
                <tr>
                  <td style="color: ${BRAND_TEXT_MUTED}; font-size: 13px; line-height: 1.5;">
                    ${footer}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bottom footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="color: ${BRAND_TEXT_MUTED}; font-size: 12px; line-height: 1.5; margin: 0;">
                Wired Creator Studio &bull; Sent by Wired Creator
              </p>
              <p style="color: ${BRAND_TEXT_MUTED}; font-size: 12px; line-height: 1.5; margin: 4px 0 0 0; opacity: 0.7;">
                You received this email because an account action was requested for this address.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
  const resend = getResendClient();
  const resetUrl = `${getBaseUrl()}/reset-password?token=${resetToken}`;

  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not configured, password reset email not sent');
    return false;
  }

  const html = wrapEmailHtml({
    preheader: 'Reset your Wired Creator password',
    heading: 'Password Reset',
    body: 'You requested a password reset for your Wired Creator account. Click the button below to choose a new password.',
    ctaUrl: resetUrl,
    ctaLabel: 'Reset Password',
    footer: 'This link expires in 1 hour. If you didn\'t request this, you can safely ignore this email and your password will remain unchanged.',
  });

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Reset Your Wired Creator Password',
    html,
    text: `Reset your Wired Creator password\n\nYou requested a password reset. Visit this link to choose a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
  });

  return true;
}

export async function sendVerificationEmail(to: string, verificationToken: string): Promise<boolean> {
  const resend = getResendClient();
  const verifyUrl = `${getBaseUrl()}/api/auth/verify-email?token=${verificationToken}`;

  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not configured, verification email not sent');
    return false;
  }

  const html = wrapEmailHtml({
    preheader: 'Verify your email to get started with Wired Creator',
    heading: 'Welcome to Wired Creator!',
    body: 'Please verify your email address to get started with your content creation journey.',
    ctaUrl: verifyUrl,
    ctaLabel: 'Verify Email',
    footer: 'This link expires in 24 hours.',
  });

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Verify Your Wired Creator Email',
    html,
    text: `Welcome to Wired Creator!\n\nPlease verify your email address by visiting this link:\n\n${verifyUrl}\n\nThis link expires in 24 hours.`,
  });

  return true;
}

export async function sendLoginLinkEmail(
  to: string,
  name: string,
  token: string
): Promise<boolean> {
  const resend = getResendClient();
  const loginUrl = `${getBaseUrl()}/verify?token=${token}`;

  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not configured, login link email not sent');
    return false;
  }

  const greeting = name ? `Welcome back, ${name}!` : 'Welcome back!';

  const html = wrapEmailHtml({
    preheader: 'Your secure login link for Wired Creator Studio',
    heading: greeting,
    body: 'Click the button below to securely log in to your Wired Creator Studio account. No password needed.',
    ctaUrl: loginUrl,
    ctaLabel: 'Log in to Wired Creator',
    footer: `This link expires in ${formatTtl(MAGIC_LINK_TTL_MS)} and can only be used once. If you didn\'t request this, you can safely ignore this email.`,
  });

  console.log('[Email] Sending login link to:', to, '| baseUrl:', getBaseUrl());
  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Log in to Wired Creator Studio',
    html,
    text: `${greeting}\n\nLog in to your Wired Creator Studio account by visiting this link:\n\n${loginUrl}\n\nThis link expires in ${formatTtl(MAGIC_LINK_TTL_MS)} and can only be used once. If you didn't request this, you can safely ignore this email.`,
  });

  if (result.error) {
    console.error('[Email] Resend API error:', result.error);
    return false;
  }
  console.log('[Email] Sent successfully, id:', result.data?.id);
  return true;
}
