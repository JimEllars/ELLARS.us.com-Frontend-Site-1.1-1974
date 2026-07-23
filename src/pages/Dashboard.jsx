import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetchSavedVaultItems } from '@/lib/api';
import ArticleCard from '@/components/intel/ArticleCard';
import ArticleSkeleton from '@/components/intel/ArticleSkeleton';
import { useAppStore } from '@/store/useAppStore';

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

const Dashboard = () => {
  const token = useAppStore(state => state.userToken);

  const { data: response, error, isLoading } = useSWR(
    token ? 'saved_vault_items' : null,
    fetchSavedVaultItems
  );

  const items = response && !response.isError ? response.data : [];
  const loading = isLoading;

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
          className="deco-frame p-8 mb-8"
        >
          <h1 className="font-editorial font-black text-4xl tracking-tighter text-white uppercase mb-4">
            Secure <span className="text-yellow-electric">Dashboard</span>
          </h1>
          <div className="h-px w-24 bg-yellow-electric/50 mb-6"></div>
          <p className="font-mono text-sm text-gray-400">
            Welcome to the secure operational space. Your saved assets are accessible below.
          </p>
        </motion.div>

        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <ArticleSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {items.map(item => (
                <ArticleCard key={item.id} article={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
