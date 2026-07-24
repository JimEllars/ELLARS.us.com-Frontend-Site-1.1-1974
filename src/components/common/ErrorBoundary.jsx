import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-void flex items-center justify-center p-6 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-electric/5 rounded-full blur-[100px]"></div>
          </div>
          <div className="w-full max-w-md deco-frame p-8 relative z-10 bg-void/80 backdrop-blur-md text-center">
            <div className="w-12 h-12 rounded-full border border-yellow-electric/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-yellow-electric" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="font-editorial font-black text-2xl tracking-tighter text-white uppercase mb-4">
              System <span className="text-yellow-electric">Error</span>
            </h1>
            <div className="h-px w-16 bg-yellow-electric/50 mx-auto mb-4"></div>
            <p className="font-mono text-sm text-gray-400 uppercase tracking-widest mb-8">
              We encountered an unexpected system error.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-4 bg-yellow-electric text-black font-editorial font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:bg-yellow-400 transition-colors hover:shadow-lg hover:shadow-blue-500/20"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
