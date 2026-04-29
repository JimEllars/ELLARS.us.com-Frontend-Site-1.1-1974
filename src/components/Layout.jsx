import React from 'react';
import Navbar from './common/Navbar';
import Footer from './common/Footer';
import { Helmet } from 'react-helmet-async';

const Layout = ({ children }) => {
  return (
    <div className="relative min-h-screen flex flex-col bg-void text-text-main">
      <Helmet>
        <title>James Ellars | Business Development & Community Leader</title>
        <meta name="description" content="Leading the modernization of American civic infrastructure through private-sector rigor and algorithmic economic equity." />
      </Helmet>
      <Navbar />
      <main className="flex-grow relative z-10">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;