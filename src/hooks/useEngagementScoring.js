import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const SESSION_KEY = 'ellars_engagement_signals';

const getInitialSignals = () => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : {
      timeOnPageMs: 0,
      maxScrollDepth: 0,
      calculatorInteractions: 0,
      platformExplorations: 0,
      articleCompletions: 0,
      newsletterActivations: 0,
      newsletterSubmissions: 0,
    };
  } catch (e) {
    return {
      timeOnPageMs: 0,
      maxScrollDepth: 0,
      calculatorInteractions: 0,
      platformExplorations: 0,
      articleCompletions: 0,
      newsletterActivations: 0,
      newsletterSubmissions: 0,
    };
  }
};

export const useEngagementScoring = () => {
  const [signals, setSignals] = useState(getInitialSignals);
  const location = useLocation();

  // Save signals to sessionStorage on change
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(signals));
    } catch (e) {
      // silent
    }
  }, [signals]);

  // Track time on page
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setSignals(prev => ({
        ...prev,
        timeOnPageMs: prev.timeOnPageMs + elapsed
      }));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;

      if (documentHeight === 0) return;

      const scrollPercentage = (scrollTop + windowHeight) / documentHeight;
      const scrollDepth = Math.min(100, Math.round(scrollPercentage * 100));

      setSignals(prev => {
        if (scrollDepth > prev.maxScrollDepth) {
          return { ...prev, maxScrollDepth: scrollDepth };
        }
        return prev;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen for custom engagement signals
  useEffect(() => {
    const handleEngagementSignal = (e) => {
      const { type } = e.detail;
      setSignals(prev => {
        switch (type) {
          case 'calculator_interaction':
            return { ...prev, calculatorInteractions: prev.calculatorInteractions + 1 };
          case 'platform_click':
            return { ...prev, platformExplorations: prev.platformExplorations + 1 };
          case 'article_completion':
            return { ...prev, articleCompletions: prev.articleCompletions + 1 };
          case 'newsletter_activation':
            return { ...prev, newsletterActivations: prev.newsletterActivations + 1 };
          case 'newsletter_submission':
            return { ...prev, newsletterSubmissions: prev.newsletterSubmissions + 1 };
          default:
            return prev;
        }
      });
    };

    window.addEventListener('ellars_engagement_signal', handleEngagementSignal);
    return () => window.removeEventListener('ellars_engagement_signal', handleEngagementSignal);
  }, []);

  // Compute score and tier
  const calculateScore = useCallback(() => {
    let score = 0;

    // Time on page (max 20 points)
    if (signals.timeOnPageMs > 3 * 60 * 1000) score += 20; // > 3 mins
    else if (signals.timeOnPageMs > 60 * 1000) score += 10; // > 1 min

    // Scroll depth (max 20 points)
    if (signals.maxScrollDepth >= 80) score += 20;
    else if (signals.maxScrollDepth >= 50) score += 10;

    // Interactions (max 60 points)
    score += Math.min(20, signals.calculatorInteractions * 10);
    score += Math.min(10, signals.platformExplorations * 5);
    score += Math.min(15, signals.articleCompletions * 15);
    score += Math.min(10, signals.newsletterActivations * 10);
    score += Math.min(25, signals.newsletterSubmissions * 25);

    // Normalize to 0-100
    return Math.min(100, Math.max(0, score));
  }, [signals]);

  const score = calculateScore();

  let tier = 'OBSERVER_COLD';
  if (score >= 70) {
    tier = 'STRATEGIC_HOT';
  } else if (score >= 30) {
    tier = 'CIVIC_WARM';
  }

  return { score, tier, signals };
};
