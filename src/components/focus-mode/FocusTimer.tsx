'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const PRESETS = [
  { label: '15 min', minutes: 15, display: '15:00' },
  { label: '30 min', minutes: 30, display: '30:00' },
  { label: '45 min', minutes: 45, display: '45:00' },
  { label: '1 hour', minutes: 60, display: '60:00' },
];

interface FocusTimerProps {
  timerMinutes: number | null;
  onTimerSet: (minutes: number | null) => void;
  onTimerExpired: () => void;
}

export default function FocusTimer({ timerMinutes, onTimerSet, onTimerExpired }: FocusTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [expired, setExpired] = useState(false);
  const [justSelected, setJustSelected] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  // Start timer when timerMinutes changes
  useEffect(() => {
    if (timerMinutes !== null && timerMinutes > 0) {
      setSecondsLeft(timerMinutes * 60);
      setExpired(false);
    }
  }, [timerMinutes]);

  // Countdown
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [secondsLeft !== null && secondsLeft > 0]);

  // Handle expiry
  useEffect(() => {
    if (secondsLeft === 0 && !expired) {
      setExpired(true);
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 528;
        osc.type = 'sine';
        gain.gain.value = 0.15;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        osc.stop(ctx.currentTime + 1.5);
      } catch {
        // Audio not available
      }
      onTimerExpired();
    }
  }, [secondsLeft, expired, onTimerExpired]);

  // Close on Escape key only — no document click listener
  // (click listeners conflict with the Focus Mode overlay)
  useEffect(() => {
    if (!showPicker) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowPicker(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showPicker]);

  const selectPreset = useCallback((mins: number) => {
    // Prevent outside click handler from closing during selection animation
    closingRef.current = true;
    setJustSelected(mins);
    onTimerSet(mins);
    setCustomInput('');

    // Show confirmation for 800ms, then close
    setTimeout(() => {
      setShowPicker(false);
      setJustSelected(null);
      closingRef.current = false;
    }, 800);
  }, [onTimerSet]);

  const handleCustomSubmit = useCallback(() => {
    const parts = customInput.split(':');
    let totalMinutes = 0;
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10);
      const secs = parseInt(parts[1], 10);
      if (!isNaN(mins) && !isNaN(secs) && mins >= 0 && secs >= 0 && secs < 60) {
        totalMinutes = mins + secs / 60;
      }
    } else {
      totalMinutes = parseInt(customInput, 10);
    }
    if (totalMinutes > 0 && totalMinutes <= 480) {
      closingRef.current = true;
      setJustSelected(-1);
      onTimerSet(totalMinutes);
      setCustomInput('');
      setTimeout(() => {
        setShowPicker(false);
        setJustSelected(null);
        closingRef.current = false;
      }, 800);
    }
  }, [customInput, onTimerSet]);

  const clearTimer = useCallback(() => {
    onTimerSet(null);
    setSecondsLeft(null);
    setExpired(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [onTimerSet]);

  const formatTime = (totalSeconds: number): string => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const togglePicker = useCallback(() => {
    setShowPicker((prev) => !prev);
    setJustSelected(null);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Timer Display or Trigger Button */}
      {secondsLeft !== null && secondsLeft > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.3)', padding: '6px 12px' }}>
            <svg style={{ width: 16, height: 16, color: '#1a3a5c' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 500, color: '#1a3a5c' }}>
              {formatTime(secondsLeft)}
            </span>
          </div>
          <button
            onClick={clearTimer}
            style={{ cursor: 'pointer', borderRadius: 6, padding: 4, color: 'rgba(26,58,92,0.6)', border: 'none', background: 'none' }}
            title="Clear timer"
          >
            <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : expired ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, backgroundColor: '#2683EB', padding: '6px 12px' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'white' }}>Time&apos;s up!</span>
        </div>
      ) : (
        <button
          onClick={togglePicker}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
            border: '1px solid rgba(26,58,92,0.2)',
            backgroundColor: 'rgba(255,255,255,0.3)',
            padding: '6px 12px',
            fontSize: 14,
            fontWeight: 500,
            color: '#1a3a5c',
          }}
        >
          <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Timer
          <svg style={{ width: 12, height: 12, opacity: 0.6 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      )}

      {/* Dropdown */}
      {showPicker && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 8,
            width: 280,
            borderRadius: 16,
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-card)',
            padding: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            zIndex: 9999,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 12, color: 'var(--color-text-muted)' }}>
            QUICK TIMER
          </p>

          {/* Presets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {PRESETS.map((preset) => {
              const isSelected = justSelected === preset.minutes;
              return (
                <button
                  key={preset.minutes}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectPreset(preset.minutes);
                  }}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 10,
                    border: isSelected ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                    backgroundColor: isSelected ? 'var(--color-accent-light)' : 'transparent',
                    padding: '12px 14px',
                    fontSize: 14,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {preset.label}
                  </span>
                  <span style={{ fontFamily: 'monospace', color: isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                    {isSelected ? '✓ Set' : preset.display}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: 'var(--color-border)', marginBottom: 12 }} />

          {/* Custom input */}
          <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
            Custom time (MM:SS)
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
              placeholder="25:00"
              style={{
                flex: 1,
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-elevated)',
                padding: '8px 12px',
                fontSize: 14,
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCustomSubmit();
              }}
              disabled={!customInput}
              style={{
                cursor: customInput ? 'pointer' : 'not-allowed',
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#2683EB',
                padding: '8px 18px',
                fontSize: 14,
                fontWeight: 500,
                color: 'white',
                opacity: customInput ? 1 : 0.4,
              }}
            >
              Go
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
