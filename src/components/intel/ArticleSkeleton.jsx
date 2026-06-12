import React from 'react';

const ArticleSkeleton = () => {
  return (
    <article className="interactive-card flex flex-col h-full rounded-sm overflow-hidden border border-white/5 bg-zinc-900 animate-pulse">
      <div className="block relative w-full h-64 md:h-80 overflow-hidden border-b border-white/5 bg-zinc-800">
      </div>

      <div className="p-8 flex flex-col flex-grow bg-zinc-900">
        <div className="mb-4 h-3 w-24 bg-zinc-800 rounded"></div>

        <div className="space-y-2 mb-4">
          <div className="h-6 w-full bg-zinc-800 rounded"></div>
          <div className="h-6 w-3/4 bg-zinc-800 rounded"></div>
        </div>

        <div className="space-y-2 mb-6 flex-grow">
          <div className="h-4 w-full bg-zinc-800 rounded"></div>
          <div className="h-4 w-full bg-zinc-800 rounded"></div>
          <div className="h-4 w-2/3 bg-zinc-800 rounded"></div>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
          <div className="h-3 w-20 bg-zinc-800 rounded"></div>
          <div className="h-5 w-5 bg-zinc-800 rounded"></div>
        </div>
      </div>
    </article>
  );
};

export default ArticleSkeleton;
