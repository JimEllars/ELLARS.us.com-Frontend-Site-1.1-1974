with open('src/pages/ArticleDetail.jsx', 'r') as f:
    content = f.read()

# Requirements:
# 1. Add a strict structural guard within the initialization hook checking for invalid or non-existent article identification parameters.
# 2. Graceful Degradation: If the active asynchronous routing cycle yields an empty profile lookup, trigger an immediate, high-fidelity Art Deco error card boundary with a primary call-to-action button leading cleanly back to the global /news-media hub view. This eliminates white-screen hazards entirely.

new_guard_code = """
  useEffect(() => {
    let isMounted = true;

    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      setFallbackMode(true);
      setLoading(false);
      return;
    }

    async function load() {
"""

content = content.replace("""
  useEffect(() => {
    let isMounted = true;

    async function load() {""", new_guard_code)

fallback_ui = """
  if (fallbackMode || !post) {
    return (
      <div className="pt-40 min-h-screen flex items-center justify-center p-6 bg-grid">
        <div className="deco-frame max-w-lg w-full bg-surface border border-yellow-electric/30 p-12 text-center rounded-sm">
          <SafeIcon name="AlertTriangle" className="w-12 h-12 text-yellow-electric mx-auto mb-6" />
          <h2 className="font-editorial text-2xl text-white uppercase tracking-widest mb-4">Record Not Found</h2>
          <p className="text-text-muted font-light mb-8 text-sm leading-relaxed">
            The requested technical dispatch or strategic insight could not be located in the current database index. The record may have been archived or explicitly redacted.
          </p>
          <Link to="/news-media" className="inline-block bg-white text-black font-editorial font-bold text-xs uppercase tracking-widest px-8 py-4 hover:bg-yellow-electric transition-colors rounded-sm shadow-[0_0_15px_rgba(253,224,71,0.4)]">
            Return to Hub
          </Link>
        </div>
      </div>
    );
  }
"""

content = content.replace("""  if (fallbackMode) return <div className="pt-40 text-center font-editorial text-yellow-electric animate-pulse text-xl">[DISPATCH_BUFFER_ACTIVE]</div>;
  if (!post) return <div className="pt-40 text-center text-white">404: Article Not Found</div>;""", fallback_ui)

with open('src/pages/ArticleDetail.jsx', 'w') as f:
    f.write(content)
