import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Intel from './pages/Intel';
import ArticleDetail from './pages/ArticleDetail';
import Platform from './pages/Platform';
import RantsArchive from './pages/RantsArchive';
import NotFound from './pages/NotFound';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/intel" element={<Intel />} />
          <Route path="/intel/:slug" element={<ArticleDetail />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="/rants" element={<RantsArchive />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ToastContainer position="bottom-right" />
      </Layout>
    </Router>
    </HelmetProvider>
  );
}

export default App;
