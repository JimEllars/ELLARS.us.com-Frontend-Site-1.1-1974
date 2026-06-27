import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import SafeIcon from '@/common/SafeIcon';
import { useAppStore } from '@/store/useAppStore';
import { getLatestPosts, stripHtml } from '@/lib/api';
import { useTelemetry } from '@/hooks/useTelemetry';


const SearchOverlay = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  const { articles, setArticles } = useAppStore();
  const { trackEvent } = useTelemetry();

  // Initial fetch if articles are empty
  useEffect(() => {
    let isMounted = true;
    if (isOpen && articles.length === 0) {
      const fetchArticles = async () => {
        try {
          const posts = await getLatestPosts(50); // Fetch a good amount for search
          if (isMounted) setArticles(posts);
        } catch (err) {
          console.error("Search fetch failed:", err);
        }
      };
      fetchArticles();
    }
    return () => { isMounted = false; };
  }, [isOpen, articles.length, setArticles]);

  // Debounce logic
  useEffect(() => {
    setIsDebouncing(true);
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setIsDebouncing(false);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);


  useEffect(() => {
    if (debouncedQuery.trim() !== '') {
      trackEvent('search_execution', { query: debouncedQuery });
    }
  }, [debouncedQuery, trackEvent]);

  // Trap focus and handle Escape
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus after small delay for animation
      setTimeout(() => inputRef.current?.focus(), 100);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'Tab') {
          if (!modalRef.current) return;
          const focusableElements = modalRef.current.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // Filter articles
  const filteredArticles = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const lowerQuery = debouncedQuery.toLowerCase();
    return articles.filter(article => {
      const title = article.title?.rendered ? stripHtml(article.title.rendered).toLowerCase() : '';
      const excerpt = article.excerpt?.rendered ? stripHtml(article.excerpt.rendered).toLowerCase() : '';
      return title.includes(lowerQuery) || excerpt.includes(lowerQuery);
    });
  }, [debouncedQuery, articles]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[110] backdrop-blur-lg bg-void/90 flex flex-col pt-32 px-6 pb-6"
          role="dialog"
          aria-modal="true"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-8 right-8 text-white hover:text-yellow-electric transition-colors"
            aria-label="Close search overlay"
          >
            <SafeIcon name="X" className="w-8 h-8" />
          </button>

          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
            <div className="relative mb-8">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SEARCH ARCHIVES..."
                className="w-full bg-transparent border-none outline-none text-4xl md:text-6xl font-deco text-yellow-electric placeholder-white/20 uppercase tracking-widest border-b border-white/10 focus:border-yellow-electric/50 pb-4 transition-colors"
              />
              <div className="absolute right-0 bottom-4 text-white/30">
                <SafeIcon name="Search" className="w-8 h-8" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {debouncedQuery.trim() !== '' && (
                <div className="space-y-4">
                  <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-6">
                    {isDebouncing ? '[PROCESSING_QUERY]' : `[RESULTS_FOUND: ${filteredArticles.length}]`}
                  </div>

                  {!isDebouncing && filteredArticles.length === 0 && (
                     <div className="text-center py-12 text-white/50 font-editorial text-lg">
                       No transmissions found matching your criteria.
                     </div>
                  )}

                  {!isDebouncing && filteredArticles.map(post => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group"
                    >
                      <Link
                        to={`/articles/${post.slug}`}
                        onClick={onClose}
                        className="block p-4 border border-white/5 bg-white/5 hover:border-yellow-electric hover:bg-yellow-electric/10 transition-colors"
                      >
                        <h4 className="font-editorial text-xl text-white group-hover:text-yellow-electric transition-colors mb-2">
                          {stripHtml(post.title?.rendered || 'Untitled Transmission')}
                        </h4>
                        <p className="text-sm text-text-muted line-clamp-2">
                          {stripHtml(post.excerpt?.rendered || '')}
                        </p>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchOverlay;
