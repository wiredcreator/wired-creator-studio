'use client';

import { useState } from 'react';
import { ContentDNAFormData } from '@/types/onboarding';

interface NicheStepProps {
  data: ContentDNAFormData;
  onChange: (updates: Partial<ContentDNAFormData>) => void;
}

export default function NicheStep({ data, onChange }: NicheStepProps) {
  const [topicInput, setTopicInput] = useState('');

  const addTopic = () => {
    const trimmed = topicInput.trim();
    if (trimmed && data.keyTopics.length < 5 && !data.keyTopics.includes(trimmed)) {
      onChange({ keyTopics: [...data.keyTopics, trimmed] });
      setTopicInput('');
    }
  };

  const removeTopic = (topic: string) => {
    onChange({ keyTopics: data.keyTopics.filter((t) => t !== topic) });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTopic();
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Your space
        </h2>
        <p
          className="text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          What world does your content live in?
        </p>
      </div>

      {/* Industry */}
      <div className="space-y-2">
        <label
          htmlFor="industry"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Your industry or niche <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <input
          id="industry"
          type="text"
          value={data.industry}
          onChange={(e) => onChange({ industry: e.target.value })}
          placeholder="E.g., Health & Wellness, Real Estate, Personal Finance..."
          className="w-full px-4 py-3 text-base border transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
            borderRadius: 'var(--radius-md)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
        />
      </div>

      {/* Key Topics */}
      <div className="space-y-2">
        <label
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Key topics you cover <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Add 3-5 core topics. These become your content pillars. Press Enter or click Add.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="E.g., Gut health"
            disabled={data.keyTopics.length >= 5}
            className="flex-1 px-4 py-3 text-base border transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
              borderRadius: 'var(--radius-md)',
              opacity: data.keyTopics.length >= 5 ? 0.5 : 1,
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
          />
          <button
            type="button"
            onClick={addTopic}
            disabled={!topicInput.trim() || data.keyTopics.length >= 5}
            className="px-5 py-3 text-sm font-medium transition-all duration-200 cursor-pointer"
            style={{
              backgroundColor:
                !topicInput.trim() || data.keyTopics.length >= 5
                  ? 'var(--color-border-light)'
                  : 'var(--color-accent)',
              color:
                !topicInput.trim() || data.keyTopics.length >= 5
                  ? 'var(--color-text-muted)'
                  : 'white',
              borderRadius: 'var(--radius-md)',
              border: 'none',
            }}
          >
            Add
          </button>
        </div>

        {/* Topic tags */}
        {data.keyTopics.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {data.keyTopics.map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium"
                style={{
                  backgroundColor: 'var(--color-accent-light)',
                  color: 'var(--color-accent-hover)',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {topic}
                <button
                  type="button"
                  onClick={() => removeTopic(topic)}
                  className="ml-1 hover:opacity-70 transition-opacity cursor-pointer"
                  style={{ color: 'var(--color-accent-hover)', border: 'none', background: 'none', padding: 0 }}
                  aria-label={`Remove ${topic}`}
                >
                  &#10005;
                </button>
              </span>
            ))}
          </div>
        )}

        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {data.keyTopics.length}/5 topics added
          {data.keyTopics.length < 3 && ' (minimum 3)'}
        </p>
      </div>
    </div>
  );
}
