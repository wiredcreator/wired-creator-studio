"use client";

import { useState, useEffect, useCallback } from "react";
import { onXPUpdate } from "@/lib/xp-events";

interface XPData {
  lifetimeXP: number;
  currentStreak: number;
  bestStreak: number;
}

const DEFAULT_XP: XPData = { lifetimeXP: 0, currentStreak: 0, bestStreak: 0 };

/**
 * Fetches XP on mount and re-fetches whenever an `xp-updated` event fires.
 * Returns { xp, loading, refreshXP }.
 */
export function useXP() {
  const [xp, setXP] = useState<XPData>(DEFAULT_XP);
  const [loading, setLoading] = useState(true);

  const fetchXP = useCallback(async () => {
    try {
      const res = await fetch("/api/xp");
      if (res.ok) {
        const data = await res.json();
        setXP({
          lifetimeXP: data.lifetimeXP ?? data.totalXP ?? 0,
          currentStreak: data.currentStreak ?? 0,
          bestStreak: data.bestStreak ?? 0,
        });
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchXP();
    // Delay re-fetch slightly so fire-and-forget XP writes on the server
    // have time to complete before we read the updated value
    return onXPUpdate(() => {
      setTimeout(fetchXP, 800);
    });
  }, [fetchXP]);

  return { xp, loading, refreshXP: fetchXP };
}
