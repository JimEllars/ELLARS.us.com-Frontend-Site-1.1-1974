import PrivacyBanner from "./common/PrivacyBanner";
import React, { useEffect, useState, createContext, useContext } from 'react';
import Navbar from './common/Navbar';
import Footer from './common/Footer';
import GlobalAudioPlayer from "./common/GlobalAudioPlayer";
import Toast from './common/Toast';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
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
          className="fixed top-0 left-0 h-[2px] w-full bg-yellow-electric z-[9999] animate-pulse"
          style={{
            background: "linear-gradient(90deg, transparent 0%, #fbbf24 50%, transparent 100%)",
            transformOrigin: "left"
          }}
        />
      )}
    </AnimatePresence>
  );
};

const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-yellow-electric z-[100]"
      style={{ scaleX, transformOrigin: "0%" }}
    />
  );
};

const Layout = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoaderContext.Provider value={{ isLoading, setIsLoading }}>
      <div className="relative min-h-screen flex flex-col text-text-main bg-[radial-gradient(circle_at_top,_#001a13_0%,_#050505_100%)]">
        {/* The single skip link for the app. It targets #main-content, which is the
            <main> below. App.jsx used to declare a second one pointing at #content,
            an id no element ever carried, so keyboard users got two tab stops and
            the first one went nowhere. */}
        <a
          href="#main-content"
          className="-translate-y-full absolute focus:translate-y-0 focus:relative focus:z-50 focus:px-4 focus:py-3 focus:bg-void focus:text-yellow-electric focus:font-mono focus:text-xs focus:uppercase focus:tracking-widest focus:border focus:border-yellow-electric"
        >
          Skip to main content
        </a>
        <TopLoader />
        <ScrollProgress />
        {/* The layout used to emit <title>James Ellars | Business Development &
            Community Leader</title> on every route. Helmet's child instances mount
            before the parent's, so the layout title won the dedupe and every page
            shipped the same generic title in the tab, in search results and in
            bookmarks. Pages own their titles; the static <title> in index.html is
            the fallback for the initial paint. */}
        <Navbar />
        <main id="main-content" className="flex-grow relative z-10 min-h-screen">
          {children}
        </main>
        <Footer />
        <PrivacyBanner />
        <Toast />
        <GlobalAudioPlayer />
      </div>
    </LoaderContext.Provider>
  );
};

export default Layout;
