import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '@/common/SafeIcon';
import SearchOverlay from '@/components/common/SearchOverlay';
import { useAppStore } from '@/store/useAppStore';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const { setDonateModalOpen } = useAppStore();

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY;

        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setShowNavbar(false);
          setIsOpen(false); // Close mobile menu on scroll down
        } else {
          setShowNavbar(true);
        }

        setIsScrolled(currentScrollY > 20);
        setLastScrollY(currentScrollY);
      }
    };

    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [lastScrollY]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

    const navLinks = [
    { name: 'About', path: '/about', prefetch: () => import('@/pages/About') },
    { name: 'Platform', path: '/platform', prefetch: () => import('@/pages/Platform') },
    { name: 'News & Media', path: '/news-media', prefetch: () => import('@/pages/NewsMedia') },
  ];

  const handleMouseEnter = (prefetchFn) => {
    if (prefetchFn) {
      prefetchFn().catch(err => console.error("Prefetch failed", err));
    }
  };

  return (
    <motion.nav
      initial={false}
      animate={{ y: showNavbar ? 0 : "-100%" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={`fixed w-full z-[100] will-change-transform transition-colors duration-300 ${
        isScrolled || isOpen ? 'bg-void/80 backdrop-blur-md border-b border-white/10' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center relative z-10">
        <div className="flex flex-col">
          <Link to="/" className="font-editorial font-black text-2xl tracking-tighter text-white leading-none">
            JAMES <span className="text-yellow-electric">ELLARS</span>
          </Link>
          <span className="text-[9px] text-gray-500 font-editorial uppercase tracking-widest mt-1 hidden sm:block">Business Development • Community Leader</span>
        </div>
        
        <div className="hidden lg:flex space-x-10 items-center font-editorial font-bold text-[11px] uppercase tracking-[0.2em]">
          {navLinks.map(link => (
            <Link 
              key={link.path}
              to={link.path} 
              onMouseEnter={() => handleMouseEnter(link.prefetch)}
              className={`transition-colors relative overflow-hidden group py-1 ${location.pathname.startsWith(link.path) ? 'text-yellow-electric font-semibold' : 'text-gray-400 hover:text-yellow-electric'}`}
            >
              {link.name}
              {location.pathname.startsWith(link.path) && (
                <motion.div layoutId="navbar-active-indicator" className="absolute bottom-0 left-0 w-full h-[1px] bg-yellow-electric" />
              )}
            </Link>
          ))}

          <motion.button
            onClick={() => setDonateModalOpen(true)}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 10,
              ease: "easeInOut"
            }}
            className="px-4 py-2 bg-yellow-electric text-black hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(250,204,21,0.3)]"
          >
            CONTRIBUTE
          </motion.button>
        </div>

        <div className="flex items-center space-x-4">
          <button className="btn-gold hidden sm:flex lg:hidden">Join the Newsletter</button>
          <button 
            className="lg:hidden text-white hover:text-yellow-electric transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label="Toggle navigation menu"
          >
            <SafeIcon name={isOpen ? "X" : "Menu"} className="w-6 h-6" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "-10%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-10%", opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden absolute top-full left-0 w-full bg-void/95 backdrop-blur-md border-b border-white/10 p-6 flex flex-col space-y-6"
          >
            {navLinks.map((link, index) => (
              <motion.div
                key={link.path}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.1 }}
              >
                <Link
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`font-editorial font-bold text-xs uppercase tracking-widest block transition-colors ${location.pathname.startsWith(link.path) ? 'text-yellow-electric' : 'text-white hover:text-yellow-electric'}`}
                >
                  {link.name}
                </Link>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: navLinks.length * 0.1 + 0.1 }}
            >

            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (navLinks.length + 1) * 0.1 + 0.1 }}
            >
              <motion.button
                onClick={() => {
                  setIsOpen(false);
                  setDonateModalOpen(true);
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 10,
                  ease: "easeInOut"
                }}
                className="w-full py-4 bg-yellow-electric text-black font-editorial font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:bg-yellow-400 transition-colors"
              >
                CONTRIBUTE
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </motion.nav>
  );
};

export default Navbar;
