import MediaPlaylist from '../components/intel/MediaPlaylist';
import React, { useEffect, useState, useRef } from 'react';
import { useLoader } from '@/components/Layout';
import SafeIcon from '@/common/SafeIcon';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { getLatestPosts, getSocialFeed, stripHtml, formatDate } from '@/lib/api';
import DOMPurify from 'dompurify';
import { motion } from 'framer-motion';

const FrequencyVisualizer = ({ isPlaying }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 20;
      const barWidth = canvas.width / bars - 2;

      for (let i = 0; i < bars; i++) {
        const barHeight = isPlaying ? Math.random() * (canvas.height - 10) + 10 : 5;
        const x = i * (barWidth + 2);
        const y = canvas.height - barHeight;

        ctx.fillStyle = isPlaying ? '#fde047' : '#4ade80';
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      if (isPlaying) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying]);

  return <canvas ref={canvasRef} width="200" height="60" className="w-full h-full opacity-50" />;
};


const SocialSkeleton = () => (
  <>
    {[1, 2, 3].map((i) => (
      <div key={i} className="interactive-card flex flex-col group h-full rounded-sm border-b-yellow-electric/20 bg-surface animate-pulse">
        <div className="w-full aspect-square md:aspect-video mb-6 bg-white/10 rounded-t-sm"></div>
        <div className="mb-auto px-8">
          <div className="h-4 w-24 bg-white/10 rounded mb-4"></div>
          <div className="h-6 w-3/4 bg-white/10 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-white/10 rounded"></div>
            <div className="h-4 w-5/6 bg-white/10 rounded"></div>
            <div className="h-4 w-4/6 bg-white/10 rounded"></div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between mx-8 mb-8">
          <div className="h-4 w-16 bg-white/10 rounded"></div>
          <div className="w-5 h-5 bg-white/10 rounded-full"></div>
        </div>
      </div>
    ))}
  </>
);

const NewsMedia = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const { setIsLoading } = useLoader();
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [posts, setPosts] = useState([]);
  const [socialPosts, setSocialPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingSocial, setLoadingSocial] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setIsLoading(false);
  }, [setIsLoading]);

  useEffect(() => {
    let isMounted = true;

    async function fetchArticles() {
      try {
        const articleData = await getLatestPosts(20);
        if (isMounted) {
          setPosts(articleData);
          setLoadingPosts(false);
        }
      } catch (e) {
        if (isMounted) setLoadingPosts(false);
      }
    }

    async function fetchSocial() {
      try {
        const socialData = await getSocialFeed(20);
        if (isMounted) {
          setSocialPosts(socialData);
          setLoadingSocial(false);
        }
      } catch (e) {
        if (isMounted) setLoadingSocial(false);
      }
    }

    fetchArticles();
    fetchSocial();

    return () => { isMounted = false; };
  }, []);

  const filters = ['ALL', 'VIDEO', 'AUDIO', 'ARTICLES', 'SOCIAL'];

  const allCombinedPosts = [...posts, ...socialPosts].sort((a, b) => {
    const isADaily = (a.title?.rendered || '').toLowerCase().includes('daily news') || (a.acf?.category_label || '').toLowerCase() === 'daily news';
    const isBDaily = (b.title?.rendered || '').toLowerCase().includes('daily news') || (b.acf?.category_label || '').toLowerCase() === 'daily news';
    if (isADaily && !isBDaily) return -1;
    if (!isADaily && isBDaily) return 1;
    return new Date(b.date) - new Date(a.date);
  });
  const filteredPosts = allCombinedPosts.filter(post => {
    if (activeFilter === 'ALL') return true;
    let category = post.acf?.category_label?.toUpperCase() || '';
    if (category === 'DISPATCH' || category === 'BUSINESS BRIEFING') category = 'ARTICLES';
    if (category === activeFilter) return true;
    return false;
  });

  const isDailyNewsPost = (post) => (post.title?.rendered || '').toLowerCase().includes('daily news') || (post.acf?.category_label || '').toLowerCase() === 'daily news';
  const dailyNewsPosts = filteredPosts.filter(isDailyNewsPost);
  const archivePosts = filteredPosts.filter(post => !isDailyNewsPost(post));

  return (
    <div className="pt-32 pb-20 min-h-screen bg-transparent">
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>News & Media Hub | James Ellars | Official</title>
        <meta property="og:type" content="website" />
        <meta property="og:title" content="News & Media Hub | James Ellars" />
        <meta property="og:image" content="https://wp.axim.us.com/wp-content/uploads/2026/04/1776866096564_04266f9841304c5e8d53190e26a26e95.webp" />
        <meta name="description" content="Leading American innovation through disruptive systems and algorithmic economic equity. Sovereign Innovation." />
        <meta property="og:description" content="James Ellars' updates on American innovation and economic freedom" />
      </Helmet>
      <div className="max-w-7xl mx-auto px-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl">
            <span className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold block mb-4">Stay Informed</span>
            <h1 className="font-editorial font-black text-5xl md:text-7xl text-white leading-tight">
              NEWS & MEDIA <span className="text-yellow-electric">HUB.</span>
            </h1>
            <p className="text-text-muted mt-6 text-lg font-light leading-relaxed">
              The Latest News, Updates and Media regarding the systems and strategies of James Ellars.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 bg-surface p-1 border border-white/10 rounded-sm">
            {filters.map(f => (
              <button 
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-6 py-2 font-editorial text-[10px] uppercase tracking-widest font-bold rounded-sm transition-all ${activeFilter === f ? 'bg-yellow-electric text-black border-transparent shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 'text-gray-400 hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </header>

        {/* Tier 1: Featured Daily News */}
        {(dailyNewsPosts.length > 0 || ((loadingPosts && activeFilter !== 'SOCIAL') || (loadingSocial && (activeFilter === 'SOCIAL' || activeFilter === 'ALL')))) && (
          <section className="mb-16">
            <header className="mb-8 pb-4 border-b border-white/5">
              <h2 className="font-editorial text-2xl text-white uppercase font-bold flex items-center">
                <SafeIcon name="Activity" className="w-5 h-5 mr-3 text-yellow-electric" />
                Featured Daily News
              </h2>
            </header>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {((loadingPosts && activeFilter !== 'SOCIAL') || (loadingSocial && (activeFilter === 'SOCIAL' || activeFilter === 'ALL'))) ? (
                <div className="col-span-full"><SocialSkeleton /></div>
              ) : (
                dailyNewsPosts.map((post, index) => {
                  const isFeatured = index === 0;
                  return (
                    <Link to={post.isExternal ? post.externalUrl : `/articles/${post.slug}`} key={post.id} className={`block h-full group ${isFeatured ? 'md:col-span-2 lg:col-span-2' : ''}`} target={post.isExternal ? '_blank' : '_self'} rel={post.isExternal ? 'noopener noreferrer' : ''}>
                      <article className={`interactive-card flex flex-col h-full rounded-sm border-b-yellow-electric/20 hover:-translate-y-1 hover:shadow-2xl hover:border-yellow-electric transition-all duration-300 p-8 ${isFeatured ? 'deco-frame border border-yellow-electric shadow-[0_0_20px_rgba(253,224,71,0.5)]' : ''}`}>
                                                <div className="block relative w-full h-48 md:h-64 overflow-hidden border-b border-phthalo-deep bg-zinc-900 rounded-t-sm mb-4">
                          {post.imageUrl ? (
                            <img
                              src={post.imageUrl}
                              alt={post.title.rendered}
                              className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 opacity-80 group-hover:opacity-100"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-[#050505] to-zinc-900 group-hover:scale-105 transition-transform duration-700 relative overflow-hidden">
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(253,224,71,0.1)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                              <svg className="absolute inset-0 w-full h-full opacity-20 text-yellow-electric mix-blend-overlay group-hover:opacity-40 transition-opacity duration-700" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                  <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                                  </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#gridPattern)" />
                              </svg>
                              <div className="absolute inset-0 border-[0.5px] border-yellow-electric/10 m-4 group-hover:border-yellow-electric/30 transition-colors duration-700"></div>
                              <div className="absolute inset-0 border-[0.5px] border-yellow-electric/5 m-8 group-hover:border-yellow-electric/20 transition-colors duration-700 delay-100"></div>
                            </div>
                          )}
                        </div>
                        <div className="mb-auto">
                          <div className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold mb-2 flex items-center space-x-2">
                            <SafeIcon name="Activity" className="w-4 h-4" />
                            <span>Daily News</span>
                          </div>
                          <div className="font-mono text-[10px] text-zinc-500 tracking-widest uppercase mb-4">
                            {formatDate(post.date)}
                          </div>
                          <h3 className="font-editorial font-bold text-2xl text-white mb-4 group-hover:text-yellow-electric transition-colors line-clamp-3">
                            <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(stripHtml(post.title.rendered)) }} />
                          </h3>
                          {post.isExternal ? (
                             <div className="text-text-muted text-sm leading-relaxed line-clamp-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.excerpt.rendered) }} />
                          ) : (
                             <p className="text-text-muted text-sm leading-relaxed line-clamp-4">
                               <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(stripHtml(post.excerpt.rendered)) }} />
                             </p>
                          )}
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-gray-500">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest">{post.acf?.read_time || '10 Min'}</span>
                          <SafeIcon name={post.isExternal ? "ExternalLink" : "ArrowRight"} className="w-5 h-5 group-hover:text-yellow-electric transition-colors" />
                        </div>
                      </article>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* Tier 2: Audio & Video Hub */}
        {(activeFilter === 'ALL' || activeFilter === 'AUDIO' || activeFilter === 'VIDEO') && (
          <section className="mb-16">
            <header className="mb-8 pb-4 border-b border-white/5">
              <h2 className="font-editorial text-2xl text-white uppercase font-bold flex items-center">
                <SafeIcon name="Mic" className="w-5 h-5 mr-3 text-yellow-electric" />
                Audio & Video Hub
              </h2>
            </header>
            <MediaPlaylist />
          </section>
        )}

        {/* Tier 3: The Archive */}
        <section>
          <header className="mb-8 pb-4 border-b border-white/5">
            <h2 className="font-editorial text-2xl text-white uppercase font-bold flex items-center">
              <SafeIcon name="Archive" className="w-5 h-5 mr-3 text-yellow-electric" />
              The Archive
            </h2>
          </header>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {((loadingPosts && activeFilter !== 'SOCIAL') || (loadingSocial && (activeFilter === 'SOCIAL' || activeFilter === 'ALL'))) && (
              <div className="col-span-full"><SocialSkeleton /></div>
            )}
            {archivePosts.length > 0 ? (
              archivePosts.map((post, index) => {
                if (post.isSocialError) {
                  return (
                    <div key={post.id} className="interactive-card p-8 flex flex-col group h-full rounded-sm border-b-yellow-electric/20 justify-center items-center">
                       <span className="font-mono text-sm tracking-widest text-yellow-electric">[FEED_UNAVAILABLE] - Content Currently Offline</span>
                    </div>
                  );
                }

                return (
                  <Link to={post.isExternal ? post.externalUrl : `/articles/${post.slug}`} key={post.id} className={`block h-full group`} target={post.isExternal ? '_blank' : '_self'} rel={post.isExternal ? 'noopener noreferrer' : ''}>
                    <article className={`interactive-card flex flex-col h-full rounded-sm border-b-yellow-electric/20 hover:-translate-y-1 hover:shadow-2xl hover:border-yellow-electric transition-all duration-300 ${post.acf?.category_label?.toUpperCase() === 'SOCIAL' && post.imageUrl ? '' : 'p-8'}`}>
                      {post.acf?.category_label?.toUpperCase() === 'SOCIAL' && post.imageUrl ? (
                        <div className="relative w-full aspect-square md:aspect-video mb-6">
                          <div className="w-full h-full overflow-hidden rounded-t-sm"><img src={DOMPurify.sanitize(post.imageUrl)} alt="Social Post" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102" /></div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                          <div className="absolute top-4 left-4 z-10 font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold flex items-center space-x-2 bg-black/50 p-2 rounded-sm backdrop-blur-sm border border-white/10">
                            <SafeIcon name="Globe" className="w-4 h-4" />
                            <span>{post.acf?.category_label || 'SOCIAL'}</span>
                          </div>
                        </div>
                      ) : null}
                      <div className={`mb-auto ${post.acf?.category_label?.toUpperCase() === 'SOCIAL' && post.imageUrl ? 'px-8 pb-8' : ''}`}>
                        {(!post.imageUrl || post.acf?.category_label?.toUpperCase() !== 'SOCIAL') && (
                          <>
                            <div className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold mb-2 flex items-center space-x-2">
                              <SafeIcon name={post.acf?.category_label?.toUpperCase() === 'VIDEO' ? 'Video' : post.acf?.category_label?.toUpperCase() === 'AUDIO' ? 'Mic' : post.acf?.category_label?.toUpperCase() === 'SOCIAL' ? 'Globe' : 'Activity'} className="w-4 h-4" />
                              <span>{post.acf?.category_label || 'Article'}</span>
                            </div>
                            <div className="font-mono text-[10px] text-zinc-500 tracking-widest uppercase mb-4">
                              {formatDate(post.date)}
                            </div>
                          </>
                        )}
                        <h3 className="font-editorial font-bold text-2xl text-white mb-4 group-hover:text-yellow-electric transition-colors line-clamp-3">
                          <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(stripHtml(post.title.rendered)) }} />
                        </h3>
                        {post.isExternal ? (
                           <div className="text-text-muted text-sm leading-relaxed line-clamp-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.excerpt.rendered) }} />
                        ) : (
                           <p className="text-text-muted text-sm leading-relaxed line-clamp-4">
                             <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(stripHtml(post.excerpt.rendered)) }} />
                           </p>
                        )}
                      </div>
                      <div className={`mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-gray-500 ${post.acf?.category_label?.toUpperCase() === 'SOCIAL' && post.imageUrl ? 'mx-8 mb-8' : ''}`}>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest">{post.acf?.read_time || '10 Min'}</span>
                        <SafeIcon name={post.isExternal ? "ExternalLink" : "ArrowRight"} className="w-5 h-5 group-hover:text-yellow-electric transition-colors" />
                      </div>
                    </article>
                  </Link>
                );
              })
            ) : (!loadingPosts && !loadingSocial && dailyNewsPosts.length === 0) ? (
              <div className="col-span-full py-20 text-center text-text-muted font-light text-lg">
                No entries found for {activeFilter}.
              </div>
            ) : null}
          </div>
        </section>

      </div>
    </div>
  );
};

export default NewsMedia;
