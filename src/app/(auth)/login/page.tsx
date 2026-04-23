'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const urlError = searchParams.get('error');

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

      const redirectRes = await fetch('/api/auth/post-login-redirect');
      const { redirectTo } = await redirectRes.json();
      router.push(redirectTo || '/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1A1A2E', marginBottom: 32, textAlign: 'center' }}>
        Sign In
      </h2>

      {urlError === 'expired' && (
        <div style={{
          marginBottom: 20,
          borderRadius: 12,
          border: '1px solid rgba(220,53,53,0.2)',
          backgroundColor: 'rgba(220,53,53,0.05)',
          padding: '12px 16px',
          fontSize: 13,
          color: '#DC3535',
        }}>
          This login link has expired. Please request a new one.
        </div>
      )}

      {urlError === 'invalid' && (
        <div style={{
          marginBottom: 20,
          borderRadius: 12,
          border: '1px solid rgba(220,53,53,0.2)',
          backgroundColor: 'rgba(220,53,53,0.05)',
          padding: '12px 16px',
          fontSize: 13,
          color: '#DC3535',
        }}>
          This login link is invalid. Please request a new one.
        </div>
      )}

      {error && (
        <div style={{
          marginBottom: 20,
          borderRadius: 12,
          border: '1px solid rgba(220,53,53,0.2)',
          backgroundColor: 'rgba(220,53,53,0.05)',
          padding: '12px 16px',
          fontSize: 13,
          color: '#DC3535',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555770', marginBottom: 6 }}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: '100%',
              height: 44,
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.12)',
              backgroundColor: '#FFFFFF',
              padding: '0 14px',
              fontSize: 14,
              color: '#1A1A2E',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555770', marginBottom: 6 }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            style={{
              width: '100%',
              height: 44,
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.12)',
              backgroundColor: '#FFFFFF',
              padding: '0 14px',
              fontSize: 14,
              color: '#1A1A2E',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            height: 44,
            width: '100%',
            borderRadius: 12,
            backgroundColor: '#E07850',
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Link
          href="/forgot-password"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#4A90D9',
            textDecoration: 'none',
          }}
        >
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
