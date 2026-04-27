import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SafeIcon from '@/common/SafeIcon';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Intel', path: '/intel' },
    { name: 'Platform', path: '/platform' },
    { name: 'Rants', path: '/rants' }
  ];

  return (
    <nav className="fixed w-full z-50 glass-nav">
      <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
        <div className="flex flex-col">
          <Link to="/" className="font-editorial font-black text-2xl tracking-tighter text-white leading-none">
            JAMES <span className="text-gradient-gold">ELLARS</span>
          </Link>
          <span className="text-[9px] text-gray-500 font-editorial uppercase tracking-widest mt-1 hidden sm:block">Systems Innovator • Civic Architect</span>
        </div>
        
        <div className="hidden lg:flex space-x-10 font-editorial font-bold text-[11px] uppercase tracking-[0.2em]">
          {navLinks.map(link => (
            <Link 
              key={link.path}
              to={link.path} 
              className={`transition-colors hover:text-white ${location.pathname === link.path ? 'text-white' : 'text-gray-400'}`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          <button className="btn-gold hidden sm:flex">Join The Inner Circle</button>
          <button 
            className="lg:hidden text-white hover:text-gold-base transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            <SafeIcon name={isOpen ? "X" : "Menu"} className="w-6 h-6" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-void border-b border-white/10 p-6 flex flex-col space-y-6">
          {navLinks.map(link => (
            <Link 
              key={link.path}
              to={link.path} 
              onClick={() => setIsOpen(false)}
              className="font-editorial font-bold text-xs uppercase tracking-widest text-white"
            >
              {link.name}
            </Link>
          ))}
          <button className="btn-gold w-full">Join The Inner Circle</button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;