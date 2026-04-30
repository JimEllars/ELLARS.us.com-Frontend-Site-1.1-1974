import React, { useEffect, useState, createContext, useContext } from 'react';
import Navbar from './common/Navbar';
import Footer from './common/Footer';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export const LoaderContext = createContext({
  isLoading: false,
  setIsLoading: () => {},
});

export const useLoader = () => useContext(LoaderContext);

const TopLoader = () => {
  const { isLoading } = useLoader();
  const [navLoading, setNavLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setNavLoading(true);
    const timeout = setTimeout(() => {
      setNavLoading(false);
    }, 800);
    return () => clearTimeout(timeout);
  }, [location.pathname]);

  const active = isLoading || navLoading;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, x: "-100%" }}
          animate={{
            opacity: 1,
            x: "100%",
            transition: {
              duration: 1.5,
              repeat: Infinity,
              ease: "linear"
            }
          }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          className="fixed top-0 left-0 h-[2px] w-full bg-yellow-electric z-[9999]"
          style={{
            background: "linear-gradient(90deg, transparent 0%, #fbbf24 50%, transparent 100%)",
            transformOrigin: "left"
          }}
        />
      )}
    </AnimatePresence>
  );
};

const Layout = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoaderContext.Provider value={{ isLoading, setIsLoading }}>
      <div className="relative min-h-screen flex flex-col text-text-main bg-[radial-gradient(circle_at_top,_#001a13_0%,_#050505_100%)]">
        <TopLoader />
        <Helmet>
          <title>James Ellars | Business Development & Community Leader</title>
          <meta name="description" content="Leading the modernization of American civic infrastructure through private-sector rigor and algorithmic economic equity." />
        </Helmet>
        <Navbar />
        <main className="flex-grow relative z-10 min-h-screen">
          {children}
        </main>
        <Footer />
      </div>
    </LoaderContext.Provider>
  );
};

export default Layout;
