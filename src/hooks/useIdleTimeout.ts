"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const IDLE_MS = 14 * 60 * 1000;
const WARNING_MS = 60 * 1000;
const ACTIVITY_THROTTLE_MS = 1000;

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

export type IdleTimeoutState = {
  isWarning: boolean;
  remainingSeconds: number;
  continueSession: () => void;
  signOutNow: () => void;
};

type UseIdleTimeoutOptions = {
  onSignOut: () => void;
  enabled?: boolean;
};

export function useIdleTimeout({
  onSignOut,
  enabled = true,
}: UseIdleTimeoutOptions): IdleTimeoutState {
  const [isWarning, setIsWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.floor(WARNING_MS / 1000)
  );

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(Date.now());
  const isWarningRef = useRef(false);
  const onSignOutRef = useRef(onSignOut);
  onSignOutRef.current = onSignOut;

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current);
      warningTimerRef.current = null;
    }
  }, []);

  const startWarning = useCallback(() => {
    isWarningRef.current = true;
    setIsWarning(true);
    setRemainingSeconds(Math.floor(WARNING_MS / 1000));

    if (warningTimerRef.current) clearInterval(warningTimerRef.current);

    const deadline = Date.now() + WARNING_MS;
    warningTimerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(left);
      if (left <= 0) {
        if (warningTimerRef.current) {
          clearInterval(warningTimerRef.current);
          warningTimerRef.current = null;
        }
        isWarningRef.current = false;
        setIsWarning(false);
        onSignOutRef.current();
      }
    }, 250);
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (!enabled) return;
    clearTimers();
    isWarningRef.current = false;
    setIsWarning(false);
    setRemainingSeconds(Math.floor(WARNING_MS / 1000));
    idleTimerRef.current = setTimeout(startWarning, IDLE_MS);
  }, [clearTimers, enabled, startWarning]);

  const continueSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    resetIdleTimer();
  }, [resetIdleTimer]);

  const signOutNow = useCallback(() => {
    clearTimers();
    isWarningRef.current = false;
    setIsWarning(false);
    onSignOutRef.current();
  }, [clearTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      isWarningRef.current = false;
      setIsWarning(false);
      return;
    }

    const onActivity = () => {
      if (isWarningRef.current) return;
      const now = Date.now();
      if (now - lastActivityRef.current < ACTIVITY_THROTTLE_MS) return;
      lastActivityRef.current = now;
      resetIdleTimer();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !isWarningRef.current) {
        onActivity();
      }
    };

    resetIdleTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, resetIdleTimer, clearTimers]);

  return {
    isWarning,
    remainingSeconds,
    continueSession,
    signOutNow,
  };
}
