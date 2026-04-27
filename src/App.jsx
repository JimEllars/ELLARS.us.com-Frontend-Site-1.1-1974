import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Intel from './pages/Intel';
import ArticleDetail from './pages/ArticleDetail';
import Platform from './pages/Platform';
import RantsArchive from './pages/RantsArchive';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/intel" element={<Intel />} />
          <Route path="/intel/:slug" element={<ArticleDetail />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="/rants" element={<RantsArchive />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;