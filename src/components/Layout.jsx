import React from 'react';
import Navbar from './common/Navbar';
import Footer from './common/Footer';

const Layout = ({ children }) => {
  return (
    <div className="relative min-h-screen flex flex-col bg-void text-text-main">
      {/* Global Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-phthalo-base rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none z-0"></div>
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-gold-dim rounded-full mix-blend-screen filter blur-[150px] opacity-10 pointer-events-none z-0"></div>
      
      <Navbar />
      <main className="flex-grow relative z-10">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;