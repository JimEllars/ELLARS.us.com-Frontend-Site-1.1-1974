import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SafeIcon from '@/common/SafeIcon';
import { getLatestPosts, stripHtml } from '@/lib/api';

const RantsFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
        async function fetchPosts() {
      const data = await getLatestPosts(5); // Fetch a bit more to ensure we find a Daily News if it exists

      // Sort to prioritize Daily News
      const sortedData = [...data].sort((a, b) => {
        const isADaily = (a.title.rendered || '').toLowerCase().includes('daily news') || (a.acf?.category_label || '').toLowerCase() === 'daily news';
        const isBDaily = (b.title.rendered || '').toLowerCase().includes('daily news') || (b.acf?.category_label || '').toLowerCase() === 'daily news';
        if (isADaily && !isBDaily) return -1;
        if (!isADaily && isBDaily) return 1;
        return new Date(b.date) - new Date(a.date);
      }).slice(0, 3); // Keep only top 3

      setPosts(sortedData);
      setLoading(false);
    }
    fetchPosts();
  }, []);

  return (
    <section id="rants-feed" className="py-32 relative z-10 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl">
            <h2 className="tracking-[0.2em] uppercase font-deco text-yellow-electric mb-6 leading-tight text-4xl md:text-6xl">
              ARTICLES
            </h2>
            <p className="text-lg text-text-muted font-light leading-relaxed">
              Unfiltered analysis on the shifting tides of economics and community leadership.
            </p>
          </div>
          <Link to="/rants" className="btn-gold hidden md:inline-flex">View Entire Archive</Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="interactive-card p-8 min-h-[380px] animate-pulse">
                <div className="w-24 h-4 bg-white/10 mb-6"></div>
                <div className="w-full h-8 bg-white/10 mb-4"></div>
                <div className="w-full h-24 bg-white/5"></div>
              </div>
            ))
          ) : (
            posts.map((post, index) => {
              const isDailyNews = (post.title.rendered || '').toLowerCase().includes('daily news') || (post.acf?.category_label || '').toLowerCase() === 'daily news';
              const isFeatured = index === 0 && isDailyNews;

              return (
              <Link
                to={`/articles/${post.slug}`}
                key={post.id}
                className={`block group ${isFeatured ? 'md:col-span-2' : ''}`}
              >
                <article className={`interactive-card p-8 flex flex-col h-full rounded-sm hover:-translate-y-1 hover:shadow-2xl hover:border-yellow-electric hover:bg-yellow-electric/5 transition-all duration-300 ${isFeatured ? 'deco-frame border-yellow-electric shadow-[0_0_15px_rgba(253,224,71,0.2)]' : ''}`}>
                <div className="mb-auto">
                  <div className="font-editorial text-[10px] text-gold-base uppercase tracking-widest font-bold mb-4 flex items-center space-x-2">
                    <SafeIcon name="Activity" className="w-4 h-4" />
                    <span>Dispatch</span>
                  </div>
                  <h3 className="font-editorial font-bold text-2xl text-white mb-4 group-hover:text-gold-bright transition-colors line-clamp-3">
                    {stripHtml(post.title.rendered)}
                  </h3>
                  <p className="text-text-muted text-sm leading-relaxed line-clamp-4">
                    {stripHtml(post.excerpt.rendered)}
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-gray-500">
                  <span className="text-[10px] font-editorial font-bold uppercase tracking-widest">{post.acf?.read_time || '10 Min'}</span>
                  <SafeIcon name="ArrowRight" className="w-5 h-5 group-hover:text-white transition-colors" />
                </div>
              </article>
              </Link>
            )})
          )}
        </div>
      </div>
    </section>
  );
};

export default RantsFeed;