'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useTheme } from '@/components/ThemeProvider';
import FocusTimer from './FocusTimer';
import CompleteTaskPath from './CompleteTaskPath';
import ContentSprintPath from './ContentSprintPath';
import BrainDumpPath from './BrainDumpPath';

export type FocusPath = 'select' | 'complete-task' | 'content-sprint' | 'brain-dump';

interface FocusModeProps {
  onClose: () => void;
}

export default function FocusMode({ onClose }: FocusModeProps) {
  const { resolvedTheme } = useTheme();
  const [path, setPath] = useState<FocusPath>('select');
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showAmbienceTooltip, setShowAmbienceTooltip] = useState(false);

  const isDark = resolvedTheme === 'dark';

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const handleTimerExpired = useCallback(() => {
    // Notify user
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Focus Mode', { body: 'Time is up! Great work.' });
    }
    // Auto-exit after a brief moment
    setTimeout(() => {
      handleClose();
    }, 2000);
  }, [handleClose]);

  const handleBackToSelect = useCallback(() => {
    setPath('select');
  }, []);

  const handleAmbienceClick = useCallback(() => {
    setShowAmbienceTooltip(true);
    setTimeout(() => setShowAmbienceTooltip(false), 2000);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] overflow-y-auto transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: isDark
          ? 'linear-gradient(180deg, #0C0D12 0%, #111827 50%, #1E293B 100%)'
          : 'linear-gradient(180deg, #EEF1F7 0%, #6CC7E5 50%, #2683EB 100%)',
      }}
    >
      {/* Top Bar — scrolls with content */}
      <div className="relative z-20 flex items-center justify-between px-6 py-4">
        {/* Left: Logo or Back */}
        <div className="flex items-center gap-3">
          {path !== 'select' ? (
            <button
              onClick={handleBackToSelect}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Change mode
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ backgroundColor: '#2683EB', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
              >
                <svg style={{ width: 16, height: 16, color: 'white' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text)]">
                studio
              </span>
            </div>
          )}
        </div>

        {/* Right: Timer + Ambience + Exit */}
        <div className="flex items-center gap-1">
          <FocusTimer
            timerMinutes={timerMinutes}
            onTimerSet={setTimerMinutes}
            onTimerExpired={handleTimerExpired}
          />

          {/* Divider */}
          <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

          {/* Play Ambience */}
          <div className="relative">
            <button
              onClick={handleAmbienceClick}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)]"
            >
              <span className="text-base">&#9835;</span>
              Play Ambience
            </button>
            {showAmbienceTooltip && (
              <div className="absolute right-0 top-full mt-2 whitespace-nowrap rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs text-[var(--color-text-secondary)] shadow-[var(--shadow-lg)] animate-fadeIn">
                Coming soon
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

          {/* Exit Focus Mode */}
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)]"
          >
            Exit Focus Mode
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={`relative z-10 flex min-h-[calc(100vh-80px)] px-6 pb-32 ${
        path === 'complete-task' ? 'items-start justify-center pt-8' : 'items-center justify-center'
      }`}>
        {path === 'select' && <PathSelector onSelect={setPath} />}
        {path === 'complete-task' && <CompleteTaskPath />}
        {path === 'content-sprint' && <ContentSprintPath />}
        {path === 'brain-dump' && <BrainDumpPath />}
      </div>

      {/* Cloud images along the bottom — hidden in dark mode */}
      <div className={`pointer-events-none fixed inset-x-0 bottom-0 z-0 h-48 transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-100'}`}>
        <Image
          src="/images/clouds/left.png"
          alt=""
          width={500}
          height={200}
          className="absolute bottom-0 left-0 w-[35%] max-w-[500px] object-contain object-bottom"
          priority
        />
        <Image
          src="/images/clouds/center.png"
          alt=""
          width={600}
          height={200}
          className="absolute bottom-0 left-1/2 w-[40%] max-w-[600px] -translate-x-1/2 object-contain object-bottom"
          priority
        />
        <Image
          src="/images/clouds/right.png"
          alt=""
          width={500}
          height={200}
          className="absolute bottom-0 right-0 w-[35%] max-w-[500px] object-contain object-bottom"
          priority
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/* Path Selector                                */
/* ──────────────────────────────────────────── */

function PathSelector({ onSelect }: { onSelect: (p: FocusPath) => void }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const paths = [
    {
      id: 'complete-task' as FocusPath,
      title: 'Complete Tasks',
      description: 'Clear your to-do list',
      emoji: '\u2705',
      bgColor: 'rgba(74, 222, 128, 0.15)',
    },
    {
      id: 'content-sprint' as FocusPath,
      title: 'Content Sprint',
      description: 'Write or draft content',
      emoji: '\u270D\uFE0F',
      bgColor: 'rgba(250, 204, 21, 0.12)',
    },
    {
      id: 'brain-dump' as FocusPath,
      title: 'Brain Dump',
      description: 'Capture what\u2019s on your mind',
      emoji: '\uD83E\uDDE0',
      bgColor: 'rgba(232, 121, 249, 0.12)',
    },
  ];

  return (
    <div className="w-full max-w-2xl animate-fadeIn">
      <div className="mb-10 text-center">
        <p
          style={{
            fontSize: 12,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: 'var(--color-text-secondary)',
            marginBottom: 12,
            fontWeight: 500,
          }}
        >
          FOCUS MODE ACTIVE
        </p>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 600,
            color: 'var(--color-text)',
            lineHeight: 1.2,
          }}
        >
          What are you working on?
        </h1>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {paths.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="group flex flex-col items-center gap-3 text-center"
            style={{
              backgroundColor: isDark ? p.bgColor : p.bgColor,
              border: isDark ? '1px solid var(--color-border)' : '1px solid rgba(255,255,255,0.45)',
              borderRadius: 20,
              padding: '32px 24px',
              backdropFilter: 'blur(8px)',
              boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
              e.currentTarget.style.boxShadow = isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)';
            }}
          >
            <span className="text-4xl">{p.emoji}</span>
            <div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  marginBottom: 4,
                }}
              >
                {p.title}
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.4,
                }}
              >
                {p.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
