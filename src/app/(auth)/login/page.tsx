'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const urlError = searchParams.get('error');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSent(false);
    setEmail('');
    setError('');
  }

  if (sent) {
    return (
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1A1A2E', marginBottom: 12, textAlign: 'center' }}>
          Check your inbox
        </h2>
        <p style={{ fontSize: 14, color: '#555770', textAlign: 'center', lineHeight: 1.6, marginBottom: 32 }}>
          If this email is associated with an account, a login link has been sent.
        </p>
        <button
          type="button"
          onClick={resetForm}
          style={{
            display: 'block',
            margin: '0 auto',
            background: 'none',
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
            color: '#4A90D9',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Use a different email
        </button>
      </div>
    );
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
          {loading ? 'Sending...' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
