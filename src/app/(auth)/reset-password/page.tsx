'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 shadow-[var(--shadow-sm)]">
        <h2 className="mb-4 text-xl font-semibold text-[var(--color-text-primary)]">
          Invalid reset link
        </h2>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          This password reset link is invalid. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong.');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 shadow-[var(--shadow-sm)]">
        <h2 className="mb-4 text-xl font-semibold text-[var(--color-text-primary)]">
          Password reset!
        </h2>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          Your password has been updated. You can now log in with your new password.
        </p>
        <Link
          href="/login"
          className="inline-block h-10 w-full rounded-[var(--radius-md)] bg-[var(--color-accent)] text-center text-sm font-medium leading-10 text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 shadow-[var(--shadow-sm)]">
      <h2 className="mb-2 text-xl font-semibold text-[var(--color-text-primary)]">
        Set a new password
      </h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Enter your new password below.
      </p>

      {error && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning-light)] px-4 py-3 text-sm text-[var(--color-warning)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
            New password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-light)]"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-light)]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-10 w-full rounded-[var(--radius-md)] bg-[var(--color-accent)] text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          {loading ? 'Resetting...' : 'Reset password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 shadow-[var(--shadow-sm)]">
          <p className="text-sm text-[var(--color-text-muted)]">Loading...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
