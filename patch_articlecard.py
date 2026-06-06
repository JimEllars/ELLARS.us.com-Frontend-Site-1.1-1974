import re

with open('src/components/intel/ArticleCard.jsx', 'r') as f:
    content = f.read()

old_content = """  return (
    <article className="interactive-card group flex flex-col h-full rounded-sm overflow-hidden">
      <Link to={`/articles/${post.slug}`} className="block relative aspect-video overflow-hidden border-b border-phthalo-deep">
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
          <Link to={`/articles/${post.slug}`} className="text-white hover:text-yellow-electric transition-colors">
            <SafeIcon name="ArrowRight" className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </article>
  );"""

new_content = """  return (
    <Link to={`/articles/${post.slug}`} className="block h-full group">
      <article className="interactive-card flex flex-col h-full rounded-sm overflow-hidden hover:-translate-y-1 hover:shadow-2xl hover:border-yellow-electric transition-all duration-300">
        <div className="block relative aspect-video overflow-hidden border-b border-phthalo-deep min-h-[250px] bg-void">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={post.title.rendered}
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 opacity-80 group-hover:opacity-100"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-void group-hover:scale-105 transition-transform duration-700 min-h-[250px]">
              <SafeIcon name="Terminal" className="w-12 h-12 text-yellow-electric opacity-80 group-hover:opacity-100 transition-opacity" />
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
  );"""

content = content.replace(old_content, new_content)

with open('src/components/intel/ArticleCard.jsx', 'w') as f:
    f.write(content)
