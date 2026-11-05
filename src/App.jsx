import DonateModal from './components/common/DonateModal';
import NewsletterModal from './components/common/NewsletterModal';
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from './components/Layout';
import Home from './pages/Home';
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
import ProtectedRoute from './components/common/ProtectedRoute';
import RouteMeta from './components/common/RouteMeta';
import HeadOwnership from './components/common/HeadOwnership';
const About = React.lazy(() => import('./pages/About'));
const ArticleDetail = React.lazy(() => import('./components/intel/ArticleDetail'));
const Platform = React.lazy(() => import('./pages/Platform'));
const NewsMedia = React.lazy(() => import('./pages/NewsMedia'));
const Privacy = React.lazy(() => import('./pages/Privacy'));
const DirectiveDetail = React.lazy(() => import('./pages/DirectiveDetail'));
import NotFound from './pages/NotFound';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import OfflineScreen from './components/common/OfflineScreen';

import { getSupabase } from './lib/supabase';
import { useAppStore } from './store/useAppStore';
import { verifySession } from './lib/api';





function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

function App() {

  const isOnline = useNetworkStatus();
  const setToken = useAppStore(state => state.setUserToken);
  const isAuthChecking = useAppStore(state => state.isAuthChecking);

  const setIsAuthChecking = useAppStore(state => state.setIsAuthChecking);
  const clearAuth = useAppStore(state => state.clearAuth);


  useEffect(() => {
    const initializeSession = async () => {
      setIsAuthChecking(true);
      const timeoutId = setTimeout(() => {
        console.warn("Session verification timed out. Falling back to guest mode.");
        setIsAuthChecking(false);
      }, 1500);
      try {
        const session = await verifySession();
        if (session && !session.isGuest) {
          setToken(session.access_token);
        } else if (session?.transient) {
          // Auth server unreachable: trust whatever the persisted session gave us
          // rather than logging the user out on a cold start with poor signal.
          console.warn("Session verification inconclusive. Preserving persisted session.");
        } else {
          clearAuth();
        }
      } catch (error) {
        console.warn("Session initialization failed, falling back to guest mode:", error);
        clearAuth();
      } finally {
        clearTimeout(timeoutId);
        setIsAuthChecking(false);
      }
    };

    initializeSession();

    // The client resolves asynchronously now (build env, then /api/config), so
    // the auth subscription is attached when it lands. `disposed` stops an
    // unmounted effect from leaking a subscription that would call setToken.
    let subscription = null;
    let disposed = false;

    getSupabase().then((client) => {
      if (!client || disposed) return;
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setToken(session.access_token);
        } else {
          clearAuth();
        }
      });
      subscription = data.subscription;
      if (disposed) subscription.unsubscribe();
    });

    return () => {
      disposed = true;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [setToken, clearAuth, setIsAuthChecking]);




  return (
    <HelmetProvider>
      <Router>
        <ScrollToTop />
        {/* RouteMeta is the only client writer of title/description/og/twitter/canonical
            (sourced from the edge table). HeadOwnership then drops the static shell's
            copies of those keys, which React would otherwise duplicate. */}
        <RouteMeta />
        <HeadOwnership />
        {/* No skip link here: Layout owns the single one, and it targets the
            #main-content id that actually exists. The duplicate that lived here
            pointed at #content, which no element carried. */}

        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="fixed inset-0 z-[1000]"
            >
              <OfflineScreen />
            </motion.div>
          )}
        </AnimatePresence>

        <Layout>
        <Suspense fallback={<div className="fixed top-0 left-0 w-full h-[2px] bg-yellow-electric z-[9999]" style={{ background: "linear-gradient(90deg, transparent 0%, #fbbf24 50%, transparent 100%)", transformOrigin: "left", animation: "pulse 1.5s linear infinite" }}></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
          <Route path="/about" element={<About />} />
          <Route path="/articles/:slug" element={<ArticleDetail />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="/platform/:directiveSlug" element={<DirectiveDetail />} />
          <Route path="/news-media" element={<NewsMedia />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        <ToastContainer position="bottom-right" />
        <DonateModal />
        <NewsletterModal />
      </Layout>
    </Router>
    </HelmetProvider>
  );
}

export default App;
