import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getPostBySlug, formatDate, stripHtml } from '@/lib/api';
import SafeIcon from '@/common/SafeIcon';
import DOMPurify from 'dompurify';
import { useAppStore } from '@/store/useAppStore';
import { subscribeToNewsletter } from '@/lib/email';
import { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';

const ArticleDetail = () => {
  const { showToast } = useAppStore();

  const handleCopyLink = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          showToast("// TRANSMISSION LINK COPIED TO CLIPBOARD");
        })
        .catch(err => {
          console.error("Clipboard write failed", err);
        });
    } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = window.location.href;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            showToast("// TRANSMISSION LINK COPIED TO CLIPBOARD");
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }

        document.body.removeChild(textArea);
    }
  };

  const handleShareTwitter = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(post?.title?.rendered || 'Read this transmission');
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const navigate = useNavigate();
  const { slug } = useParams();
  const articles = useAppStore(state => state.articles);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasError, setHasError] = useState(false);

  const recentArticles = useMemo(() => {
    if (!articles || articles.length === 0) return [];
    return articles
      .filter(a => a.slug !== slug)
      .slice(0, 4);
  }, [articles, slug]);



  useEffect(() => {
    let isMounted = true;

    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      setFallbackMode(true);
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const data = await getPostBySlug(slug);
        if (isMounted) {
          if (!data) {
            setFallbackMode(true);
          } else {
            setPost(data);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("[AXiM Core: Routing Error] Failed to fetch article payload:", error);
        if (isMounted) {
          setFallbackMode(true);
          setLoading(false);
        }
      }
    }

    load();
    window.scrollTo(0, 0);

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Loading Intercept
  if (loading) {
    return (
      <div className="pt-40 min-h-screen flex flex-col items-center justify-center space-y-4 bg-grid">
        <div className="w-12 h-12 border-4 border-yellow-electric/30 border-t-yellow-electric rounded-full animate-spin"></div>
        <div className="text-center font-mono text-yellow-electric animate-pulse">DECRYPTING TRANSMISSION...</div>
      </div>
    );
  }

  // Error Intercept
  if (fallbackMode || !post) {
    return (
      <div className="pt-40 min-h-screen flex items-center justify-center p-6 bg-grid">
        <div className="deco-frame max-w-lg w-full bg-[#050505] border border-red-500/20 p-12 text-center rounded-sm font-mono text-zinc-400">
          <SafeIcon name="AlertTriangle" className="w-12 h-12 text-red-500/50 mx-auto mb-6" />
          <h2 className="text-xl uppercase tracking-widest mb-4 text-white">Transmission Error</h2>
          <p className="mb-8 text-sm leading-relaxed">
            The requested technical dispatch or strategic insight could not be located in the current database index. The record may have been archived or explicitly redacted.
          </p>
          <Link to="/news-media" className="inline-flex items-center space-x-2 border border-yellow-electric/20 text-yellow-electric hover:bg-yellow-electric/10 font-bold text-xs uppercase tracking-widest px-8 py-4 transition-colors rounded-sm shadow-[0_0_15px_rgba(253,224,71,0.4)]">
            <SafeIcon name="ArrowLeft" className="w-4 h-4" />
            <span>Return to Hub</span>
          </Link>
        </div>
      </div>
    );
  }


  const handleSubscribe = async (e) => {
    e.preventDefault();
    const sanitizedEmail = DOMPurify.sanitize(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!sanitizedEmail || !emailRegex.test(sanitizedEmail)) {
        setHasError(true);
        return;
    }

    setIsSubmitting(true);
    setHasError(false);

    try {
      await subscribeToNewsletter(sanitizedEmail);
      setEmail('');
      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      setIsSubmitting(false);
      setHasError(true);
    }
  };

  // Safe Execution variables

  const featuredImage = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200';
  const cleanExcerpt = stripHtml(post.excerpt.rendered);
  const title = stripHtml(post.title.rendered);

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": cleanExcerpt,
    "author": {
      "@type": "Person",
      "name": "James Ellars",
      "url": "https://ellars.us.com"
    },
    "datePublished": post.date,
    "image": featuredImage
  };

  return (
    <div className="pt-24 min-h-screen bg-grid">
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>{title} | James Ellars Official</title>
        <meta name="description" content={cleanExcerpt} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={cleanExcerpt} />
        <meta property="og:image" content={featuredImage} />
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      </Helmet>

      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
        {/* Left Column (Content) */}
        <div className="lg:w-2/3">
          <div className="bg-[#050505] border border-white/5 rounded-sm shadow-2xl overflow-hidden">
            <div className="relative h-[50vh] overflow-hidden">
              <img
                src={featuredImage}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"></div>
              <div className="absolute bottom-0 left-0 w-full p-8 md:p-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <Link to="/news-media" className="inline-flex items-center space-x-2 text-yellow-electric hover:bg-yellow-electric/10 hover:text-white transition-colors uppercase tracking-widest text-[10px] font-bold px-3 py-2 border border-transparent rounded-sm">
                      <SafeIcon name="ArrowLeft" className="w-4 h-4" />
                      <span>Return to Hub</span>
                    </Link>
                    <div className="flex space-x-4 items-center">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">SHARE TRANSMISSION:</span>
                      <button onClick={handleCopyLink} className="text-zinc-400 hover:text-yellow-electric transition-colors" aria-label="Copy Link" title="Copy Link">
                        <SafeIcon name="Link" className="w-4 h-4" />
                      </button>
                      <button onClick={handleShareTwitter} className="text-zinc-400 hover:text-yellow-electric transition-colors" aria-label="Share to X" title="Share to X">
                        <SafeIcon name="Twitter" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-deco text-yellow-electric leading-tight mb-4 break-words hyphens-auto">
                    {title}
                  </h1>
                  <div className="flex items-center space-x-4 text-gray-400 text-xs uppercase tracking-[0.2em] font-bold">
                    <span>{formatDate(post.date)}</span>
                    <span className="w-1 h-1 bg-yellow-electric rounded-full"></span>
                    <span>{post.acf?.read_time || '10 Min Read'}</span>
                    <span className="w-1 h-1 bg-yellow-electric rounded-full"></span>
                    <span>{post._embedded?.author?.[0]?.name || 'James Ellars'}</span>
                  </div>
                </motion.div>
              </div>
            </div>

            <div className="p-8 md:p-12">
              <div
                className="prose prose-invert prose-zinc max-w-none prose-headings:font-black prose-headings:tracking-tight prose-h2:text-white prose-a:text-yellow-electric prose-a:no-underline prose-a:border-b prose-a:border-yellow-electric/30 hover:prose-a:text-white hover:prose-a:border-white transition-colors prose-blockquote:border-l-4 prose-blockquote:border-yellow-electric prose-blockquote:bg-white/5 prose-blockquote:italic prose-blockquote:py-2 prose-blockquote:px-4"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content.rendered) }}
              />


              <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 text-center md:text-left">
                  SHARE TRANSMISSION
                </div>
                <div className="flex space-x-4">
                  <button onClick={handleCopyLink} className="p-3 bg-white/5 border border-white/10 hover:border-yellow-electric hover:text-yellow-electric transition-colors rounded-sm text-zinc-400 flex items-center gap-2">
                    <SafeIcon name="Link" className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Copy Link</span>
                  </button>
                  <button onClick={handleShareTwitter} className="p-3 bg-white/5 border border-white/10 hover:border-yellow-electric hover:text-yellow-electric transition-colors rounded-sm text-zinc-400 flex items-center gap-2">
                    <SafeIcon name="Twitter" className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Share to X</span>
                  </button>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="w-16 h-16 rounded-sm overflow-hidden border border-white/10 shrink-0 bg-zinc-900">
                    <img src="https://wp.axim.us.com/wp-content/uploads/2026/04/1776866096564_04266f9841304c5e8d53190e26a26e95.webp" alt="James Ellars" className="w-full h-full object-cover grayscale" />
                  </div>
                  <div>
                    <h4 className="font-editorial text-lg text-white font-bold uppercase tracking-widest mb-2">James Ellars</h4>
                    <p className="text-text-muted text-sm leading-relaxed">
                      James Ellars is a multifaceted professional, business development specialist, and civic advocate. A former Congressional candidate for California's 8th District, he leads initiatives focused on economic equity, the Automation Dividend, and sovereign civic infrastructure.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="lg:w-1/3">
          <div className="static lg:sticky top-32">
            <div className="bg-gradient-to-br from-[#050505] to-zinc-900 border border-yellow-electric/30 rounded-sm p-8 shadow-2xl">
              <h3 className="font-deco text-2xl text-yellow-electric mb-4">The American Tax Credit</h3>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                It's time to build systems that support working Americans. Join the fight to secure the Automation Dividend, overturn Citizens United, and permanently remove corrupt money from politics. Secure your stake in the People-First Economy today.
              </p>

              <AnimatePresence mode="wait">
                {!success ? (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                    onSubmit={handleSubscribe}
                  >
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (hasError) setHasError(false);
                        }}
                        placeholder="ENTER SECURE EMAIL"
                        required
                        disabled={isSubmitting}
                        className={`w-full bg-[#050505] border p-3 text-white text-sm focus:outline-none focus:border-yellow-electric/50 placeholder-zinc-600 rounded-sm transition-colors ${hasError ? 'border-red-500' : 'border-white/10'}`}
                      />
                      {hasError && (
                        <span className="absolute left-0 -bottom-5 text-red-500 text-[10px] font-mono tracking-widest uppercase">
                          [INVALID_TRANSMISSION]
                        </span>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-yellow-electric text-black font-bold uppercase tracking-widest text-xs py-4 hover:bg-white hover:text-black transition-colors rounded-sm shadow-[0_0_15px_rgba(253,224,71,0.2)] disabled:opacity-50 relative overflow-hidden"
                    >
                      <AnimatePresence mode="wait">
                        {isSubmitting ? (
                          <motion.span
                            key="submitting"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center space-x-2"
                          >
                            <span className="w-2 h-2 bg-black rounded-full animate-pulse"></span>
                            <span>ENCRYPTING...</span>
                          </motion.span>
                        ) : (
                          <motion.span
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            Join the Movement
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="deco-frame border border-yellow-electric/30 bg-[#050505] px-6 py-6 rounded-sm animate-pulse shadow-[0_0_15px_rgba(253,224,71,0.4)] text-center"
                  >
                    <div className="font-mono text-sm tracking-widest text-[#4ade80] uppercase mb-2">
                      [SIGNAL_RECEIVED]
                    </div>
                    <div className="text-[10px] text-zinc-400 uppercase tracking-widest">
                      SECURE TRANSMISSION CONFIRMED
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* RECENT TRANSMISSIONS LOOP */}
            {recentArticles.length > 0 && (
              <div className="mt-8 bg-gradient-to-br from-[#050505] to-zinc-900 border border-white/5 rounded-sm p-8 shadow-2xl">
                <h3 className="font-deco tracking-widest text-sm text-white uppercase border-b border-white/10 pb-2 mb-4">
                  RECENT TRANSMISSIONS
                </h3>
                <div className="flex flex-col space-y-4">
                  {recentArticles.map(recentPost => (
                    <Link to={`/articles/${recentPost.slug}`} key={recentPost.id} className="block group">
                      <h4 className="text-sm text-zinc-400 group-hover:text-yellow-electric transition-colors leading-relaxed line-clamp-2">
                        {stripHtml(recentPost.title?.rendered || '')}
                      </h4>
                      <div className="text-[10px] text-zinc-600 font-mono tracking-widest mt-1">
                        {formatDate(recentPost.date)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleDetail;
