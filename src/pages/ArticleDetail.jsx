import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPostBySlug, formatDate } from '@/lib/api';
import SafeIcon from '@/common/SafeIcon';

const ArticleDetail = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getPostBySlug(slug);
      setPost(data);
      setLoading(false);
    }
    load();
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) return <div className="pt-40 text-center font-editorial text-gold-base animate-pulse">DECRYPTING TRANSMISSION...</div>;
  if (!post) return <div className="pt-40 text-center text-white">404: Intel Not Found</div>;

  const imageUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200';

  return (
    <div className="pt-24 min-h-screen">
      <div className="relative h-[60vh] overflow-hidden">
        <img 
          src={imageUrl} 
          alt={post.title.rendered} 
          className="w-full h-full object-cover grayscale opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-10 md:p-20">
          <div className="max-w-4xl mx-auto">
            <Link to="/intel" className="inline-flex items-center space-x-2 text-gold-base mb-8 hover:text-white transition-colors uppercase tracking-widest text-[10px] font-bold">
              <SafeIcon name="ArrowLeft" className="w-4 h-4" />
              <span>Back to Intel</span>
            </Link>
            <h1 className="font-editorial font-black text-4xl md:text-6xl text-white mb-6 leading-tight">
              {post.title.rendered}
            </h1>
            <div className="flex items-center space-x-6 text-gray-400 text-xs uppercase tracking-[0.2em] font-bold">
              <span>{formatDate(post.date)}</span>
              <span className="w-1 h-1 bg-gold-base rounded-full"></span>
              <span>{post.acf?.read_time || '10 Min Read'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-20">
        <div 
          className="prose prose-invert prose-gold max-w-none text-text-muted text-lg leading-relaxed font-light article-content"
          dangerouslySetInnerHTML={{ __html: post.content.rendered }}
        />
        
        <div className="mt-20 pt-10 border-t border-white/10 flex justify-between items-center">
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