import React, { useState, useEffect, useRef } from 'react';
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
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const { setDonateModalOpen } = useAppStore();
  const modalRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    }
  };

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
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      const handleKeyDown = (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
          setIsOpen(false);
          menuButtonRef.current?.focus();
        } else if (e.key === 'Tab') {
          if (!modalRef.current) return;
          // Combine mobile menu focusable elements and the menu toggle button
          // Actually, when modal is open, we trap within modalRef
          const focusableElements = modalRef.current.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };
      document.addEventListener('keydown', handleKeyDown);

      // Focus first element after a short delay
      setTimeout(() => {
        if (modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          }
        }
      }, 100);

      return () => {
        document.body.style.overflow = 'unset';
        document.body.style.paddingRight = '';
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '';
    }
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
          <Link to="/" className="font-editorial font-black text-2xl tracking-tighter text-white leading-none" aria-label="Home">
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
              aria-label={link.name}
            >
              {link.name}
              {location.pathname.startsWith(link.path) && (
                <motion.div layoutId="navbar-active-indicator" className="absolute bottom-0 left-0 w-full h-[1px] bg-yellow-electric" />
              )}
            </Link>
          ))}

          <motion.button aria-label="Contribute"
            onClick={() => setDonateModalOpen(true)}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 10,
              ease: "easeInOut"
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-yellow-electric text-black hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:shadow-lg hover:shadow-blue-500/20"
          >
            CONTRIBUTE
          </motion.button>
        </div>

        <div className="flex items-center space-x-4">

          <AnimatePresence>
            {showInstallPrompt && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleInstallClick}
                className="hidden sm:flex items-center space-x-2 px-3 py-1.5 border border-yellow-electric/30 text-yellow-electric text-[10px] uppercase tracking-widest hover:bg-yellow-electric/10 transition-colors mr-4"
                aria-label="Install App"
              >
                <SafeIcon name="Download" className="w-3 h-3" />
                <span>Install</span>
              </motion.button>
            )}
          </AnimatePresence>

          <button className="btn-gold hidden sm:flex lg:hidden" aria-label="Join the Newsletter">Join the Newsletter</button>
          <button 
            ref={menuButtonRef}
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
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            initial={{ y: "-10%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-10%", opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden absolute top-full left-0 w-full h-[100dvh] bg-void/95 backdrop-blur-md border-b border-white/10 p-6 flex flex-col space-y-6"
          >
            {/* Close button inside modal to keep tab focus inside if needed, or we rely on the Escape key. Let's add a hidden close button at the start, or just let them tab to the first link. We'll add a close button for accessibility within the trap. */}
            <button
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 text-white"
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
            >
              Close Menu
            </button>
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
                  aria-label={link.name}
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
              <motion.button aria-label="Contribute"
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
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-yellow-electric text-black font-editorial font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:bg-yellow-400 transition-colors hover:shadow-lg hover:shadow-blue-500/20"
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
