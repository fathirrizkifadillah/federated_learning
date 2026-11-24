'use client';

import { useEffect, useRef, useState } from 'react';
import { recordLocalEvent } from '@/lib/indexed-db';
import { normalizeCategorySlug } from '@/lib/categories';
import { maybeRunBrowserFLRound } from '@/modules/federated';
import { LocalEvent, EventType } from '@fedsocial/shared-types';

const LOCAL_AGENT_URL = process.env.NEXT_PUBLIC_LOCAL_AGENT_URL || 'http://127.0.0.1:4848';

interface ReadingTrackerOptions {
  articleId: string;
  category: string;
  language?: string;
  userId?: string;
  userEmail?: string;
  authToken?: string | null;
  idleTimeoutMs?: number; // default 30,000ms (30s)
}

export function useReadingTracker({
  articleId,
  category,
  language = 'en',
  userId = 'local-user-guest',
  userEmail,
  authToken,
  idleTimeoutMs = 30000,
}: ReadingTrackerOptions) {
  const [activeReadingMs, setActiveReadingMs] = useState<number>(0);
  const [maxScrollDepth, setMaxScrollDepth] = useState<number>(0);
  const [isIdle, setIsIdle] = useState<boolean>(false);

  const lastActiveTimestampRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef<number>(0);
  const maxScrollRef = useRef<number>(0);
  const isIdleRef = useRef<boolean>(false);

  const normalizedCat = normalizeCategorySlug(category);
  const normalizedLang = (language || 'en').toLowerCase() === 'id' ? 'id' : 'en';
  const isAuthenticated = Boolean(userId && userId !== 'local-user-guest' && userEmail && authToken);

  // Helper to record local event safely (authenticated accounts only — guests read without local FL training)
  const dispatchLocal = (type: EventType, extraMetadata = {}) => {
    if (!isAuthenticated || !articleId || articleId === 'pending') return;

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
        category: normalizedCat,
        language: normalizedLang,
        ...extraMetadata,
      },
    };

    recordLocalEvent(event)
      .then(() => {
        // Automatic Browser-Native Web Worker FL round check (fire-and-forget, off-thread)
        if (type === 'dwell' || type === 'like' || type === 'bookmark') {
          void maybeRunBrowserFLRound({
            user: userId !== 'local-user-guest' && userEmail ? { id: userId, email: userEmail } : null,
            token: authToken || null,
            force: false,
          });
        }
      })
      .catch(console.error);

    // Strictly loopback (127.0.0.1) sync to optional local Python FL daemon (dev localhost only)
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isLocalhost) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 800);
        fetch(`${LOCAL_AGENT_URL}/api/v1/sync-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: uuid,
            article_id: articleId,
            category: normalizedCat,
            language: normalizedLang,
            event_type: type,
            timestamp: Date.now(),
            duration_ms: accumulatedMsRef.current,
            scroll_depth: maxScrollRef.current,
          }),
          signal: controller.signal,
        })
          .catch(() => {
            // Local agent daemon is optional; silently ignore if offline
          })
          .finally(() => clearTimeout(t));
      } catch {
        // Ignore loopback sync failure
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !articleId || articleId === 'pending') return;

    // Reset trackers for new article
    accumulatedMsRef.current = 0;
    maxScrollRef.current = 0;
    isIdleRef.current = false;
    setActiveReadingMs(0);
    setMaxScrollDepth(0);
    setIsIdle(false);
    lastActiveTimestampRef.current = Date.now();

    // 1. Record impression event once articleId is valid
    dispatchLocal('impression');

    // Timer tick every 500ms to accumulate active reading time
    const tickInterval = window.setInterval(() => {
      if (!document.hidden && !isIdleRef.current) {
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
      if (isIdleRef.current) {
        isIdleRef.current = false;
        setIsIdle(false);
      }
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = window.setTimeout(() => {
        isIdleRef.current = true;
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
        isIdleRef.current = true;
        setIsIdle(true);
      } else {
        lastActiveTimestampRef.current = Date.now();
        isIdleRef.current = false;
        setIsIdle(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    idleTimerRef.current = window.setTimeout(() => {
      isIdleRef.current = true;
      setIsIdle(true);
    }, idleTimeoutMs);

    return () => {
      window.clearInterval(tickInterval);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (accumulatedMsRef.current > 1000) {
        dispatchLocal('dwell', {
          finalScrollDepth: maxScrollRef.current,
          readFraction: maxScrollRef.current / 100,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, articleId, normalizedCat, normalizedLang, userId, idleTimeoutMs]);

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
