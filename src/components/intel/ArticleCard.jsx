import React from 'react';
import { Link } from 'react-router-dom';
import SafeIcon from '@/common/SafeIcon';
import { stripHtml, formatDate } from '@/lib/api';

const ArticleCard = ({ post }) => {
  const imageUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;

  return (
    <Link to={post.slug ? `/articles/${post.slug}` : "#"} className="block h-full group" onClick={(e) => { if (!post.slug) e.preventDefault(); }}>
      <article className="interactive-card flex flex-col h-full rounded-sm overflow-hidden hover:-translate-y-1 hover:shadow-2xl hover:border-yellow-electric transition-all duration-300">
        <div className="block relative w-full h-64 md:h-80 overflow-hidden border-b border-phthalo-deep bg-zinc-900">
          {imageUrl ? (
            <img
              src={imageUrl}
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
          <div className="absolute top-4 left-4 glass-panel px-3 py-1 bg-black/50 backdrop-blur-sm border border-white/10 rounded-sm">
            <span className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold">
              {post.acf?.category_label || 'Dispatch'}
            </span>
          </div>
        </div>
        
        <div className="p-8 flex flex-col flex-grow">
          <div className="flex items-center space-x-2 text-[10px] text-yellow-electric font-bold uppercase tracking-widest mb-4">
            <SafeIcon name="Calendar" className="w-3 h-3 text-gray-500" />
            <span>{formatDate(post.date)}</span>
          </div>

          <h3 className="font-editorial font-bold text-xl text-white mb-4 group-hover:text-yellow-electric transition-colors line-clamp-2">
            {stripHtml(post.title.rendered)}
          </h3>

          <p className="text-text-muted text-sm leading-relaxed line-clamp-3 mb-6">
            {stripHtml(post.excerpt.rendered)}
          </p>

          <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-editorial font-bold uppercase tracking-widest">
              {post.acf?.read_time || '8 Min Read'}
            </span>
            <div className="text-white group-hover:text-yellow-electric transition-colors">
              <SafeIcon name="ArrowRight" className="w-5 h-5" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default ArticleCard;