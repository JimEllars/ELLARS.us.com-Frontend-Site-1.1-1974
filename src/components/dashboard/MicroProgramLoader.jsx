import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("MicroProgramLoader Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const EmptyState = ({ message = "Tool currently unavailable" }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center border border-white/10 bg-black/40 backdrop-blur-md rounded-sm deco-brackets mt-8">
    <div className="w-12 h-12 rounded-full border border-yellow-electric/20 flex items-center justify-center mb-4">
      <svg className="w-6 h-6 text-yellow-electric" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <h3 className="text-white font-editorial font-bold text-xl mb-2">Unavailable</h3>
    <p className="text-gray-400 text-sm max-w-md font-mono uppercase tracking-widest text-xs">
      {message}
    </p>
  </div>
);

const LoaderSkeleton = () => (
  <div className="w-full h-full min-h-[400px] flex flex-col gap-4 animate-pulse p-4 border border-white/10 bg-black/40 backdrop-blur-md rounded-sm">
    <div className="w-1/3 h-8 bg-white/5 rounded"></div>
    <div className="w-full flex-grow min-h-[300px] bg-white/5 rounded mt-4"></div>
  </div>
);

const MicroProgramIframe = ({ entryUrl, programId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef(null);
  const token = useAppStore(state => state.userToken);

  useEffect(() => {
    let timeoutId;
    let isMounted = true;

    const handleLoad = () => {
      if (!isMounted) return;
      setIsLoading(false);
      clearTimeout(timeoutId);

      // Securely pass token to the iframe using postMessage
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          const targetOrigin = new URL(entryUrl).origin;
          iframeRef.current.contentWindow.postMessage(
            { type: 'AXIM_AUTH_CONTEXT', token, programId },
            targetOrigin
          );
        } catch (err) {
          console.error("Failed to parse entryUrl or postMessage:", err);
          if (isMounted) setHasError(true);
        }
      }
    };

    const handleError = () => {
      if (!isMounted) return;
      setIsLoading(false);
      setHasError(true);
      clearTimeout(timeoutId);
    };

    // Timeout mechanism (10s)
    timeoutId = setTimeout(() => {
      if (isMounted && isLoading) {
        setIsLoading(false);
        setHasError(true);
      }
    }, 10000);

    const iframeEl = iframeRef.current;
    if (iframeEl) {
      // For cross-origin iframes, 'load' event fires when it completes loading.
      // We can't always catch inner 404s depending on CORS, but we can rely on load or timeout.
      iframeEl.addEventListener('load', handleLoad);
      iframeEl.addEventListener('error', handleError);
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (iframeEl) {
        iframeEl.removeEventListener('load', handleLoad);
        iframeEl.removeEventListener('error', handleError);
      }
    };
  }, [entryUrl, token, programId, isLoading]);

  if (hasError) {
    return <EmptyState message="The micro-program failed to load or timed out. Please try again later." />;
  }

  return (
    <div className="relative w-full h-full min-h-[400px] flex flex-col">
      {isLoading && (
        <div className="absolute inset-0 z-10">
          <LoaderSkeleton />
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={entryUrl}
        title={`Micro-program ${programId}`}
        className={`w-full flex-grow border-0 rounded-sm transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
};

export const MicroProgramLoader = ({ programId, entryUrl, requiredPermissions }) => {
  return (
    <ErrorBoundary fallback={<EmptyState message="A critical error occurred while loading this program." />}>
      {entryUrl ? (
        <MicroProgramIframe entryUrl={entryUrl} programId={programId} />
      ) : (
        <EmptyState message="Invalid entry URL for the micro-program." />
      )}
    </ErrorBoundary>
  );
};

export default MicroProgramLoader;
