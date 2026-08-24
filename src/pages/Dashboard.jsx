import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR, { useSWRConfig } from 'swr';
import { fetchSavedVaultItems, deleteVaultItem, archiveVaultItem } from '@/lib/api';
import VaultArticleCard from '@/components/dashboard/VaultArticleCard';
import ArticleSkeleton from '@/components/intel/ArticleSkeleton';
import ArticleCard from '@/components/intel/ArticleCard';
import AutomationCalculator from '@/components/intel/AutomationCalculator';
import DispatchPublisher from '@/components/dashboard/DispatchPublisher';
import { useAppStore } from '@/store/useAppStore';
import AccountSettings from '../components/dashboard/AccountSettings';
import MediaUploads from '@/components/dashboard/MediaUploads';
import { useSearchParams } from 'react-router-dom';

const EmptyState = ({ isFilterEmpty }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center border border-white/10 bg-black/40 backdrop-blur-md rounded-sm deco-brackets mt-8">
    <div className="w-12 h-12 rounded-full border border-yellow-electric/20 flex items-center justify-center mb-4">
      <svg className="w-6 h-6 text-yellow-electric" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    </div>
    <h3 className="text-white font-editorial font-bold text-xl mb-2">Vault Empty</h3>
    <p className="text-gray-400 text-sm max-w-md font-mono uppercase tracking-widest text-xs">
      {isFilterEmpty ? 'No saved items match your filter criteria.' : 'You have not saved any operational intel to your secure vault yet.'}
    </p>
  </div>
);



const Dashboard = () => {
  const token = useAppStore(state => state.userToken);
  const [searchParams, setSearchParams] = useSearchParams();
  const [itemToDelete, setItemToDelete] = useState(null);
  const { mutate } = useSWRConfig();
  const showToast = useAppStore(state => state.showToast);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTool, setActiveTool] = useState('calculator');
  const [editingItem, setEditingItem] = useState(null);
  const [vaultPage, setVaultPage] = useState(1);
  const [hasMoreVaultItems, setHasMoreVaultItems] = useState(true);
  const currentTab = searchParams.get('tab') || 'vault';

  const fetcher = async ([key, page]) => {
    return fetchSavedVaultItems(page, 12);
  };
  const { data: response, error, isLoading } = useSWR(
    token ? ['saved_vault_items', vaultPage] : null,
    fetcher
  );

  const [allItems, setAllItems] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (response && !response.isError) {
      if (vaultPage === 1) {
         setAllItems(response.data);
      } else {
         setAllItems(prev => {
            const newItems = response.data.filter(item => !prev.some(p => p.id === item.id));
            return [...prev, ...newItems];
         });
      }
      if (response.data.length < 12) {
         setHasMoreVaultItems(false);
      } else {
         setHasMoreVaultItems(true);
      }
    }
  }, [response, vaultPage]);
  const items = allItems.filter(item => {
    const matchesSearch = !debouncedSearchQuery || (item.title?.rendered?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || item.excerpt?.rendered?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));

    let matchesStatus = true;
    if (statusFilter === 'Active') {
      matchesStatus = item.status !== 'archived';
    } else if (statusFilter === 'Archived') {
      matchesStatus = item.status === 'archived';
    }
    const matchesCategory = activeCategory === 'All' || item.acf?.category_label === activeCategory;
    return matchesSearch && matchesCategory && matchesStatus;
  });
  const loading = isLoading;

  const tabs = [
    { id: 'vault', label: 'Saved Intel' },
    { id: 'settings', label: 'Account Settings' },
    { id: 'tools', label: 'Tools & Automations' },
    { id: 'media', label: 'Media Library' }
  ];



  const handleEdit = (item) => {
    setEditingItem(item);
    setActiveTool('publisher');
    setSearchParams({ tab: 'tools' });
  };

  const handleArchive = async (item) => {
    // Optimistic update
    mutate(
      key => Array.isArray(key) && key[0] === 'saved_vault_items',
      undefined,
      { revalidate: true }
    );
    // Optimistically update local state while SWR revalidates
    setAllItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'archived' } : i));

    const result = await archiveVaultItem(item.id);
    if (result.isError) {
      showToast('// ERROR: UNABLE TO ARCHIVE VAULT ITEM');
      mutate(key => Array.isArray(key) && key[0] === 'saved_vault_items'); // rollback
    } else {
      showToast('Vault Item Archived.');
      mutate(key => Array.isArray(key) && key[0] === 'saved_vault_items'); // revalidate
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const id = itemToDelete.id;
    setItemToDelete(null);

    // Optimistic update
    mutate(
      key => Array.isArray(key) && key[0] === 'saved_vault_items',
      undefined,
      { revalidate: true }
    );
    // Optimistically update local state while SWR revalidates
    setAllItems(prev => prev.filter(i => i.id !== id));

    const result = await deleteVaultItem(id);
    if (result.isError) {
      showToast('// ERROR: UNABLE TO DELETE VAULT ITEM');
      mutate(key => Array.isArray(key) && key[0] === 'saved_vault_items'); // rollback
    } else {
      showToast('Vault Item Deleted.');
      mutate(key => Array.isArray(key) && key[0] === 'saved_vault_items'); // revalidate
    }
  };

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

                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Search vault intel..."
                      aria-label="Search vault intel"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-sm py-2 px-4 pl-10 text-white font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-yellow-electric/50 transition-colors deco-brackets"
                    />
                    <svg className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 mb-4">
                    {['Active', 'Archived', 'All'].map(status => (
                      <button
                        key={status}
                        aria-label={`Filter by status ${status}`}
                        onClick={() => setStatusFilter(status)}
                        className={`whitespace-nowrap px-3 py-1.5 border ${statusFilter === status ? 'border-yellow-electric text-yellow-electric bg-yellow-electric/10' : 'border-white/10 text-gray-400 hover:border-white/30'} rounded-sm font-mono text-xs uppercase tracking-widest transition-colors`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                    {['All', 'Dispatch', 'Business Briefing', 'Directive'].map(cat => (
                      <button
                        key={cat}
                        aria-label={`Filter by ${cat}`}
                        onClick={() => setActiveCategory(cat)}
                        className={`whitespace-nowrap px-3 py-1.5 border ${activeCategory === cat ? 'border-yellow-electric text-yellow-electric bg-yellow-electric/10' : 'border-white/10 text-gray-400 hover:border-white/30'} rounded-sm font-mono text-xs uppercase tracking-widest transition-colors`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
                    {[1, 2, 3].map(i => (
                      <ArticleSkeleton key={i} />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <EmptyState isFilterEmpty={allItems.length > 0 && items.length === 0} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
                    {items.map(item => (
                      <VaultArticleCard key={item.id} post={item} onDelete={setItemToDelete} onArchive={handleArchive} onEdit={handleEdit} />
                    ))}
                  </div>
                )}
                {hasMoreVaultItems && items.length > 0 && !loading && (
                   <div className="mt-8 flex justify-center">
                     <button
                       onClick={() => setVaultPage(prev => prev + 1)}
                       className="px-6 py-2 border border-yellow-electric/30 text-yellow-electric font-mono text-xs uppercase tracking-widest hover:bg-yellow-electric/10 transition-colors"
                     >
                       Load More
                     </button>
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
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-editorial font-bold text-2xl">Available Micro-Programs</h3>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-green-500 text-[10px] uppercase tracking-widest font-mono font-bold">Active AXiM Node</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 mb-8">
                  <div
                    className={`deco-frame p-6 bg-black/40 backdrop-blur-md cursor-pointer transition-colors ${activeTool === 'calculator' ? 'border-yellow-electric/50' : 'hover:border-yellow-electric/50'}`}
                    onClick={() => setActiveTool('calculator')}
                  >
                    <h4 className="text-yellow-electric font-editorial font-bold text-xl mb-2">Directive Impact Calculator</h4>
                    <p className="text-gray-400 text-sm font-mono">Evaluate automated economic offsets and negative income tax distributions.</p>
                  </div>

                  <div
                    className="deco-frame p-6 bg-black/40 backdrop-blur-md cursor-pointer hover:border-yellow-electric/50 transition-colors"
                    onClick={() => setActiveTool('publisher')}
                  >
                    <h4 className="text-yellow-electric font-editorial font-bold text-xl mb-2">Intelligence Dispatch Publisher</h4>
                    <p className="text-gray-400 text-sm font-mono">Access secure vault modules to publish and manage intelligence dispatches.</p>
                  </div>
                </div>

                {activeTool === 'calculator' && (
                  <div className="mt-8">
                    <h3 className="text-white font-editorial font-bold text-xl mb-4">Active Session: Impact Calculator</h3>
                    <div className="p-4 md:p-8 border border-white/10 bg-black/60 rounded-sm">
                      <AutomationCalculator />
                    </div>
                  </div>
                )}

                {activeTool === 'publisher' && (
                  <div className="mt-8">
                    <DispatchPublisher editingItem={editingItem} onCancel={() => { setEditingItem(null); setSearchParams({ tab: 'vault' }); mutate(['saved_vault_items', 1]); }} onSuccess={() => { setEditingItem(null); setSearchParams({ tab: 'vault' }); mutate(['saved_vault_items', 1]); setVaultPage(1); }} />
                  </div>
                )}
              </motion.div>
            )}


            {currentTab === 'media' && (
              <motion.div
                key="media"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <MediaUploads />
              </motion.div>
            )}

            {currentTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AccountSettings />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="deco-frame bg-zinc-950 p-8 max-w-md w-full border border-white/20 shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-yellow-electric"></div>
              <h3 className="font-editorial font-bold text-2xl text-white uppercase tracking-tighter mb-4">Confirm Deletion</h3>
              <p className="font-mono text-sm text-gray-400 mb-8 leading-relaxed">
                Are you sure you want to delete <span className="text-yellow-electric">{itemToDelete.title?.rendered || 'this item'}</span>? This action cannot be undone and will remove it from the operational vault.
              </p>
              <div className="flex items-center justify-end space-x-4">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="px-4 py-2 font-mono text-xs uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-6 py-2 bg-red-900/20 border border-red-500/50 text-red-500 font-mono text-xs uppercase tracking-widest hover:bg-red-900/50 transition-colors"
                >
                  Delete Item
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Dashboard;
