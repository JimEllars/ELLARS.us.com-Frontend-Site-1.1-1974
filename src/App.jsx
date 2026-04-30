import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from './components/Layout';
import Home from './pages/Home';
const About = React.lazy(() => import('./pages/About'));
const Articles = React.lazy(() => import('./pages/Articles'));
const ArticleDetail = React.lazy(() => import('./pages/ArticleDetail'));
const Platform = React.lazy(() => import('./pages/Platform'));
const RantsArchive = React.lazy(() => import('./pages/RantsArchive'));
import NotFound from './pages/NotFound';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <Layout>
        <Suspense fallback={<div className="fixed top-0 left-0 w-full h-[2px] bg-yellow-electric z-[9999]" style={{ background: "linear-gradient(90deg, transparent 0%, #fbbf24 50%, transparent 100%)", transformOrigin: "left", animation: "pulse 1.5s linear infinite" }}></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:slug" element={<ArticleDetail />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="/rants" element={<RantsArchive />} />
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
