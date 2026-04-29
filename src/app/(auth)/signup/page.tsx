'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setLoading(false);
        return;
      }

      // Redirect to login with success message
      router.push('/login?signup=success');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1A1A2E', marginBottom: 32, textAlign: 'center' }}>
        Create Account
      </h2>

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
          <label htmlFor="name" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555770', marginBottom: 6 }}>
            Full name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
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
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Link
          href="/login"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#4A90D9',
            textDecoration: 'none',
          }}
        >
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  );
}
