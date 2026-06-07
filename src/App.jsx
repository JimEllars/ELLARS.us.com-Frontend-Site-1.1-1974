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
import NotFound from './pages/NotFound';
const Ecosystem = React.lazy(() => import('./pages/Ecosystem'));


function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

function App() {
  return (
    <HelmetProvider>
      <Router>
        <ScrollToTop />
        <Layout>
        <Suspense fallback={<div className="fixed top-0 left-0 w-full h-[2px] bg-yellow-electric z-[9999]" style={{ background: "linear-gradient(90deg, transparent 0%, #fbbf24 50%, transparent 100%)", transformOrigin: "left", animation: "pulse 1.5s linear infinite" }}></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/articles/:slug" element={<ArticleDetail />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="/ecosystem" element={<Ecosystem />} />
          <Route path="/news-media" element={<NewsMedia />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        <ToastContainer position="bottom-right" />
      </Layout>
    </Router>
    </HelmetProvider>
  );
}

export default App;
