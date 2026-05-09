import React, { useEffect, useState } from 'react';
import { useLoader } from '@/components/Layout';
import SafeIcon from '@/common/SafeIcon';
import { Helmet } from 'react-helmet-async';
import { getLatestPosts, stripHtml } from '@/lib/api';

const RantsArchive = () => {
  const { setIsLoading } = useLoader();
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

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

  useEffect(() => {
    // Inject the pod.co player script
    const script = document.createElement('script');
    script.src = 'https://play.pod.co/embed/frame-v1.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const filters = ['ALL', 'VIDEO', 'AUDIO', 'DISPATCH'];

  const filteredPosts = posts.filter(post => {
    if (activeFilter === 'ALL') return true;
    const category = post.acf?.category_label?.toUpperCase() || '';
    return category === activeFilter;
  });

  return (
    <div className="pt-32 pb-20 min-h-screen bg-transparent">
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>Rants Archive | James Ellars</title>
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Rants Archive | James Ellars" />
        <meta property="og:image" content="https://wp.axim.us.com/wp-content/uploads/2026/04/1776866096564_04266f9841304c5e8d53190e26a26e95.webp" />
        <meta name="description" content="The official hub for the Ellars Rants show. High-resolution analysis on economics, technology, and the future of civic infrastructure." />
      </Helmet>
      <div className="max-w-7xl mx-auto px-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl">
            <span className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold block mb-4">Unfiltered Discourse</span>
            <h1 className="font-editorial font-black text-5xl md:text-7xl text-white leading-tight">
              ELLARS <span className="text-electric-gold">RANTS.</span>
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
                className={`px-6 py-2 font-editorial text-[10px] uppercase tracking-widest font-bold rounded-sm transition-all ${activeFilter === f ? 'bg-yellow-electric text-black border-transparent' : 'text-gray-400 hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </header>

        {/* Podcast Player Integration */}
        <div className="podcastdotco-wrapper mb-16">
          <iframe
            data-target="rants"
            src="https://play.pod.co/rants"
            frameBorder="0"
            width="100%"
            scrolling="no"
            style={{ overflow: 'hidden', maxWidth: '750px', height: '500px' }}
            className="podcastdotco-player podcastdotco-player--podcast mx-auto"
            title="Ellars Rants Player"
          >
          </iframe>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loadingPosts ? (
            <div className="col-span-full py-20 text-center text-yellow-electric font-mono text-sm tracking-widest">
              [DISPATCH_BUFFER_ACTIVE]
            </div>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <article key={post.id} className="interactive-card p-8 flex flex-col group h-full rounded-sm border-b-purple-neon/20 hover:border-yellow-electric transition-colors">
                <div className="mb-auto">
                  <div className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold mb-4 flex items-center space-x-2">
                    <SafeIcon name={post.acf?.category_label?.toUpperCase() === 'VIDEO' ? 'Video' : post.acf?.category_label?.toUpperCase() === 'AUDIO' ? 'Mic' : 'Activity'} className="w-4 h-4" />
                    <span>{post.acf?.category_label || 'Dispatch'}</span>
                  </div>
                  <h3 className="font-editorial font-bold text-2xl text-white mb-4 group-hover:text-yellow-electric transition-colors line-clamp-3">
                    {stripHtml(post.title.rendered)}
                  </h3>
                  <p className="text-text-muted text-sm leading-relaxed line-clamp-4">
                    {stripHtml(post.excerpt.rendered)}
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-gray-500">
                  <span className="text-[10px] font-editorial font-bold uppercase tracking-widest">{post.acf?.read_time || '10 Min'}</span>
                  <SafeIcon name="ArrowRight" className="w-5 h-5 group-hover:text-yellow-electric transition-colors" />
                </div>
              </article>
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

export default RantsArchive;
