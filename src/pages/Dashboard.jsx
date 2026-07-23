import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

const Dashboard = () => {
  return (
    <>
      <Helmet>
        <title>Secure Dashboard | James Ellars</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="deco-frame p-8"
        >
          <h1 className="font-editorial font-black text-4xl tracking-tighter text-white uppercase mb-4">
            Secure <span className="text-yellow-electric">Dashboard</span>
          </h1>
          <div className="h-px w-24 bg-yellow-electric/50 mb-6"></div>
          <p className="font-mono text-sm text-gray-400">
            Welcome to the secure operational space. This area is protected and requires an active session.
          </p>
        </motion.div>
      </div>
    </>
  );
};

export default Dashboard;
