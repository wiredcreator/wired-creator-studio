'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import PageWrapper from '@/components/PageWrapper';
import { useTheme } from '@/components/ThemeProvider';

type SettingsTab = 'profile' | 'content-dna' | 'ai-preferences';

interface ProfileData {
  _id: string;
  email: string;
  name: string;
  role: 'student' | 'admin';
  background: string;
  neurodivergentProfile: string;
  contentGoals: string;
  timezone: string;
  avatarUrl: string;
  profileImage: string;
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

const tabs: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'My Profile' },
  { id: 'content-dna', label: 'Content DNA' },
  { id: 'ai-preferences', label: 'AI Preferences' },
];

const CATEGORY_LABELS: Record<string, string> = {
  idea_generation: 'Title Generation',
  script_generation: 'Script Generation',
  brain_dump_processing: 'Brain Dump Processing',
  tone_of_voice: 'Tone of Voice',
  side_quest_generation: 'Side Quest Generation',
  content_pillar_generation: 'Content Pillar Generation',
  personal_baseline_processing: 'Personal Baseline Processing',
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { theme, setTheme } = useTheme();

  // AI Documents state
  const [aiDocs, setAiDocs] = useState<any[]>([]);
  const [aiDocsLoading, setAiDocsLoading] = useState(false);
  const [showAiDocForm, setShowAiDocForm] = useState(false);
  const [editingAiDoc, setEditingAiDoc] = useState<any>(null);
  const [aiDocForm, setAiDocForm] = useState({ title: '', category: '', content: '' });
  const [aiDocSaving, setAiDocSaving] = useState(false);

  // Profile form state
  const [profileImage, setProfileImage] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [background, setBackground] = useState('');
  const [neurodivergentProfile, setNeurodivergentProfile] = useState('');
  const [contentGoals, setContentGoals] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');

  const fetchAiDocs = useCallback(async () => {
    setAiDocsLoading(true);
    try {
      const res = await fetch('/api/ai-documents');
      const data = await res.json();
      setAiDocs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch AI documents:', error);
    } finally {
      setAiDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'ai-preferences') {
      fetchAiDocs();
    }
  }, [activeTab, fetchAiDocs]);

  const handleCreateAiDoc = async () => {
    setAiDocSaving(true);
    try {
      const res = await fetch('/api/ai-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiDocForm),
      });
      if (!res.ok) throw new Error('Failed to create');
      setShowAiDocForm(false);
      setAiDocForm({ title: '', category: '', content: '' });
      fetchAiDocs();
    } catch (err) {
      console.error('Failed to create AI document:', err);
    } finally {
      setAiDocSaving(false);
    }
  };

  const handleUpdateAiDoc = async () => {
    if (!editingAiDoc) return;
    setAiDocSaving(true);
    try {
      const res = await fetch(`/api/ai-documents/${editingAiDoc._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: aiDocForm.title, content: aiDocForm.content }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setEditingAiDoc(null);
      setAiDocForm({ title: '', category: '', content: '' });
      fetchAiDocs();
    } catch (err) {
      console.error('Failed to update AI document:', err);
    } finally {
      setAiDocSaving(false);
    }
  };

  const handleDeleteAiDoc = async (id: string) => {
    if (!confirm('Delete this AI preference? This cannot be undone.')) return;
    try {
      await fetch(`/api/ai-documents/${id}`, { method: 'DELETE' });
      fetchAiDocs();
    } catch (err) {
      console.error('Failed to delete AI document:', err);
    }
  };

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/profile');
      if (!res.ok) throw new Error('Failed to load profile');

      const data = await res.json();
      const user = data.user;

      setProfile(user);
      setProfileImage(user.profileImage || '');
      const nameParts = (user.name || '').split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
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

      const name = [firstName, lastName].filter(Boolean).join(' ');

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          background,
          neurodivergentProfile,
          contentGoals,
          timezone,
          profileImage,
        }),
      });

      if (!res.ok) throw new Error('Failed to save profile');

      const data = await res.json();
      setProfile(data.user);
      setSuccessMessage('Profile saved successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper title="Settings" subtitle="Manage your account, billing, and content configuration">
      {/* Tab bar */}
      <div className="mb-8 flex gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-secondary)] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-[var(--radius-md)] px-4 py-2.5 text-[13px] font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[var(--color-accent)] text-[var(--color-bg-dark)] shadow-[var(--shadow-glow)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Success toast */}
      {successMessage && (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-[var(--color-success)] bg-[var(--color-success-light)] px-5 py-3 text-center">
          <p className="text-sm font-medium text-[var(--color-success)]">
            {successMessage}
          </p>
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

      {/* Tab content */}
      {!loading && activeTab === 'profile' && (
        <ProfileTab
          profile={profile}
          profileImage={profileImage}
          onProfileImageChange={setProfileImage}
          firstName={firstName}
          lastName={lastName}
          background={background}
          neurodivergentProfile={neurodivergentProfile}
          contentGoals={contentGoals}
          timezone={timezone}
          theme={theme}
          saving={saving}
          onFirstNameChange={setFirstName}
          onLastNameChange={setLastName}
          onBackgroundChange={setBackground}
          onNeurodivergentProfileChange={setNeurodivergentProfile}
          onContentGoalsChange={setContentGoals}
          onTimezoneChange={setTimezone}
          onThemeChange={setTheme}
          onSave={handleSave}
        />
      )}

      {!loading && activeTab === 'content-dna' && <ContentDNATab />}

      {activeTab === 'ai-preferences' && (
        <AiPreferencesTab
          aiDocs={aiDocs}
          aiDocsLoading={aiDocsLoading}
          showAiDocForm={showAiDocForm}
          editingAiDoc={editingAiDoc}
          aiDocForm={aiDocForm}
          aiDocSaving={aiDocSaving}
          onShowForm={() => {
            setEditingAiDoc(null);
            setAiDocForm({ title: '', category: '', content: '' });
            setShowAiDocForm(true);
          }}
          onHideForm={() => {
            setShowAiDocForm(false);
            setEditingAiDoc(null);
            setAiDocForm({ title: '', category: '', content: '' });
          }}
          onEdit={(doc: any) => {
            setEditingAiDoc(doc);
            setAiDocForm({ title: doc.title, category: doc.category, content: doc.content });
            setShowAiDocForm(false);
          }}
          onCancelEdit={() => {
            setEditingAiDoc(null);
            setAiDocForm({ title: '', category: '', content: '' });
          }}
          onFormChange={(field: string, value: string) =>
            setAiDocForm((prev) => ({ ...prev, [field]: value }))
          }
          onCreate={handleCreateAiDoc}
          onUpdate={handleUpdateAiDoc}
          onDelete={handleDeleteAiDoc}
        />
      )}
    </PageWrapper>
  );
}

/* ──────────────────────────────────────────── */
/* My Profile Tab                               */
/* ──────────────────────────────────────────── */

function ProfileTab({
  profile,
  profileImage,
  onProfileImageChange,
  firstName,
  lastName,
  background,
  neurodivergentProfile,
  contentGoals,
  timezone,
  theme,
  saving,
  onFirstNameChange,
  onLastNameChange,
  onBackgroundChange,
  onNeurodivergentProfileChange,
  onContentGoalsChange,
  onTimezoneChange,
  onThemeChange,
  onSave,
}: {
  profile: ProfileData | null;
  profileImage: string;
  onProfileImageChange: (v: string) => void;
  firstName: string;
  lastName: string;
  background: string;
  neurodivergentProfile: string;
  contentGoals: string;
  timezone: string;
  theme: string;
  saving: boolean;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onBackgroundChange: (v: string) => void;
  onNeurodivergentProfileChange: (v: string) => void;
  onContentGoalsChange: (v: string) => void;
  onTimezoneChange: (v: string) => void;
  onThemeChange: (v: 'dark' | 'light' | 'system') => void;
  onSave: () => void;
}) {
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');

    if (file.size > 2 * 1024 * 1024) {
      setImageError('Image must be under 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setImageError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onProfileImageChange(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Profile picture + name */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-6">
        <div className="flex items-center gap-5 mb-6">
          {/* Profile image / initials */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative shrink-0 overflow-hidden outline-none"
              style={{ borderRadius: '50%', width: 80, height: 80, minWidth: 80, minHeight: 80 }}
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center text-xl font-bold text-white" style={{ borderRadius: '50%', backgroundColor: 'var(--color-accent)', width: 80, height: 80 }}>
                  {initials}
                </div>
              )}
              {/* Hover overlay with camera icon */}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {!profileImage && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-[var(--color-accent)] hover:underline outline-none"
              >
                Upload photo
              </button>
            )}
            {profileImage && (
              <button
                type="button"
                onClick={() => onProfileImageChange('')}
                className="text-xs font-medium text-[var(--color-error)] hover:underline outline-none"
              >
                Remove
              </button>
            )}
            {imageError && (
              <p className="text-xs text-[var(--color-error)]">{imageError}</p>
            )}
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              {[firstName, lastName].filter(Boolean).join(' ') || 'Your Name'}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">{profile?.email}</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
              className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              placeholder="First name"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => onLastNameChange(e.target.value)}
              className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              placeholder="Last name"
            />
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="mt-5">
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
            Email
          </label>
          <div className="h-11 flex items-center w-full rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-secondary)] px-3.5 text-sm text-[var(--color-text-primary)]">
            {profile?.email}
          </div>
        </div>

      </section>

      {/* About You */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-6">
        <h2 className="mb-1 text-base font-semibold text-[var(--color-text-primary)]">About You</h2>
        <p className="mb-5 text-sm text-[var(--color-text-muted)]">Help us personalize your experience</p>

        <div className="space-y-5">
          <div>
            <label htmlFor="background" className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
              Background
            </label>
            <textarea
              id="background"
              value={background}
              onChange={(e) => onBackgroundChange(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]"
              placeholder="A bit about you and your creator journey..."
            />
          </div>

          <div>
            <label htmlFor="neurodivergentProfile" className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
              About how you work best
            </label>
            <textarea
              id="neurodivergentProfile"
              value={neurodivergentProfile}
              onChange={(e) => onNeurodivergentProfileChange(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]"
              placeholder="e.g., I focus best in short bursts, visual cues help me stay on track..."
            />
          </div>

          <div>
            <label htmlFor="contentGoals" className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
              Content Goals
            </label>
            <textarea
              id="contentGoals"
              value={contentGoals}
              onChange={(e) => onContentGoalsChange(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]"
              placeholder="e.g., Post 3x a week on YouTube, grow to 10k subscribers..."
            />
          </div>

          <div>
            <label htmlFor="timezone" className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
              Timezone
            </label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => onTimezoneChange(e.target.value)}
              className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-6">
        <h2 className="mb-1 text-base font-semibold text-[var(--color-text-primary)]">Appearance</h2>
        <p className="mb-5 text-sm text-[var(--color-text-muted)]">Choose your preferred theme</p>
        <div className="flex gap-2">
          {([
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
            { value: 'system', label: 'System' },
          ] as const).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onThemeChange(option.value)}
              className={`rounded-[var(--radius-md)] border px-5 py-2 text-sm font-medium transition-colors ${
                theme === option.value
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-bg-dark)]'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={async () => {
            try { await signOut({ redirect: false }); } catch {}
            window.location.href = '/login';
          }}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-error)] hover:text-[var(--color-error)]"
        >
          Log Out
        </button>
        <button
          onClick={onSave}
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
  );
}

/* ──────────────────────────────────────────── */
/* Billing Tab                                  */
/* ──────────────────────────────────────────── */

function BillingTab() {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Current card */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-6">
        <h2 className="mb-1 text-base font-semibold text-[var(--color-text-primary)]">Payment Method</h2>
        <p className="mb-5 text-sm text-[var(--color-text-muted)]">Manage your billing information</p>

        {/* Card display */}
        <div className="mb-6 flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-5 py-4">
          <div className="flex h-10 w-14 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)] text-xs font-bold text-[var(--color-text-primary)]">
            VISA
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Visa ending in 4558</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Expires 12/27</p>
          </div>
        </div>

        {/* Billing form */}
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="billingFirstName" className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
                First Name
              </label>
              <input
                id="billingFirstName"
                type="text"
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                placeholder="First name"
              />
            </div>
            <div>
              <label htmlFor="billingLastName" className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
                Last Name
              </label>
              <input
                id="billingLastName"
                type="text"
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cardNumber" className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
              Card Number
            </label>
            <input
              id="cardNumber"
              type="text"
              className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              placeholder="1234 5678 9012 3456"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="expDate" className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
                Exp Date
              </label>
              <input
                id="expDate"
                type="text"
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                placeholder="MM/YY"
              />
            </div>
            <div>
              <label htmlFor="cvv" className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
                CVV
              </label>
              <input
                id="cvv"
                type="text"
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                placeholder="123"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-6 py-2.5 text-sm font-medium text-[var(--color-bg-dark)] transition-opacity hover:opacity-90">
            Update Payment Method
          </button>
        </div>
      </section>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/* Content DNA Tab                              */
/* ──────────────────────────────────────────── */

const contentDNACards = [
  {
    title: 'Tone of Voice Guide',
    description: 'Your unique communication style and brand voice guidelines.',
    href: '/dashboard/brand-brain',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
      </svg>
    ),
    available: true,
  },
  {
    title: 'Content Pillars',
    description: 'The core topics and themes that define your content strategy.',
    href: '/dashboard/brand-brain',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
      </svg>
    ),
    available: true,
  },
  {
    title: 'YouTube Script Guide',
    description: 'Templates and frameworks for writing engaging YouTube scripts.',
    href: null,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    available: false,
  },
  {
    title: 'YouTube Script Examples',
    description: 'Real examples of high-performing scripts for reference.',
    href: null,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    available: false,
  },
  {
    title: 'Content DNA Survey',
    description: 'Discover your unique content creation style and preferences.',
    href: null,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
      </svg>
    ),
    available: false,
  },
  {
    title: 'Personal Baseline Survey',
    description: 'Your life context, schedule, patterns, and wellness baseline.',
    href: '/dashboard/personal-baseline',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
    available: true,
  },
];

/* ──────────────────────────────────────────── */
/* AI Preferences Tab                           */
/* ──────────────────────────────────────────── */

function AiPreferencesTab({
  aiDocs,
  aiDocsLoading,
  showAiDocForm,
  editingAiDoc,
  aiDocForm,
  aiDocSaving,
  onShowForm,
  onHideForm,
  onEdit,
  onCancelEdit,
  onFormChange,
  onCreate,
  onUpdate,
  onDelete,
}: {
  aiDocs: any[];
  aiDocsLoading: boolean;
  showAiDocForm: boolean;
  editingAiDoc: any;
  aiDocForm: { title: string; category: string; content: string };
  aiDocSaving: boolean;
  onShowForm: () => void;
  onHideForm: () => void;
  onEdit: (doc: any) => void;
  onCancelEdit: () => void;
  onFormChange: (field: string, value: string) => void;
  onCreate: () => void;
  onUpdate: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">AI Preferences</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Customize how AI generates content for you</p>
          </div>
          {!showAiDocForm && !editingAiDoc && (
            <button
              onClick={onShowForm}
              className="shrink-0 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-opacity hover:opacity-90"
            >
              Add Preference
            </button>
          )}
        </div>

        {/* Create form */}
        {showAiDocForm && (
          <div className="mt-6 space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">New AI Preference</h3>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">Title</label>
              <input
                type="text"
                value={aiDocForm.title}
                onChange={(e) => onFormChange('title', e.target.value)}
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]"
                placeholder="e.g. Avoid these topics"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">Category</label>
              <select
                value={aiDocForm.category}
                onChange={(e) => onFormChange('category', e.target.value)}
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors focus:border-[var(--color-accent)]"
              >
                <option value="">Select a category</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">Content</label>
              <textarea
                value={aiDocForm.content}
                onChange={(e) => onFormChange('content', e.target.value)}
                rows={5}
                className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]"
                placeholder="Add any preferences for how your content should be generated, e.g. language, style, topics to avoid..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onHideForm}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
              >
                Cancel
              </button>
              <button
                onClick={onCreate}
                disabled={aiDocSaving || !aiDocForm.title || !aiDocForm.category || !aiDocForm.content}
                className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-opacity hover:opacity-90 disabled:bg-[#555] disabled:text-[#999]"
              >
                {aiDocSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </span>
                ) : 'Save'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Loading skeletons */}
      {aiDocsLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)]"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!aiDocsLoading && aiDocs.length === 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">No AI preferences set yet</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Add preferences to customize how AI generates content for you.</p>
        </div>
      )}

      {/* AI Doc cards */}
      {!aiDocsLoading && aiDocs.length > 0 && (
        <div className="space-y-4">
          {aiDocs.map((doc) => (
            <div key={doc._id} className="rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-5">
              {editingAiDoc?._id === doc._id ? (
                /* Edit form inline */
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Edit Preference</h3>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">Title</label>
                    <input
                      type="text"
                      value={aiDocForm.title}
                      onChange={(e) => onFormChange('title', e.target.value)}
                      className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
                      Category
                      <span className="ml-1.5 text-[var(--color-text-muted)]">(cannot be changed)</span>
                    </label>
                    <div className="h-11 flex items-center rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-secondary)] px-3.5 text-sm text-[var(--color-text-secondary)]">
                      {CATEGORY_LABELS[doc.category] || doc.category}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">Content</label>
                    <textarea
                      value={aiDocForm.content}
                      onChange={(e) => onFormChange('content', e.target.value)}
                      rows={5}
                      className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]"
                      placeholder="Add any preferences for how your content should be generated, e.g. language, style, topics to avoid..."
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={onCancelEdit}
                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onUpdate}
                      disabled={aiDocSaving || !aiDocForm.title || !aiDocForm.content}
                      className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-opacity hover:opacity-90 disabled:bg-[#555] disabled:text-[#999]"
                    >
                      {aiDocSaving ? (
                        <span className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Saving...
                        </span>
                      ) : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Card view */
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{doc.title}</h3>
                        <span className="rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2.5 py-0.5 text-[11px] font-medium text-white">
                          {CATEGORY_LABELS[doc.category] || doc.category}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] line-clamp-3 whitespace-pre-line">
                        {doc.content}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => onEdit(doc)}
                        className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2 text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        title="Edit"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDelete(doc._id)}
                        className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2 text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-error)] hover:text-[var(--color-error)]"
                        title="Delete"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContentDNATab() {
  return (
    <div className="animate-fadeIn">
      <div className="grid gap-4 sm:grid-cols-2">
        {contentDNACards.map((card) => {
          const content = (
            <div
              className={`group flex flex-col gap-4 rounded-[var(--radius-lg)] border bg-[var(--color-bg-card)] p-6 transition-all ${
                card.available
                  ? 'border-[var(--color-border)] hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-glow)] cursor-pointer'
                  : 'border-[var(--color-border-light)]'
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] transition-colors ${
                card.available
                  ? 'bg-[var(--color-bg-elevated)] text-[var(--color-accent)] group-hover:bg-[var(--color-accent)] group-hover:text-[var(--color-bg-dark)]'
                  : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'
              }`}>
                {card.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{card.title}</h3>
                  {!card.available && (
                    <span className="rounded-[var(--radius-full)] bg-[var(--color-bg-elevated)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  {card.description}
                </p>
              </div>
              {card.available && (
                <div className="mt-auto flex items-center gap-1 text-xs font-medium text-[var(--color-accent)]">
                  Open
                  <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              )}
            </div>
          );

          if (card.available && card.href) {
            return (
              <Link key={card.title} href={card.href}>
                {content}
              </Link>
            );
          }

          return <div key={card.title}>{content}</div>;
        })}
      </div>
    </div>
  );
}
