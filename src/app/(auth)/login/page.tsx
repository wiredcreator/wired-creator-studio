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
  const [showPassword, setShowPassword] = useState(false);
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

      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Top right sign up link */}
      <div style={{ position: 'absolute', top: 24, right: 32, fontSize: 13, color: '#8B8D9E' }}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" style={{ color: '#4A90D9', fontWeight: 500, textDecoration: 'underline' }}>
          Sign up
        </Link>
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1A1A2E', marginBottom: 32, textAlign: 'center' }}>
        Sign In
      </h2>

      {/* Google Sign In */}
      <button
        type="button"
        style={{
          width: '100%',
          height: 44,
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.12)',
          backgroundColor: '#FFFFFF',
          fontSize: 14,
          fontWeight: 500,
          color: '#1A1A2E',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 20,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      {/* OR separator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.1)' }} />
        <span style={{ fontSize: 12, color: '#8B8D9E', fontWeight: 500 }}>OR</span>
        <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.1)' }} />
      </div>

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
            User name or email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            }}
          />
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555770', marginBottom: 6 }}>
            Your password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.12)',
                backgroundColor: '#FFFFFF',
                padding: '0 40px 0 14px',
                fontSize: 14,
                color: '#1A1A2E',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#8B8D9E',
                padding: 0,
              }}
            >
              {showPassword ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link
            href="/forgot-password"
            style={{ fontSize: 12, fontWeight: 500, color: '#8B8D9E', textDecoration: 'none' }}
          >
            Forgot your password?
          </Link>
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
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
