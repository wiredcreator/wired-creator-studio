'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-sign-out stale sessions (e.g. after db nuke)
  useEffect(() => {
    if (searchParams.get('signout')) {
      signOut({ redirect: false }).then(() => {
        router.replace('/login');
      });
    }
  }, [searchParams, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password.');
        setLoading(false);
        return;
      }

      router.push('/dashboard/today');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl mb-1 text-[var(--color-text-primary)]">
        Welcome back
      </h2>
      <p className="mb-8 text-[14px] text-[var(--color-text-muted)]">
        Sign in to your creative workspace.
      </p>

      {error && (
        <div className="mb-5 rounded-[var(--radius-md)] border border-[var(--color-error)]/20 bg-[var(--color-error-light)] px-4 py-3 text-[13px] text-[var(--color-error)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3.5 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3.5 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-[12px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
          >
            Forgot your password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[14px] font-semibold text-[var(--color-bg-dark)] transition-all hover:brightness-110 disabled:opacity-50 shadow-[var(--shadow-glow)]"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-8 text-center text-[13px] text-[var(--color-text-muted)]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-[var(--color-accent)] hover:brightness-110 transition-all">
          Get started
        </Link>
      </p>
    </div>
  );
}
