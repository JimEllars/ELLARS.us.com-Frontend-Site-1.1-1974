import React, { useEffect, useState } from 'react';
import SafeIcon from '@/common/SafeIcon';
import { getLatestPosts, stripHtml } from '@/lib/api';
import { Helmet } from 'react-helmet-async';

const RantsArchive = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');

  useEffect(() => {
    async function load() {
      const data = await getLatestPosts(12);
      setPosts(data);
      setLoading(false);
    }
    load();
  }, []);

  const filters = ['ALL', 'VIDEO', 'AUDIO', 'DISPATCH'];


  const filteredPosts = activeFilter === 'ALL'
  ? posts
  : posts.filter(post => post.acf?.category_label?.toUpperCase() === activeFilter);




  return (

    <div className="pt-32 pb-20 min-h-screen bg-grid">
      <Helmet>
        <title>Rants Archive | James Ellars</title>
        <meta name="description" content="The official hub for the Ellars Rants show. High-resolution analysis on economics, technology, and the future of civic infrastructure." />
      </Helmet>
      <div className="max-w-7xl mx-auto px-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl">
            <span className="font-editorial text-[10px] text-phthalo-glow uppercase tracking-widest font-bold block mb-4">Unfiltered Discourse</span>
            <h1 className="font-editorial font-black text-5xl md:text-7xl text-white leading-tight">
              ELLARS <span className="text-gradient-gold">RANTS.</span>
            </h1>
            <p className="text-text-muted mt-6 text-lg font-light leading-relaxed">
              The official hub for the Ellars Rants show. High-resolution analysis on economics, technology, and the future of civic infrastructure.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 bg-surface p-1 border border-white/10 rounded-sm">
            {filters.map(f => (
              <button 
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-6 py-2 font-editorial text-[10px] uppercase tracking-widest font-bold rounded-sm transition-all ${activeFilter === f ? 'bg-gradient-to-r from-phthalo-glow to-purple-neon text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] border-transparent' : 'text-gray-400 hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </header>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
             Array(6).fill(0).map((_, i) => (
              <div key={i} className="interactive-card p-8 min-h-[350px] animate-pulse">
                <div className="w-full h-48 bg-white/5 mb-6"></div>
                <div className="w-3/4 h-6 bg-white/10 mb-4"></div>
                <div className="w-full h-16 bg-white/5"></div>
              </div>
            ))
          ) : (
            filteredPosts.map((post, index) => (
              <article key={post.id} className="interactive-card group flex flex-col h-full rounded-sm overflow-hidden">
                <div className="aspect-video bg-black relative overflow-hidden border-b border-white/5">
                   <img 
                    src={`https://images.unsplash.com/photo-${1559523161 + index}-0fc0d8b38a7a?auto=format&fit=crop&q=80&w=800`} 
                    alt={post.title.rendered} 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000 grayscale group-hover:grayscale-0"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-electric to-purple-neon opacity-90 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(197,160,89,0.4)]">
                      <SafeIcon name="Play" className="w-6 h-6 text-black ml-1" />
                    </div>
                  </div>
                  <div className="absolute top-4 left-4 glass-panel px-3 py-1">
                    <span className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold">EP {post.acf?.episode_number || `04${5-index}`}</span>
                  </div>
                </div>
                <div className="p-8 flex flex-col flex-grow">
                  <h3 className="font-editorial font-bold text-xl text-white mb-4 group-hover:text-yellow-electric transition-colors line-clamp-2">
                    {stripHtml(post.title.rendered)}
                  </h3>
                  <p className="text-text-muted text-sm leading-relaxed line-clamp-3 mb-6">
                    {stripHtml(post.excerpt.rendered)}
                  </p>
                  <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between text-gray-500">
                    <div className="flex items-center space-x-2">
                      <SafeIcon name="Clock" className="w-3 h-3" />
                      <span className="text-[10px] font-editorial font-bold uppercase tracking-widest">{post.acf?.read_time || '15 Min'}</span>
                    </div>
                    <SafeIcon name="ArrowRight" className="w-4 h-4 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RantsArchive;