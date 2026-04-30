import React from 'react';
import { Link } from 'react-router-dom';
import SafeIcon from '@/common/SafeIcon';
import { stripHtml, formatDate } from '@/lib/api';

const ArticleCard = ({ post }) => {
  const imageUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;

  return (
    <article className="interactive-card group flex flex-col h-full rounded-sm overflow-hidden">
      <Link to={`/intel/${post.slug}`} className="block relative aspect-video overflow-hidden border-b border-phthalo-deep">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={post.title.rendered}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 opacity-80 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface group-hover:scale-105 transition-transform duration-700">
            <SafeIcon name="Terminal" className="w-12 h-12 text-yellow-electric opacity-80 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
        <div className="absolute top-4 left-4 glass-panel px-3 py-1">
          <span className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold">
            {post.acf?.category_label || 'Dispatch'}
          </span>
        </div>
      </Link>
      
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
        
        <div className="mt-auto pt-6 border-t border-phthalo-deep flex items-center justify-between text-gray-500">
          <span className="text-[10px] font-editorial font-bold uppercase tracking-widest">
            {post.acf?.read_time || '8 Min Read'}
          </span>
          <Link to={`/intel/${post.slug}`} className="text-white hover:text-yellow-electric transition-colors">
            <SafeIcon name="ArrowRight" className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default ArticleCard;