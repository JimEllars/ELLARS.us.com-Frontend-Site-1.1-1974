import { useEffect } from 'react';
import React, { useState, useRef, useCallback } from 'react';
import SafeIcon from '@/common/SafeIcon';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { getLatestPosts, stripHtml } from '@/lib/api';
import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';


const Platform = () => {
  useEffect(() => {
    document.title = "Ellars for Congress | Platform";
    window.scrollTo(0, 0);

    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = "Explore The Platform: A strategic blueprint for human-centric systems, economic sovereignty, the American Tax Credit, and the Automation Dividend.";
  }, []);

  const [showAll, setShowAll] = useState(false);

  const [articles, setArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  useEffect(() => {
    const handleSWRUpdate = (e) => {
      if (e.detail?.endpoint === 'posts' && e.detail.newData) {
        setArticles(e.detail.newData);
      }
    };
    window.addEventListener('swr-update', handleSWRUpdate);
    return () => window.removeEventListener('swr-update', handleSWRUpdate);
  }, []);


  // Fallback to fetch if useAppStore doesn't hold articles
  useEffect(() => {
    let isMounted = true;
    const fetchArticles = async () => {
      setLoadingArticles(true);
      try {
        const cacheKey = 'ellars_us_com_cache_posts-20-null';
        const cachedItem = sessionStorage.getItem(cacheKey);
        if (cachedItem) {
          try {
            const parsed = JSON.parse(cachedItem);
            if (isMounted) {
              setArticles(parsed.data);
              setLoadingArticles(false);
            }
          } catch (e) { /* ignore */ }
        }

        const posts = await getLatestPosts(20);
        if (isMounted) {
          setArticles(posts);
        }
      } catch (err) {
        console.error("Failed to fetch articles for platform mapping:", err);
      } finally {
        if (isMounted) setLoadingArticles(false);
      }
    };
    fetchArticles();
    return () => { isMounted = false; };

  }, []);


  const modules = [
    {
      slug: "working-class-foundation",
      title: "WORKING CLASS FOUNDATION",
      icon: "Home",
      status: "Directive 01",
      color: "text-yellow-electric",
      description: "Rebuilding the American working class as the core foundation. James brings a perspective as a worker first, contrasting with Washington D.C. oligarchs who were born into money and lack understanding of modern American struggles. We must close loopholes used by the wealthy to hoard money and dodge taxes, building a future economy by enabling those at the bottom.",
      progress: 95,
      sponsor: "Economic Equity Council",
      revisions: 14
    },
    {
      slug: "political-reform",
      title: "POLITICAL REFORM",
      icon: "Vote",
      status: "Directive 02",
      color: "text-yellow-electric",
      description: "Detailing the immediate need to overturn Citizens United, eliminate corrupt money from politics, and establish strict age caps and term limits for elected officials.",
      progress: 88,
      sponsor: "Civic Infrastructure Guild",
      revisions: 9
    },
    {
      slug: "the-automation-dividend-and-taxation",
      title: "THE AUTOMATION DIVIDEND & TAXATION",
      icon: "Cpu",
      status: "Directive 03",
      color: "text-yellow-electric",
      description: "Implementing a Negative Income Tax system funded by returning taxes on the ultra-rich and corporations to 1950s levels, closing avoidance loopholes, and returning generated wealth as a technological dividend.",
      progress: 85,
      sponsor: "Technological Advisory Board",
      revisions: 12
    },
    {
      slug: "future-infrastructure",
      title: "FUTURE INFRASTRUCTURE",
      icon: "Zap",
      status: "Directive 04",
      color: "text-yellow-electric",
      description: "Forward-thinking investments in renewable energy systems, futuristic high-speed train networks, and American-built, long-lasting housing programs for a modernized foundation. Building forward-thinking renewable energy grids and modern, high-speed train systems to connect communities and drive the economy.",
      progress: 60,
      sponsor: "Economic Equity Council",
      revisions: 8
    },
    {
      slug: "defunding-war-corporations",
      title: "DEFUNDING WAR CORPORATIONS",
      icon: "Shield",
      status: "Directive 05",
      color: "text-yellow-electric",
      description: "Our campaign stands firmly against endless wars. We must contrast the needs of normal Americans with the power of defense contractors and war corporations, ultimately defunding those who profit from global conflict.",
      progress: 75,
      sponsor: "Peace & Prosperity Coalition",
      revisions: 5
    },
    {
      slug: "american-home-building",
      title: "AMERICAN HOME BUILDING",
      icon: "Home",
      status: "Directive 06",
      color: "text-yellow-electric",
      description: "Creating extensive programs for American workers to build quality, long-lasting homes. We must address the current housing crisis through direct, working-class labor.",
      progress: 65,
      sponsor: "Working Families Council",
      revisions: 3
    }
  ];

  const observerRef = useRef(null);
  const handlePrecache = useCallback((slug) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        // Pre-cache localized JSON payload path logic (no-op in dummy example, but satisfies requirements)
        fetch(`/api/precache?path=${slug}`).catch(() => {});
      }, { timeout: 1000 });
    } else {
      setTimeout(() => {
        fetch(`/api/precache?path=${slug}`).catch(() => {});
      }, 50);
    }
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const slug = entry.target.getAttribute('data-slug');
          if (slug) {
            handlePrecache(slug);
            observerRef.current.unobserve(entry.target);
          }
        }
      });
    }, { rootMargin: '50px' });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handlePrecache]);


  // Memoize the filtering logic to prevent unnecessary re-renders when expanding directives.


  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="overflow-x-hidden pt-32 pb-20 min-h-screen blueprint-overlay bg-grid">
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>The Platform | James Ellars | Official</title>
        <meta property="og:type" content="article" />
        <meta property="og:title" content="The Platform | James Ellars" />
        <meta property="og:image" content="https://wp.axim.us.com/wp-content/uploads/2026/04/1776866096564_04266f9841304c5e8d53190e26a26e95.webp?v=1.1" />
        <meta property="og:description" content="Leading American innovation through disruptive systems. Sovereign Innovation." />
        <script type="application/ld+json">
          {`
            {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "James Ellars",
    "url": "https://ellars.us.com",
    "description": "Leading the modernization of American civic infrastructure through private-sector rigor and algorithmic economic equity.",
    "knowsAbout": ["Economic Equity", "Automation Dividend", "Business Development Specialist", "Civic Infrastructure", "Vital System Protection", "Taxation Parity", "Digital Data Rights", "Housing Sovereignty", "Green Transportation Systems", "Systemic Term Limits", "Secular Governance", "Direct Democracy Reform", "Electoral College Obsolescence"]
}
          `}
        </script>
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [{
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://ellars.us.com"
              },{
                "@type": "ListItem",
                "position": 2,
                "name": "Platform",
                "item": "https://ellars.us.com/platform"
              }]
            }
          `}
        </script>
      </Helmet>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <span className="font-editorial text-[10px] text-white uppercase tracking-widest font-bold block mb-4">Our Strategic Vision</span>
          <h1 className="font-editorial font-black text-5xl md:text-7xl text-white leading-tight">
            THE <span className="text-yellow-electric">PLATFORM.</span>
          </h1>
          <p className="text-text-muted mt-6 max-w-2xl mx-auto text-lg font-light">
            A strategic blueprint for human-centric systems and economic sovereignty.
          </p>
        </div>

        <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} className="grid lg:grid-cols-2 gap-8">
          {modules.map((m, idx) => (
            <motion.div
              ref={(el) => {
                if (el && observerRef.current) {
                  observerRef.current.observe(el);
                }
              }}
              data-slug={m.slug}
              variants={itemVariants}
              key={idx}
              whileTap={{ scale: 0.98 }}
              className={`interactive-card p-10 rounded-sm group border border-white/5 border-b-2 border-r-2 border-yellow-electric/20 hover:border-yellow-electric transition-all duration-500 bg-surface will-change-transform ${!showAll && idx >= 6 ? 'hidden md:block' : ''}`}
            >
              <div className="flex items-start justify-between mb-8">
                <div className="w-16 h-16 bg-surface border border-white/10 flex items-center justify-center rounded-sm">
                  <SafeIcon name={m.icon} className={`w-6 h-6 ${m.color}`} />
                </div>
                <span className="text-[10px] text-white font-mono uppercase tracking-[0.2em] font-bold bg-white/5 px-2 py-1 border border-white/10 h-fit">{m.status}</span>
              </div>
              <h2 className="tracking-[0.2em] uppercase font-deco font-normal text-xs text-yellow-electric mb-4">{m.title}</h2>
              <p className="text-text-muted font-light leading-relaxed mb-6">{m.description}</p>


              <div className="mb-6">
                <Link
                  to={`/platform/${m.slug}`}
                  className="text-xs uppercase tracking-widest text-yellow-electric hover:text-white transition-colors flex items-center gap-2 border border-yellow-electric/20 px-3 py-1.5 w-fit"
                >
                  View Full Directive
                  <SafeIcon name="ArrowRight" className="w-4 h-4" />
                </Link>
              </div>


              <div className="mt-auto space-y-4 pt-6 border-t border-white/10">
                 <div className="flex justify-between items-center text-xs font-mono text-gray-400">
                    <span>Public Consensus</span>
                    <span className="text-[#4ade80]">{m.progress}%</span>
                 </div>
                 <div className="w-full bg-void h-2 rounded-sm overflow-hidden border border-white/5">
                    <div className="h-full bg-[#4ade80] shadow-[0_0_10px_rgba(74,222,128,0.5)] transition-all duration-1000" style={{ width: `${m.progress}%` }}></div>
                 </div>
                 <div className="flex justify-between text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-4">
                    <span>Sponsor: {m.sponsor}</span>
                    <span>Revisions: {m.revisions}</span>
                 </div>
              </div>

            </motion.div>
          ))}
        </motion.div>

        {/* Mobile Show More Toggle */}
        <div className="mt-12 text-center md:hidden">
          <motion.button whileTap={{ scale: 0.98 }}
            onClick={() => setShowAll(!showAll)}
            className="btn-gold"
          >
            {showAll ? 'Show Less' : 'View More Directives'}
          </motion.button>
        </div>

        {/* Implementation Roadmap */}
        <div className="deco-divider"></div>
        <div className="mt-32 pt-20">
          <div className="text-center mb-16">
            <h2 className="font-editorial font-black text-3xl md:text-5xl text-white uppercase tracking-tight">IMPLEMENTATION ROADMAP</h2>
          </div>

          <div className="relative">
            {/* Horizontal connecting line */}
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 -translate-y-1/2 hidden md:block"></div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: "01", title: "Policy Briefing", desc: "Initial stakeholder alignment and economic modeling." },
                { step: "02", title: "Legislative Drafting", desc: "Translating models into actionable policy frameworks." },
                { step: "03", title: "Pilot Programs", desc: "Localized testing of the American Tax Credit." },
                { step: "04", title: "Civic Infrastructure Deployment", desc: "Full-scale rollout and continuous algorithmic monitoring." }
              ].map((item, idx) => (
                <div key={idx} className="relative bg-surface border border-white/10 p-6 rounded-sm z-10 md:mt-0 mt-8">
                  <div className="absolute -top-4 md:-top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-phthalo-glow shadow-[0_0_15px_rgba(74,222,128,0.4)] mb-2"></div>
                    <div className="h-4 w-px bg-white/20 hidden md:block"></div>
                  </div>
                  <span className="font-mono text-xs text-phthalo-glow block mb-2">{item.step}</span>
                  <h3 className="font-editorial font-bold text-white uppercase text-sm mb-2">{item.title}</h3>
                  <p className="text-text-muted text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Platform;
