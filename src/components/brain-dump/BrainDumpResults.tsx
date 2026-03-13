'use client';

import { useState } from 'react';

interface ContentIdea {
  title: string;
  description: string;
  contentPillar: string;
  angle: string;
}

interface Story {
  summary: string;
  fullText: string;
}

interface Insight {
  content: string;
  tags: string[];
}

interface Theme {
  theme: string;
  contentPillar: string;
  occurrences: number;
}

interface BrainDumpResultsProps {
  contentIdeas: ContentIdea[];
  stories: Story[];
  insights: Insight[];
  themes: Theme[];
  onSelectIdeas?: (selectedIdeas: ContentIdea[]) => void;
}

export default function BrainDumpResults({
  contentIdeas,
  stories,
  insights,
  themes,
  onSelectIdeas,
}: BrainDumpResultsProps) {
  const [selectedIdeas, setSelectedIdeas] = useState<Set<number>>(new Set());
  const [expandedStories, setExpandedStories] = useState<Set<number>>(new Set());

  function toggleIdea(index: number) {
    setSelectedIdeas((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      if (onSelectIdeas) {
        onSelectIdeas(contentIdeas.filter((_, i) => next.has(i)));
      }
      return next;
    });
  }

  function toggleStory(index: number) {
    setExpandedStories((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Content Ideas */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Content Ideas
          </h3>
          {selectedIdeas.size > 0 && (
            <span className="text-xs font-medium text-[var(--color-accent)] bg-[var(--color-accent-light)] px-2.5 py-1 rounded-[var(--radius-full)]">
              {selectedIdeas.size} selected
            </span>
          )}
        </div>
        <div className="space-y-3">
          {contentIdeas.map((idea, i) => {
            const isSelected = selectedIdeas.has(i);
            return (
              <div
                key={i}
                className={`rounded-[var(--radius-md)] border p-4 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-accent)]'
                }`}
                onClick={() => toggleIdea(i)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                      isSelected
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                        : 'border-[var(--color-border)]'
                    }`}
                  >
                    {isSelected && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug">
                      {idea.title}
                    </h4>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      {idea.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {idea.contentPillar && (
                        <span className="text-[10px] font-medium text-[var(--color-accent)] bg-[var(--color-accent-light)] px-2 py-0.5 rounded-[var(--radius-full)]">
                          {idea.contentPillar}
                        </span>
                      )}
                      {idea.angle && (
                        <span className="text-[10px] text-[var(--color-text-muted)] italic">
                          Angle: {idea.angle}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stories & Anecdotes */}
      {stories.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
            Stories & Anecdotes
          </h3>
          <div className="space-y-3">
            {stories.map((story, i) => {
              const isExpanded = expandedStories.has(i);
              return (
                <div
                  key={i}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4"
                >
                  <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                    {story.summary}
                  </p>
                  {story.fullText && (
                    <>
                      <button
                        onClick={() => toggleStory(i)}
                        className="mt-2 text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
                      >
                        {isExpanded ? 'Hide excerpt' : 'Show excerpt'}
                      </button>
                      {isExpanded && (
                        <div className="mt-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-3">
                          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed italic">
                            &ldquo;{story.fullText}&rdquo;
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Industry Insights */}
      {insights.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
            Industry Insights
          </h3>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div
                key={i}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4"
              >
                <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                  {insight.content}
                </p>
                {insight.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {insight.tags.map((tag, j) => (
                      <span
                        key={j}
                        className="text-[10px] font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] px-2 py-0.5 rounded-[var(--radius-full)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Themes */}
      {themes.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
            Recurring Themes
          </h3>
          <div className="flex flex-wrap gap-2">
            {themes.map((theme, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-2 rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5"
              >
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {theme.theme}
                </span>
                {theme.contentPillar !== 'uncategorized' && (
                  <span className="text-[10px] text-[var(--color-accent)] bg-[var(--color-accent-light)] px-1.5 py-0.5 rounded-[var(--radius-full)]">
                    {theme.contentPillar}
                  </span>
                )}
                {theme.occurrences > 1 && (
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    x{theme.occurrences}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
