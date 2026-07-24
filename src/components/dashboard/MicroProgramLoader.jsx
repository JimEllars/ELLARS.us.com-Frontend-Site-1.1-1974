import React, { useState, useEffect } from 'react';
import ErrorBoundary from '../common/ErrorBoundary';

const LoaderSkeleton = () => (
  <div className="w-full h-full min-h-[400px] flex flex-col gap-4 p-4 border border-white/10 bg-black/40 backdrop-blur-md rounded-sm">
    <div className="w-1/3 h-8 bg-white/5 rounded animate-pulse"></div>
    <div className="w-full flex-grow min-h-[300px] bg-white/5 rounded mt-4 animate-pulse"></div>
  </div>
);

const PlaceholderUI = ({ programId }) => (
  <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] p-12 text-center border border-white/10 bg-black/40 backdrop-blur-md rounded-sm deco-brackets">
    <div className="w-16 h-16 rounded-full border border-yellow-electric/20 flex items-center justify-center mb-6">
      <svg className="w-8 h-8 text-yellow-electric" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </div>
    <h3 className="text-white font-editorial font-bold text-2xl mb-2">Program Selected</h3>
    <p className="text-gray-400 text-sm max-w-md font-mono uppercase tracking-widest text-xs">
      Initializing {programId ? programId.replace(/-/g, ' ') : 'Module'}...
    </p>
    <div className="mt-8 flex items-center justify-center space-x-2">
       <span className="w-2 h-2 bg-yellow-electric rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
       <span className="w-2 h-2 bg-yellow-electric rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
       <span className="w-2 h-2 bg-yellow-electric rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
    </div>
  </div>
);

export const MicroProgramLoader = ({ programId }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [programId]);

  return (
    <ErrorBoundary>
      <div className="w-full h-full">
        {isLoading ? (
          <LoaderSkeleton />
        ) : (
          <PlaceholderUI programId={programId} />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default MicroProgramLoader;
