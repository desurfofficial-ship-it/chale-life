/**
 * useCountdownNow — a standalone wall-clock tick for countdown text.
 *
 * The HUD's re-render contract is store-driven (see ui/hud/Hud.tsx): a
 * card re-renders only when a store value it reads actually changed, and
 * the needs drain only commits when a stat actually moves (~1 Hz while
 * draining, NOTHING while a stat sits capped). A countdown ("Daavi needs
 * you again in 45s") cannot live on that cadence — with the belly full
 * the drain commits nothing and the count would freeze mid-window.
 *
 * This hook runs its own 1 Hz interval, and ONLY while the caller's
 * countdown can still be live:
 *   - `stamp` is the epoch-ms the countdown rests from (undefined → the
 *     countdown was never armed → the clock stays frozen and no timer
 *     ever runs);
 *   - `isLive` is re-judged every tick through a ref — the moment it
 *     returns false the interval clears itself, and a NEW stamp (a fresh
 *     payout) re-arms it via the effect deps. The expiry tick is still
 *     COMMITTED before clearing: skipping that commit would freeze the
 *     clock on the last in-window read ("…in 1s") forever — the rules
 *     would never see a post-window nowMs, and a cooldown gate (Act pill
 *     "Daavi needs you again in Ns") would never open. Caught live by
 *     sleepYard (d) waiting for the second shift.
 *
 * The returned `nowMs` is frozen whenever nothing counts down, so
 * consumers can feed it to the pure rules as the session clock with no
 * behaviour change (rules receive the same value they would have read
 * from Date.now() at that render, just without a timer behind it).
 *
 * G-008e follow-up: the idle objective card and the Act prompt clock
 * were ticking on the needs-drain cadence; this makes the countdowns
 * real 1 Hz ticks independent of the drain.
 */

import { useEffect, useRef, useState } from 'react';

export function useCountdownNow(
  stamp: number | undefined,
  isLive: (nowMs: number) => boolean
): number {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const isLiveRef = useRef(isLive);
  isLiveRef.current = isLive;
  useEffect(() => {
    if (stamp === undefined) return;
    setNowMs(Date.now()); // re-sync on arm — the frozen tick may be stale
    const timer = setInterval(() => {
      const next = Date.now();
      setNowMs(next); // ALWAYS commit — including the boundary tick past
      // the window: the rules must re-evaluate on a post-expiry clock or
      // the gate never opens (see the header note).
      if (!isLiveRef.current(next)) {
        clearInterval(timer); // countdown window passed — stop AFTER committing
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [stamp]);
  return nowMs;
}
