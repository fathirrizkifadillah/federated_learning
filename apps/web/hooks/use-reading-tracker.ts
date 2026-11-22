'use client';

import { useEffect, useRef, useState } from 'react';
import { recordLocalEvent } from '@/lib/indexed-db';
import { LocalEvent, EventType } from '@fedsocial/shared-types';

interface ReadingTrackerOptions {
  articleId: string;
  category: string;
  userId?: string;
  idleTimeoutMs?: number; // default 30,000ms (30s)
}

export function useReadingTracker({
  articleId,
  category,
  userId = 'local-user-guest',
  idleTimeoutMs = 30000,
}: ReadingTrackerOptions) {
  const [activeReadingMs, setActiveReadingMs] = useState<number>(0);
  const [maxScrollDepth, setMaxScrollDepth] = useState<number>(0);
  const [isIdle, setIsIdle] = useState<boolean>(false);

  const lastActiveTimestampRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef<number>(0);
  const maxScrollRef = useRef<number>(0);

  // Helper to record local event safely
  const dispatchLocal = (type: EventType, extraMetadata = {}) => {
    const uuid = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const event: LocalEvent = {
      event_id: uuid,
      id: uuid,
      local_client_id: 'client_local_edge',
      local_user_key: userId,
      userId,
      article_id: articleId,
      articleId,
      session_id: 'sess_' + Date.now(),
      event_type: type,
      eventType: type,
      event_timestamp: nowIso,
      timestamp: Date.now(),
      duration_ms: accumulatedMsRef.current,
      durationMs: accumulatedMsRef.current,
      scroll_depth: maxScrollRef.current / 100,
      scrollDepthPercent: maxScrollRef.current,
      tab_visible: !document.hidden,
      window_focused: document.hasFocus ? document.hasFocus() : true,
      content_word_count: 0,
      metadata: {
        category,
        ...extraMetadata,
      },
    };
    recordLocalEvent(event).catch(console.error);
  };

  useEffect(() => {
    // Reset trackers for new article
    accumulatedMsRef.current = 0;
    maxScrollRef.current = 0;
    setActiveReadingMs(0);
    setMaxScrollDepth(0);
    setIsIdle(false);
    lastActiveTimestampRef.current = Date.now();

    // 1. Record impression event on mount
    dispatchLocal('impression');

    // Timer tick every 500ms to accumulate active reading time
    const tickInterval = window.setInterval(() => {
      if (!document.hidden && !isIdle) {
        const now = Date.now();
        const delta = now - lastActiveTimestampRef.current;
        accumulatedMsRef.current += delta;
        lastActiveTimestampRef.current = now;
        setActiveReadingMs(accumulatedMsRef.current);
      } else {
        lastActiveTimestampRef.current = Date.now();
      }
    }, 500);

    // Activity reset callback for idle detection
    const handleActivity = () => {
      lastActiveTimestampRef.current = Date.now();
      if (isIdle) {
        setIsIdle(false);
      }
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = window.setTimeout(() => {
        setIsIdle(true);
      }, idleTimeoutMs);
    };

    // Scroll tracker
    const handleScroll = () => {
      handleActivity();
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const currentScrollPercent = Math.min(
          100,
          Math.max(0, Math.round((window.scrollY / scrollHeight) * 100))
        );
        if (currentScrollPercent > maxScrollRef.current) {
          maxScrollRef.current = currentScrollPercent;
          setMaxScrollDepth(currentScrollPercent);
        }
      }
    };

    // Visibility listener
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsIdle(true);
      } else {
        lastActiveTimestampRef.current = Date.now();
        setIsIdle(false);
      }
    };

    // Attach listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial idle timer
    idleTimerRef.current = window.setTimeout(() => {
      setIsIdle(true);
    }, idleTimeoutMs);

    // Cleanup and flush dwell event on unmount
    return () => {
      window.clearInterval(tickInterval);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Record final dwell event if user engaged for more than 1 second
      if (accumulatedMsRef.current > 1000) {
        dispatchLocal('dwell', {
          finalScrollDepth: maxScrollRef.current,
          readFraction: maxScrollRef.current / 100,
        });
      }
    };
  }, [articleId, category, userId, idleTimeoutMs]);

  const recordExplicitFeedback = (type: 'like' | 'bookmark' | 'share') => {
    dispatchLocal(type);
  };

  return {
    activeReadingMs,
    activeReadingSeconds: Math.floor(activeReadingMs / 1000),
    maxScrollDepth,
    isIdle,
    recordExplicitFeedback,
  };
}
