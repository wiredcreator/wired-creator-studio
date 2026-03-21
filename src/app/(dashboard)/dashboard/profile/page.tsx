'use client';

import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '@/components/PageWrapper';

interface ProfileData {
  _id: string;
  email: string;
  name: string;
  role: 'student' | 'coach' | 'admin';
  background: string;
  neurodivergentProfile: string;
  contentGoals: string;
  timezone: string;
  avatarUrl: string;
  createdAt: string;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'UTC', label: 'UTC' },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [background, setBackground] = useState('');
  const [neurodivergentProfile, setNeurodivergentProfile] = useState('');
  const [contentGoals, setContentGoals] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/profile');
      if (!res.ok) throw new Error('Failed to load profile');

      const data = await res.json();
      const user = data.user;

      setProfile(user);
      setName(user.name || '');
      setBackground(user.background || '');
      setNeurodivergentProfile(user.neurodivergentProfile || '');
      setContentGoals(user.contentGoals || '');
      setTimezone(user.timezone || 'America/New_York');
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Could not load your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          background,
          neurodivergentProfile,
          contentGoals,
          timezone,
        }),
      });

      if (!res.ok) throw new Error('Failed to save profile');

      const data = await res.json();
      setProfile(data.user);
      setSuccessMessage('Profile saved successfully.');

      // Clear success message after a few seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <PageWrapper
      title="Profile"
      subtitle="Your account and preferences"
    >
      {/* Loading state */}
      {loading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)]"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-[var(--color-error)] bg-[var(--color-error-light)] p-5 text-center">
          <p className="text-sm text-[var(--color-error)]">{error}</p>
          <button
            onClick={fetchProfile}
            className="mt-2 text-sm font-medium text-[var(--color-accent)] hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Success toast */}
      {successMessage && (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-[var(--color-success)] bg-[var(--color-success-light)] px-5 py-3 text-center">
          <p className="text-sm font-medium text-[var(--color-success)]">
            {successMessage}
          </p>
        </div>
      )}

      {/* Profile form */}
      {profile && !loading && (
        <div className="space-y-8">
          {/* Account Info Section */}
          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-6">
            <h2 className="mb-1 text-base font-semibold text-[var(--color-text-primary)]">
              Account
            </h2>
            <p className="mb-5 text-sm text-[var(--color-text-muted)]">
              Your basic account information
            </p>

            <div className="space-y-5">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text)] placeholder:opacity-50"
                  placeholder="Your name"
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
                  Email
                </label>
                <div className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-secondary)] px-3.5 py-2.5 text-sm text-[var(--color-text)]">
                  {profile.email}
                </div>
              </div>

              {/* Role (read-only) */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
                  Role
                </label>
                <div className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-secondary)] px-3.5 py-2.5 text-sm capitalize text-[var(--color-text)]">
                  {profile.role}
                </div>
              </div>

              {/* Member since */}
              {memberSince && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Member since {memberSince}
                </p>
              )}
            </div>
          </section>

          {/* About You Section */}
          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-6">
            <h2 className="mb-1 text-base font-semibold text-[var(--color-text-primary)]">
              About You
            </h2>
            <p className="mb-5 text-sm text-[var(--color-text-muted)]">
              Help us personalize your experience
            </p>

            <div className="space-y-5">
              {/* Background / Bio */}
              <div>
                <label
                  htmlFor="background"
                  className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
                >
                  Background
                </label>
                <textarea
                  id="background"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text)] placeholder:opacity-50"
                  placeholder="A bit about you and your creator journey..."
                />
              </div>

              {/* Neurodivergent Profile */}
              <div>
                <label
                  htmlFor="neurodivergentProfile"
                  className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
                >
                  About how you work best
                </label>
                <p className="mb-2 text-xs text-[var(--color-text-muted)]">
                  Share anything about how your brain works that helps us support you better.
                </p>
                <textarea
                  id="neurodivergentProfile"
                  value={neurodivergentProfile}
                  onChange={(e) => setNeurodivergentProfile(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text)] placeholder:opacity-50"
                  placeholder="e.g., I focus best in short bursts, visual cues help me stay on track..."
                />
              </div>
            </div>
          </section>

          {/* Goals & Preferences Section */}
          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-6">
            <h2 className="mb-1 text-base font-semibold text-[var(--color-text-primary)]">
              Goals &amp; Preferences
            </h2>
            <p className="mb-5 text-sm text-[var(--color-text-muted)]">
              What you want to achieve and how you like to work
            </p>

            <div className="space-y-5">
              {/* Content Goals */}
              <div>
                <label
                  htmlFor="contentGoals"
                  className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
                >
                  Content Goals
                </label>
                <textarea
                  id="contentGoals"
                  value={contentGoals}
                  onChange={(e) => setContentGoals(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text)] placeholder:opacity-50"
                  placeholder="e.g., Post 3x a week on YouTube, grow to 10k subscribers..."
                />
              </div>

              {/* Timezone */}
              <div>
                <label
                  htmlFor="timezone"
                  className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
                >
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-6 py-2.5 text-sm font-medium text-[var(--color-bg-dark)] transition-opacity hover:opacity-90 disabled:bg-[#555] disabled:text-[#999]"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
