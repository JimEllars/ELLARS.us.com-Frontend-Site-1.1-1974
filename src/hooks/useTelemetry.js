import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useEngagementScoring } from './useEngagementScoring';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  recordKey,
  selectBatch,
  settleBatch,
  dropStale,
  mergeForUnload,
} from '@/lib/telemetryQueue';
import { claimPageView } from '@/lib/pageViewGate';

const QUEUE_KEY = 'ellars_telemetry_queue';
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

/**
 * Telemetry is same-origin only. There is deliberately no environment override:
 * a build-time VITE_AXIM_API_URL previously shipped requests to
 * api.axim.us.com, which is a dead Bluehost host, and a client-side
 * 'VITE_AXIM_API_KEY' was used as a bearer token — a secret that could never be
 * secret, and whose absence silently disabled the entire pipeline. All edge
 * traffic belongs to the Pages Function at this path.
 */
const TELEMETRY_ENDPOINT = '/api/telemetry';

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};




const prunePayloadArray = (queue) => {
  return queue.map(payload => {
    if (!payload || !payload.event_payload || !payload.event_payload.metadata) return payload;
    const prunedMetadata = { ...payload.event_payload.metadata };
    if (prunedMetadata.data && typeof prunedMetadata.data === "object" && prunedMetadata.data !== null) {
      const prunedData = { ...prunedMetadata.data };
      ["nativeEvent", "_reactName", "_targetInst", "target", "currentTarget", "view"].forEach(key => {
        delete prunedData[key];
      });
      prunedMetadata.data = prunedData;
    }
    return {
      ...payload,
      event_payload: {
        ...payload.event_payload,
        metadata: prunedMetadata
      }
    };
  });
};

export const enqueuePayload = (payload) => {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    // Add local timestamp when enqueueing
    payload.timestamp = payload.timestamp || Date.now();
    queue.push(payload);
    const limitedQueue = queue.slice(-50);
    const prunedQueue = prunePayloadArray(limitedQueue);
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(prunedQueue));
      if (typeof window !== 'undefined') { window.dispatchEvent(new CustomEvent('ellars_telemetry_updated')); }
    } catch (storageError) {
      if (storageError.name === 'QuotaExceededError' || storageError.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        try {
          // Slice the oldest 20 records out of the existing queue and re-attempt the write
          const recoveredQueue = prunedQueue.slice(20);
          localStorage.setItem(QUEUE_KEY, JSON.stringify(recoveredQueue));
        } catch (retryError) {
          try {
            sessionStorage.setItem(QUEUE_KEY, JSON.stringify(prunedQueue));
          } catch (sessionError) {
            // Silence
          }
        }
      }
    }
  } catch (e) {
    // Silence errors to prevent network identifiers in console
  }
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const useTelemetry = () => {
  const location = useLocation();
  const { pathname } = location;
  const isOnline = useNetworkStatus();
  const { score, tier, signals } = useEngagementScoring();

  /**
   * The volatile half of a payload, read **at call time** rather than captured.
   *
   * The callbacks below used to close over `pathname`, `isOnline`, `score`, `tier`
   * and `signals`, so their identities changed whenever the engagement score moved —
   * which is on every scroll position deeper than the last. `trackEvent` therefore
   * changed identity too, and every effect that listed it in its dependencies re-ran
   * with it: the page view effect fired a page view per scroll tick, and
   * `SearchOverlay` re-sent its query per tick. Keeping the values in a ref and
   * reading them when a payload is actually built makes the three callbacks stable
   * for the life of the hook instance, which is what their callers already assumed.
   */
  const liveRef = useRef({ pathname, isOnline, score, tier, signals });

  // Declared before the effects that read it, so it is current by the time they run.
  useEffect(() => {
    liveRef.current = { pathname, isOnline, score, tier, signals };
  }, [pathname, isOnline, score, tier, signals]);

  // Implement an in-memory boolean flag locker ('isFlushing') directly within the hook layer.
  const isFlushing = useRef(false);

  // Track in-flight payloads to serialize them on unload if they fail or get interrupted
  const inFlightPayloads = useRef([]);

  // Setup tab unload handlers to serialize pending telemetry queues
  useEffect(() => {
    const handleUnload = () => {
      try {
        const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        // Bounded here for the same reason the flush is: `sendBeacon` returns false
        // over its 64 KiB limit, and the old code cleared the queue whether or not
        // the platform accepted the payload — so a large queue was discarded on
        // unload rather than delivered or kept for next visit.
        const batch = mergeForUnload(queue, inFlightPayloads.current);
        if (batch.length === 0) return;

        let beaconSent = false;
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' });
          beaconSent = navigator.sendBeacon(TELEMETRY_ENDPOINT, blob);
        }

        if (!beaconSent) {
          // `keepalive` is the only transport left during unload. Its outcome cannot
          // be observed, so the queue is kept rather than cleared: a duplicate on the
          // next visit is harmless (every record carries its own idempotency key) and
          // a loss is not.
          fetch(TELEMETRY_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Project-Scope': 'ELLARS_FRONTEND'
            },
            body: JSON.stringify(batch),
            keepalive: true
          }).catch(() => {});
          return;
        }

        // The beacon was accepted, so remove exactly what was handed to it.
        const sentKeys = new Set(batch.map(recordKey));
        const remaining = queue.filter((payload) => !sentKeys.has(recordKey(payload)));
        localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
      } catch (e) {
        // Silent
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleUnload();
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const flushQueue = useCallback(async () => {
    // When a device reconnection event is broadcast by useNetworkStatus, verify the lock flag state before attempting a flush transaction.
    if (isFlushing.current) return;

    // Toggle the state lock value to true during the active background fetch execution block
    isFlushing.current = true;

    try {
      const hasConsented = localStorage.getItem('ellars_privacy_consent');
      if (hasConsented !== 'true') return;

      const readQueue = () => {
        try {
          return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        } catch {
          return [];
        }
      };
      const writeQueue = (next) => {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ellars_telemetry_updated'));
        }
      };

      const stored = readQueue();
      if (stored.length === 0) return;

      const fresh = dropStale(stored);
      if (fresh.length !== stored.length) writeQueue(fresh);
      if (fresh.length === 0) return;

      // Never build a body the edge is documented to refuse. This is the fix for the
      // permanent 413 loop: an oversized queue used to be resent verbatim every five
      // seconds, for the life of the profile, and never delivered anything.
      if (selectBatch(fresh).length === 0) return;

      let attempt = 0;
      let retry = true;

      while (attempt < MAX_RETRIES && retry) {
        attempt += 1;

        // Re-selected every attempt, from the queue as it is now. A retry after a 413
        // must send a *smaller* body; holding one fixed batch meant the halving in
        // `settleBatch` changed the queue and nothing else, and the identical
        // oversized payload went out again.
        const batch = selectBatch(dropStale(readQueue()));
        if (batch.length === 0) break;

        // Register the payloads we're about to send as "in-flight" in case of unload
        inFlightPayloads.current = [...batch];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        let status = null;
        try {
          const response = await fetch(TELEMETRY_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Project-Scope': 'ELLARS_FRONTEND'
            },
            body: JSON.stringify(batch), // Single array payload block
            signal: controller.signal,
            keepalive: true,
          });
          status = response.status;
        } catch {
          status = null; // transport failure: the settlement decides whether to retry
        } finally {
          clearTimeout(timeoutId);
        }

        // Settle against the queue *as it is now*, not as it was when the batch was
        // selected: records enqueued during the flight were never in this batch.
        const decision = settleBatch({ status, sent: batch, queue: readQueue() });
        writeQueue(decision.queue);
        retry = decision.retry;

        if (retry && attempt < MAX_RETRIES) {
          const delay = Math.min(30000, BASE_BACKOFF_MS * Math.pow(2, attempt));
          const jitter = Math.random() * 1000;
          await wait(delay + jitter);
        }
      }

      inFlightPayloads.current = [];
    } catch (e) {
      // Silently fail
    } finally {
      // Reset the lock when the batch is settled or the backoff ceiling is exhausted
      isFlushing.current = false;
    }
  }, []);

  useEffect(() => {
    // One flush on connect is enough: `flushQueue` sets its lock synchronously, so
    // the second call this effect used to make could only ever be a no-op.
    if (isOnline && !isFlushing.current) {
      flushQueue();
    }

    // Auto flush every 5 seconds — the interval the queue's settlement logic is
    // written against, and the one the previous comment contradicted.
    const interval = setInterval(() => {
      if (isOnline && !isFlushing.current) {
        flushQueue();
      }
    }, 5000);

    // Ensure robust auto-flush execution on browser network reconnection
    window.addEventListener('online', flushQueue);

    return () => {
       clearInterval(interval);
       window.removeEventListener('online', flushQueue);
    };
  }, [isOnline, flushQueue]);

  const dispatchTelemetry = useCallback(async (payload) => {
    const hasConsented = localStorage.getItem('ellars_privacy_consent');
    if (hasConsented !== 'true') return;

    // Just enqueue it. The interval or unload will handle the flush.
    enqueuePayload(payload);

    // Trigger an event so UI can update queue depth
    if (typeof window !== 'undefined') {
       window.dispatchEvent(new CustomEvent('ellars_telemetry_updated'));
    }

    // Flush immediately if buffer reaches 10 events
    try {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      if (queue.length >= 10 && liveRef.current.isOnline && !isFlushing.current) {
        flushQueue();
      }
    } catch(e) { /* silent */ }
  }, [flushQueue]);

  const createTelemetryPayload = useCallback((eventType, severity, componentOrigin, errorMessage = "", stackTrace = "", metadata = {}) => {
    const {
      pathname: currentRoute,
      isOnline: online,
      score: currentScore,
      tier: currentTier,
      signals: currentSignals,
    } = liveRef.current;
    // Strip sensitive data
    const safeMetadata = { ...metadata };
    delete safeMetadata.password;
    delete safeMetadata.token;
    delete safeMetadata.authorization;
    delete safeMetadata.credentials;

    const lead_score_payload = { score: currentScore, tier: currentTier, signals: currentSignals };
    return {
      telemetry_envelope: {
        project_id: 'ELLARS_FRONTEND',
        environment: 'production',
        timestamp: new Date().toISOString(),
        idempotency_key: generateUUID(),
        session: { context_scope: 'public_facing_umbrella' }
      },
      event_payload: {
        event_type: eventType,
        severity: severity,
        component_origin: componentOrigin,
        error_message: errorMessage,
        stack_trace: stackTrace,
        metadata: {
          current_route: currentRoute,
          network_status: online ? 'online' : 'offline',
          ...safeMetadata,
          lead_score_payload
        }
      }
    };
  }, []);

  useEffect(() => {
    // One page view per history entry, claimed by whichever consumer runs first.
    // Without the gate every component that calls this hook emitted its own, so a
    // single navigation produced three page views from `Navbar` alone. See
    // `src/lib/pageViewGate.js` for the measurement and the rule.
    if (!claimPageView(location)) return;

    const sendTelemetry = async () => {
      try {
        const payload = createTelemetryPayload('page_view', 'LOW', 'ROUTER', '', '', { path: pathname });
        await dispatchTelemetry(payload);
      } catch (e) { /* silent */ }
    };

    // Background isolation
    sendTelemetry();
    return () => {};
  }, [location, pathname, dispatchTelemetry, createTelemetryPayload]);

  const trackEvent = useCallback((eventName, eventData = {}, severity = 'MEDIUM', componentOrigin = 'UI_INTERACTION', errorMessage = "", stackTrace = "") => {
    // Dispatch engagement signals based on known event names
    if (typeof window !== 'undefined') {
      if (eventName === 'calculator_interaction' || eventName === 'calculator_update') {
        window.dispatchEvent(new CustomEvent('ellars_engagement_signal', { detail: { type: 'calculator_interaction' } }));
      } else if (eventName === 'platform_click' || eventName === 'platform_exploration' || liveRef.current.pathname === '/platform') {
        window.dispatchEvent(new CustomEvent('ellars_engagement_signal', { detail: { type: 'platform_click' } }));
      } else if (eventName === 'newsletter_activation' || eventName === 'newsletter_modal_open') {
        window.dispatchEvent(new CustomEvent('ellars_engagement_signal', { detail: { type: 'newsletter_activation' } }));
      } else if (eventName === 'newsletter_submission' || eventName === 'newsletter_success') {
        window.dispatchEvent(new CustomEvent('ellars_engagement_signal', { detail: { type: 'newsletter_submission' } }));
      } else if (eventName === 'article_completion' || eventName === 'article_read') {
        window.dispatchEvent(new CustomEvent('ellars_engagement_signal', { detail: { type: 'article_completion' } }));
      }
    }
    try {
      // Isolate telemetry from UI thread execution
      const payload = createTelemetryPayload(eventName, severity, componentOrigin, errorMessage, stackTrace, { data: eventData });
      dispatchTelemetry(payload).catch(() => {}); // Catch any stray rejections from dispatchTelemetry
    } catch (e) {
      // Ignore errors entirely to prevent UI disruption
    }
  }, [createTelemetryPayload, dispatchTelemetry]);

  return { trackEvent, dispatchTelemetry, flushQueue };
};
