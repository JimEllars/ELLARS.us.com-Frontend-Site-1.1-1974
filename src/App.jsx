import DonateModal from './components/common/DonateModal';
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
const About = React.lazy(() => import('./pages/About'));
const ArticleDetail = React.lazy(() => import('./components/intel/ArticleDetail'));
const Platform = React.lazy(() => import('./pages/Platform'));
const NewsMedia = React.lazy(() => import('./pages/NewsMedia'));
const DirectiveDetail = React.lazy(() => import('./pages/DirectiveDetail'));
import NotFound from './pages/NotFound';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import OfflineScreen from './components/common/OfflineScreen';

import { createClient } from '@supabase/supabase-js';
import { useAppStore } from './store/useAppStore';
import { verifySession } from './lib/api';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are missing. Supabase client will not be initialized correctly.");
}

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;



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
      const session = await verifySession();
      if (session) {
        setToken(session.access_token);
      } else {
        clearAuth();
      }
      setIsAuthChecking(false);
    };

    initializeSession();

    let subscription = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setToken(session.access_token);
        } else {
          clearAuth();
        }
      });
      subscription = data.subscription;
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [setToken, clearAuth, setIsAuthChecking]);


  if (isAuthChecking) {
    return (
      <div className="fixed inset-0 bg-void flex items-center justify-center z-[9999]">
        <div className="w-12 h-12 border-2 border-yellow-electric/20 border-t-yellow-electric rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <Router>
        <ScrollToTop />
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-[9999] focus:p-4 focus:bg-void focus:text-yellow-electric focus:font-mono focus:text-xs focus:uppercase focus:tracking-widest">
          Skip to Main Content
        </a>

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
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        <ToastContainer position="bottom-right" />
        <DonateModal />
      </Layout>
    </Router>
    </HelmetProvider>
  );
}

export default App;
