import { Helmet } from 'react-helmet-async';
import React, { useEffect, useState } from 'react';
import { useLoader } from '@/components/Layout';
import { getLatestPosts } from '@/lib/api';
import ArticleCard from '@/components/intel/ArticleCard';
import SafeIcon from '@/common/SafeIcon';

const Articles = () => {
  const { setIsLoading } = useLoader();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const data = await getLatestPosts(12);
      setPosts(data);
      setLoading(false);
      setIsLoading(false);
    }
    load();
  }, []);

  return (
    <div className="pt-32 pb-20 min-h-screen bg-grid">
      <Helmet>
        <title>Articles | James Ellars</title>
        <meta name="description" content="Technical breakdowns and strategic blueprints for the modernization of American civic infrastructure." />
      </Helmet>
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-16">
          <div className="inline-flex items-center space-x-2 border border-yellow-electric/30 rounded-sm px-3 py-1 mb-6 bg-yellow-electric/10 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
            <SafeIcon name="Terminal" className="w-3 h-3 text-yellow-electric" />
            <span className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold">Transmission Archive</span>
          </div>
          <h1 className="font-editorial font-black text-5xl md:text-7xl text-white leading-tight">
            ARTICLES <br />
            <span className="opacity-50 uppercase">Dispatches.</span>
          </h1>
          <p className="text-text-muted mt-6 max-w-2xl text-lg font-light leading-relaxed">
            Technical breakdowns and strategic blueprints for the modernization of American civic infrastructure.
          </p>
        </header>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="interactive-card p-8 min-h-[400px] animate-pulse">
                <div className="aspect-video bg-white/5 mb-6"></div>
                <div className="w-full h-8 bg-white/10 mb-4"></div>
                <div className="w-full h-20 bg-white/5"></div>
              </div>
            ))
          ) : (
            posts.map(post => <ArticleCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </div>
  );
};

export default Articles;