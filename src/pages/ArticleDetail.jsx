import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getPostBySlug, formatDate, stripHtml } from '@/lib/api';
import SafeIcon from '@/common/SafeIcon';
import DOMPurify from 'dompurify';

const ArticleDetail = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fallbackMode, setFallbackMode] = useState(false);

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
        <title>{title} | James Ellars | Official</title>
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
                  <Link to="/news-media" className="inline-flex items-center space-x-2 text-yellow-electric mb-6 hover:bg-yellow-electric/10 hover:text-white transition-colors uppercase tracking-widest text-[10px] font-bold px-3 py-2 border border-transparent rounded-sm">
                    <SafeIcon name="ArrowLeft" className="w-4 h-4" />
                    <span>Return to Hub</span>
          </Link>
                  <h1 className="text-4xl md:text-6xl font-deco text-yellow-electric leading-tight mb-4">
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

              <div className="mt-16 pt-8 border-t border-white/10 flex justify-between items-center">
                <div className="flex space-x-4">
                  <button className="p-3 bg-white/5 border border-white/10 hover:border-yellow-electric transition-colors rounded-sm text-yellow-electric">
                    <SafeIcon name="Share2" className="w-5 h-5" />
                  </button>
                  <button className="p-3 bg-white/5 border border-white/10 hover:border-yellow-electric transition-colors rounded-sm text-gray-400 hover:text-yellow-electric">
                    <SafeIcon name="Twitter" className="w-5 h-5" />
                  </button>
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
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <input
                    type="email"
                    placeholder="ENTER SECURE EMAIL"
                    required
                    className="w-full bg-[#050505] border border-white/10 p-3 text-white text-sm focus:outline-none focus:border-yellow-electric/50 placeholder-zinc-600 rounded-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-yellow-electric text-black font-bold uppercase tracking-widest text-xs py-4 hover:bg-white hover:text-black transition-colors rounded-sm shadow-[0_0_15px_rgba(253,224,71,0.2)]"
                >
                  Join the Movement
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleDetail;
