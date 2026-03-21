'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong.');
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 shadow-[var(--shadow-sm)]">
        <h2 className="mb-4 text-xl font-semibold text-[var(--color-text-primary)]">
          Check your email
        </h2>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          If an account exists with that email, we&apos;ve sent a reset link.
          Please check your inbox and spam folder.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 shadow-[var(--shadow-sm)]">
      <h2 className="mb-2 text-xl font-semibold text-[var(--color-text-primary)]">
        Forgot your password?
      </h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      {error && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning-light)] px-4 py-3 text-sm text-[var(--color-warning)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-light)]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-10 w-full rounded-[var(--radius-md)] bg-[var(--color-accent)] text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
        Remember your password?{" "}
        <Link href="/login" className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
          Log in
        </Link>
      </p>
    </div>
  );
}
