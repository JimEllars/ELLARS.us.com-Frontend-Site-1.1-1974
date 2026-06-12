import DonateModal from './components/common/DonateModal';
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from './components/Layout';
import Home from './pages/Home';
const About = React.lazy(() => import('./pages/About'));
const ArticleDetail = React.lazy(() => import('./pages/ArticleDetail'));
const Platform = React.lazy(() => import('./pages/Platform'));
const NewsMedia = React.lazy(() => import('./pages/NewsMedia'));
const Volunteer = React.lazy(() => import('./pages/Volunteer'));
const Events = React.lazy(() => import('./pages/Events'));
import NotFound from './pages/NotFound';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import OfflineScreen from './components/common/OfflineScreen';


function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

function App() {
  const isOnline = useNetworkStatus();

  return (
    <HelmetProvider>
      <Router>
        <ScrollToTop />
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-[9999] focus:p-4 focus:bg-void focus:text-yellow-electric focus:font-mono focus:text-xs focus:uppercase focus:tracking-widest">
          Skip to Main Content
        </a>
        {!isOnline && <OfflineScreen />}
        <Layout>
        <Suspense fallback={<div className="fixed top-0 left-0 w-full h-[2px] bg-yellow-electric z-[9999]" style={{ background: "linear-gradient(90deg, transparent 0%, #fbbf24 50%, transparent 100%)", transformOrigin: "left", animation: "pulse 1.5s linear infinite" }}></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/articles/:slug" element={<ArticleDetail />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="/news-media" element={<NewsMedia />} />
          <Route path="/volunteer" element={<Volunteer />} />
          <Route path="/events" element={<Events />} />
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
