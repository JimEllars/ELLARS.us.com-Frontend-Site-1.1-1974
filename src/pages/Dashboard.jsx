import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { fetchSavedVaultItems } from '@/lib/api';
import ArticleCard from '@/components/intel/ArticleCard';
import ArticleSkeleton from '@/components/intel/ArticleSkeleton';
import { useAppStore } from '@/store/useAppStore';
import MicroProgramLoader from '@/components/dashboard/MicroProgramLoader';
import { useSearchParams } from 'react-router-dom';

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-12 text-center border border-white/10 bg-black/40 backdrop-blur-md rounded-sm deco-brackets mt-8">
    <div className="w-12 h-12 rounded-full border border-yellow-electric/20 flex items-center justify-center mb-4">
      <svg className="w-6 h-6 text-yellow-electric" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    </div>
    <h3 className="text-white font-editorial font-bold text-xl mb-2">Vault Empty</h3>
    <p className="text-gray-400 text-sm max-w-md font-mono uppercase tracking-widest text-xs">
      You have not saved any operational intel to your secure vault yet.
    </p>
  </div>
);

const SettingsPlaceholder = () => (
  <div className="flex flex-col items-center justify-center p-12 text-center border border-white/10 bg-black/40 backdrop-blur-md rounded-sm mt-8">
    <div className="w-12 h-12 rounded-full border border-yellow-electric/20 flex items-center justify-center mb-4">
      <svg className="w-6 h-6 text-yellow-electric" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </div>
    <h3 className="text-white font-editorial font-bold text-xl mb-2">Account Settings</h3>
    <p className="text-gray-400 text-sm max-w-md font-mono uppercase tracking-widest text-xs">
      Settings module is currently offline. Awaiting Core integration.
    </p>
  </div>
);


const Dashboard = () => {
  const token = useAppStore(state => state.userToken);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'vault';

  const { data: response, error, isLoading } = useSWR(
    token ? 'saved_vault_items' : null,
    fetchSavedVaultItems
  );

  const items = response && !response.isError ? response.data : [];
  const loading = isLoading;

  const tabs = [
    { id: 'vault', label: 'Saved Intel' },
    { id: 'settings', label: 'Account Settings' },
    { id: 'tools', label: 'Decentralized Tools' }
  ];

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  return (
    <>
      <Helmet>
        <title>Secure Dashboard | James Ellars</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-8">

        {/* Sidebar / Top Nav */}
        <div className="w-full md:w-64 flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="deco-frame p-6 sticky top-32"
          >
            <h2 className="font-editorial font-black text-xl tracking-tighter text-white uppercase mb-6">
              Dashboard <span className="text-yellow-electric">Menu</span>
            </h2>
            <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
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

        {/* Main Content Area */}
        <div className="flex-grow">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="deco-frame p-8 mb-8"
          >
            <h1 className="font-editorial font-black text-4xl tracking-tighter text-white uppercase mb-4">
              Secure <span className="text-yellow-electric">Space</span>
            </h1>
            <div className="h-px w-24 bg-yellow-electric/50 mb-6"></div>
            <p className="font-mono text-sm text-gray-400">
              Welcome to the secure operational space. Manage your assets and settings below.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {currentTab === 'vault' && (
              <motion.div
                key="vault"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
                    {[1, 2, 3].map(i => (
                      <ArticleSkeleton key={i} />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
                    {items.map(item => (
                      <ArticleCard key={item.id} article={item} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {currentTab === 'tools' && (
              <motion.div
                key="tools"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[600px]"
              >
                <MicroProgramLoader
                  programId="demo-tool"
                  entryUrl="https://example.com"
                  requiredPermissions={['read', 'write']}
                />
              </motion.div>
            )}

            {currentTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SettingsPlaceholder />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
