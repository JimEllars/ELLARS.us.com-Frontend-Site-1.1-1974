import React, { useEffect, useState } from 'react';
import Navbar from './common/Navbar';
import Footer from './common/Footer';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const TopLoader = () => {
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timeout);
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0, width: "0%" }}
          animate={{ opacity: 1, width: "100%", transition: { duration: 0.6, ease: "easeInOut" } }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          className="fixed top-0 left-0 h-[2px] bg-yellow-electric z-[9999]"
        />
      )}
    </AnimatePresence>
  );
};

const Layout = ({ children }) => {
  return (
    <div className="relative min-h-screen flex flex-col bg-void text-text-main">
      <TopLoader />
      <Helmet>
        <title>James Ellars | Business Development & Community Leader</title>
        <meta name="description" content="Leading the modernization of American civic infrastructure through private-sector rigor and algorithmic economic equity." />
      </Helmet>
      <Navbar />
      <main className="flex-grow relative z-10 min-h-screen bg-void">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;