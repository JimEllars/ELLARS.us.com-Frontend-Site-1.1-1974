import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link, useNavigate } from 'react-router-dom';
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

    if (typeof slug === 'undefined' || !slug || typeof slug !== 'string' || slug.trim() === '') {
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

  if (loading) return <div className="pt-40 text-center font-editorial text-gold-base animate-pulse">DECRYPTING TRANSMISSION...</div>;

  if (fallbackMode || !post) {
    return (
      <div className="pt-40 min-h-screen flex items-center justify-center p-6 bg-grid">
        <div className="deco-frame max-w-lg w-full bg-surface border border-yellow-electric/30 p-12 text-center rounded-sm">
          <SafeIcon name="AlertTriangle" className="w-12 h-12 text-yellow-electric mx-auto mb-6" />
          <h2 className="font-editorial text-2xl text-white uppercase tracking-widest mb-4">Record Not Found</h2>
          <p className="text-text-muted font-light mb-8 text-sm leading-relaxed">
            The requested technical dispatch or strategic insight could not be located in the current database index. The record may have been archived or explicitly redacted.
          </p>
          <button onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/news-media')} className="inline-flex items-center space-x-2 border border-yellow-electric/20 text-yellow-electric hover:bg-yellow-electric/10 font-editorial font-bold text-xs uppercase tracking-widest px-8 py-4 transition-colors rounded-sm shadow-[0_0_15px_rgba(253,224,71,0.4)]">
            <SafeIcon name="ArrowLeft" className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </div>
    );
  }


  const imageUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200';

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": stripHtml(post.title.rendered),
    "description": stripHtml(post.excerpt.rendered),
    "author": {
      "@type": "Person",
      "name": "James Ellars",
      "url": "https://ellars.us.com"
    },
    "datePublished": post.date,
    "image": imageUrl
  };

  return (
    <div className="pt-24 min-h-screen">
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>{stripHtml(post.title.rendered)} | James Ellars | Official</title>
        <meta name="description" content={stripHtml(post.excerpt.rendered)} />
        <meta property="og:title" content={stripHtml(post.title.rendered)} />
        <meta property="og:description" content={stripHtml(post.excerpt.rendered)} />
        <meta property="og:image" content={imageUrl} />
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      </Helmet>
      <div className="relative h-[60vh] overflow-hidden">
        <img 
          src={imageUrl} 
          alt={post.title.rendered} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-10 md:p-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto border-b border-white/10 pb-8"
          >
            <button onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/news-media')} className="inline-flex items-center space-x-2 text-yellow-electric mb-8 hover:bg-yellow-electric/10 hover:text-white transition-colors uppercase tracking-widest text-[10px] font-bold px-3 py-2 border border-transparent rounded-sm">
              <SafeIcon name="ArrowLeft" className="w-4 h-4" />
              <span>Back</span>
            </button>
            <h1 className="text-5xl md:text-7xl font-deco text-yellow-electric leading-tight mb-6">
              {post.title.rendered}
            </h1>
            <div className="flex items-center space-x-6 text-gray-400 text-xs uppercase tracking-[0.2em] font-bold">
              <span>{formatDate(post.date)}</span>
              <span className="w-1 h-1 bg-yellow-electric rounded-full"></span>
              <span>{post.acf?.read_time || '10 Min Read'}</span>
              <span className="w-1 h-1 bg-yellow-electric rounded-full"></span>
              <span>{post._embedded?.author?.[0]?.name || 'James Ellars'}</span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-20">
        <div 
          className="prose prose-invert prose-yellow overflow-hidden break-words text-text-muted text-lg leading-relaxed font-light article-content"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content.rendered) }}
        />
        
        <div className="mt-20 pt-10 border-t border-phthalo-deep flex justify-between items-center">
          <div className="flex space-x-4">
            <button className="p-3 bg-white/5 border border-white/10 hover:border-gold-base transition-colors rounded-sm">
              <SafeIcon name="Share2" className="w-5 h-5 text-gold-base" />
            </button>
            <button className="p-3 bg-white/5 border border-white/10 hover:border-gold-base transition-colors rounded-sm">
              <SafeIcon name="Twitter" className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <button className="btn-gold">Join the Conversation</button>
        </div>
      </div>
    </div>
  );
};

export default ArticleDetail;
