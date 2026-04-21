'use client';

import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import ModalPortal from '@/components/ModalPortal';

interface QuestCompletionCelebrationProps {
  questTitle: string;
  xpEarned: number;
  onDismiss: () => void;
}

export default function QuestCompletionCelebration({
  questTitle,
  xpEarned,
  onDismiss,
}: QuestCompletionCelebrationProps) {
  const [visible, setVisible] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));

    // Fire confetti only once
    if (!firedRef.current) {
      firedRef.current = true;

      // Initial burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6, x: 0.5 },
        colors: ['#DA4114', '#4A90D9', '#3ECF8E', '#F0B429', '#A78BFA'],
        disableForReducedMotion: true,
      });

      // Follow-up side bursts
      setTimeout(() => {
        confetti({
          particleCount: 40,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#DA4114', '#4A90D9', '#3ECF8E', '#F0B429'],
          disableForReducedMotion: true,
        });
        confetti({
          particleCount: 40,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#DA4114', '#4A90D9', '#3ECF8E', '#F0B429'],
          disableForReducedMotion: true,
        });
      }, 250);
    }

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleBackdropClick = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          backgroundColor: visible ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0)',
          transition: 'background-color 0.3s ease',
        }}
        onClick={handleBackdropClick}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative mx-4 w-full max-w-sm rounded-[var(--radius-xl)] bg-[var(--color-bg-card)] p-8 text-center shadow-[var(--shadow-lg)]"
          style={{
            transform: visible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(16px)',
            opacity: visible ? 1 : 0,
            transition: 'transform 0.3s ease, opacity 0.3s ease',
          }}
        >
          {/* Success icon */}
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--color-success-light)' }}
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="var(--color-success)">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>

          {/* Title */}
          <h3
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Quest Complete!
          </h3>

          {/* Quest name */}
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {questTitle}
          </p>

          {/* XP earned */}
          {xpEarned > 0 && (
            <div
              className="mx-auto mt-4 inline-flex items-center gap-2 rounded-[var(--radius-full)] px-4 py-2"
              style={{
                backgroundColor: 'rgba(234, 179, 8, 0.15)',
              }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#EAB308">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
              <span className="text-base font-bold" style={{ color: '#EAB308' }}>
                +{xpEarned} XP
              </span>
            </div>
          )}

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleBackdropClick}
            className="mt-5 text-xs font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Tap anywhere to close
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
