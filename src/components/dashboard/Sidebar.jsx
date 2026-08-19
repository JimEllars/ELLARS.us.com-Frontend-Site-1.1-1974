import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '@/common/SafeIcon';

const Sidebar = ({ currentTab, onTabChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef(null);

  const tabs = [
    { id: 'vault', label: 'Overview Hub' },
    { id: 'intel-manager', label: 'Intelligence Manager' },
    { id: 'media-uploads', label: 'Media Uploads' },
    { id: 'partnership-payments', label: 'Partnership Payments' }
  ];

  const handleTabClick = (tabId) => {
    onTabChange(tabId);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile Drawer Trigger */}
      <div className="md:hidden w-full mb-4 relative z-[90]">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between deco-frame p-4 bg-black/40 backdrop-blur-md"
          aria-label="Open Dashboard Menu"
        >
          <span className="font-editorial font-bold text-lg text-white uppercase tracking-widest">
            Dashboard Menu
          </span>
          <SafeIcon name="Menu" className="w-6 h-6 text-yellow-electric" />
        </button>
      </div>

      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block w-64 flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="deco-frame p-6 sticky top-32 bg-transparent"
        >
          <h2 className="font-editorial font-black text-xl tracking-tighter text-white uppercase mb-6">
            Dashboard <span className="text-yellow-electric">Menu</span>
          </h2>
          <nav className="flex flex-col gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`whitespace-nowrap text-left px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors ${
                  currentTab === tab.id
                    ? 'bg-yellow-electric/10 text-yellow-electric border-l-2 border-yellow-electric'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </motion.div>
      </div>

      {/* Mobile Slide-out Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[95] md:hidden"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              ref={drawerRef}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-[100dvh] w-3/4 max-w-sm bg-void border-r border-white/10 z-[100] md:hidden overflow-y-auto flex flex-col shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Dashboard Menu"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-void/90 backdrop-blur-md">
                <h2 className="font-editorial font-black text-xl tracking-tighter text-white uppercase">
                  Dashboard <span className="text-yellow-electric">Menu</span>
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-yellow-electric transition-colors"
                  aria-label="Close Dashboard Menu"
                >
                  <SafeIcon name="X" className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-2">
                <nav className="flex flex-col gap-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`whitespace-nowrap text-left px-4 py-4 font-mono text-xs uppercase tracking-widest transition-colors ${
                        currentTab === tab.id
                          ? 'bg-yellow-electric/10 text-yellow-electric border-l-2 border-yellow-electric'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
