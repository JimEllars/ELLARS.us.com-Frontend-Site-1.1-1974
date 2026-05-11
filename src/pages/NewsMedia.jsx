import React, { useEffect, useState, useRef } from 'react';
import { useLoader } from '@/components/Layout';
import SafeIcon from '@/common/SafeIcon';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { getLatestPosts, stripHtml } from '@/lib/api';
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

        ctx.fillStyle = isPlaying ? '#9400FF' : '#4ade80';
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      if (isPlaying) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        animationFrameId = setTimeout(() => requestAnimationFrame(render), 500);
      }
    };

    render();

    return () => {
      if (isPlaying) cancelAnimationFrame(animationFrameId);
      else clearTimeout(animationFrameId);
    };
  }, [isPlaying]);

  return <canvas ref={canvasRef} width="200" height="60" className="w-full h-full opacity-50" />;
};

const NewsMedia = () => {
  const { setIsLoading } = useLoader();
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setIsLoading(false);
  }, [setIsLoading]);

  useEffect(() => {
    let isMounted = true;
    async function fetchPosts() {
      try {
        const data = await getLatestPosts(20);
        if (isMounted) {
          setPosts(data);
          setLoadingPosts(false);
        }
      } catch (e) {
        if (isMounted) {
          setLoadingPosts(false);
        }
      }
    }
    fetchPosts();

    return () => { isMounted = false; };
  }, []);

  const filters = ['ALL', 'VIDEO', 'AUDIO', 'ARTICLES'];

  const filteredPosts = posts.filter(post => {
    if (activeFilter === 'ALL') return true;
    let category = post.acf?.category_label?.toUpperCase() || '';
    if (category === 'DISPATCH' || category === 'BUSINESS BRIEFING') category = 'ARTICLES';
    if (category === activeFilter) return true;
    return false;
  });

  return (
    <div className="pt-32 pb-20 min-h-screen bg-transparent">
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>News & Media Hub | James Ellars</title>
        <meta property="og:type" content="website" />
        <meta property="og:title" content="News & Media Hub | James Ellars" />
        <meta property="og:image" content="https://wp.axim.us.com/wp-content/uploads/2026/04/1776866096564_04266f9841304c5e8d53190e26a26e95.webp" />
        <meta name="description" content="The Latest News, Updates and Media regarding the systems and strategies of James Ellars." />
      </Helmet>
      <div className="max-w-7xl mx-auto px-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl">
            <span className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold block mb-4">Synchronizing Fleet Intelligence</span>
            <h1 className="font-editorial font-black text-5xl md:text-7xl text-white leading-tight">
              NEWS & MEDIA <span className="text-[#9400FF]">HUB.</span>
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
                className={`px-6 py-2 font-editorial text-[10px] uppercase tracking-widest font-bold rounded-sm transition-all ${activeFilter === f ? 'bg-[#9400FF] text-white border-transparent shadow-[0_0_15px_rgba(148,0,255,0.4)]' : 'text-gray-400 hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </header>

        {/* Custom Audio Player Integration */}
        <div className="interactive-card p-8 mb-16 border border-white/10 rounded-sm bg-surface flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/3 flex flex-col gap-4">
               <h3 className="text-white font-editorial font-bold text-2xl uppercase">Latest Signal</h3>
               <p className="text-text-muted text-sm leading-relaxed">Incoming Transmission: The Ethics of Algorithms</p>
               <div className="flex items-center gap-4">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 rounded-full bg-[#9400FF] flex items-center justify-center text-white hover:bg-[#a855f7] transition-colors shadow-[0_0_15px_rgba(148,0,255,0.5)]">
                        <SafeIcon name={isPlaying ? "Pause" : "Play"} className={`w-6 h-6 ${!isPlaying && 'ml-1'}`} />
                    </button>
                    <div className="text-[#4ade80] font-mono text-sm uppercase tracking-widest">
                        {isPlaying ? 'Receiving...' : 'Standby'}
                    </div>
               </div>
            </div>
            <div className="w-full md:w-2/3 h-24 bg-void border border-white/5 rounded-sm p-4 relative overflow-hidden">
                <FrequencyVisualizer isPlaying={isPlaying} />
            </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loadingPosts ? (
            <div className="col-span-full py-20 text-center text-yellow-electric font-mono text-sm tracking-widest">
              [DISPATCH_BUFFER_ACTIVE]
            </div>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <Link to={`/articles/${post.slug}`} key={post.id} className="block h-full">
              <article className="interactive-card p-8 flex flex-col group h-full rounded-sm border-b-[#9400FF]/20 hover:border-[#9400FF] transition-colors">
                <div className="mb-auto">
                  <div className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold mb-4 flex items-center space-x-2">
                    <SafeIcon name={post.acf?.category_label?.toUpperCase() === 'VIDEO' ? 'Video' : post.acf?.category_label?.toUpperCase() === 'AUDIO' ? 'Mic' : 'Activity'} className="w-4 h-4" />
                    <span>{post.acf?.category_label || 'Article'}</span>
                  </div>
                  <h3 className="font-editorial font-bold text-2xl text-white mb-4 group-hover:text-[#9400FF] transition-colors line-clamp-3">
                    {stripHtml(post.title.rendered)}
                  </h3>
                  <p className="text-text-muted text-sm leading-relaxed line-clamp-4">
                    {stripHtml(post.excerpt.rendered)}
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-gray-500">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest">{post.acf?.read_time || '10 Min'}</span>
                  <SafeIcon name="ArrowRight" className="w-5 h-5 group-hover:text-[#9400FF] transition-colors" />
                </div>
              </article>
              </Link>
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-text-muted font-light text-lg">
              No entries found for {activeFilter}.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default NewsMedia;
