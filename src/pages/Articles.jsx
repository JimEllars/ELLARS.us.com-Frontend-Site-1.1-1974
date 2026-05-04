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
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const data = await getLatestPosts(12);
        if (isMounted) {
          if (!data || data.length === 0) {
            setFallbackMode(true);
          } else {
            setPosts(data);
          }
          setLoading(false);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setFallbackMode(true);
          setLoading(false);
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="pt-32 pb-20 min-h-screen bg-transparent">
      <Helmet>
        <meta name="robots" content="index, follow" />
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

        {fallbackMode ? (
          <div className="py-20 text-center font-editorial text-yellow-electric animate-pulse text-xl">
            [DISPATCH_BUFFER_ACTIVE]
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="interactive-card p-8 min-h-[400px] animate-pulse bg-yellow-electric/5 border border-yellow-electric/20">
                <div className="aspect-video bg-yellow-electric/20 mb-6"></div>
                <div className="w-full h-8 bg-yellow-electric/30 mb-4"></div>
                <div className="w-full h-20 bg-yellow-electric/20"></div>
              </div>
            ))
          ) : (
            posts.map(post => <ArticleCard key={post.id} post={post} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Articles;