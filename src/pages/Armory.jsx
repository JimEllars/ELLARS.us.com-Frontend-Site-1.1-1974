import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import SafeIcon from '@/common/SafeIcon';
import { motion } from 'framer-motion';

const Armory = () => {
  const [walletConnected, setWalletConnected] = useState(false);

  const connectWallet = () => {
    // Mock web3 connect
    setWalletConnected(true);
  };

  const products = [
    {
      id: 1,
      name: "Fleet Badge",
      category: "Quartermaster Provisions",
      price: "$25",
      restricted: true,
      image: "https://images.unsplash.com/photo-1634983058882-7cf2547b74ba?auto=format&fit=crop&q=80&w=600",
      description: "Official insignia of the Fleet. Sovereign Gating required."
    },
    {
      id: 2,
      name: "Standard Issue Blueprint",
      category: "Documentation",
      price: "$10",
      restricted: false,
      image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=600",
      description: "Physical print of the Article III Civic Infrastructure plan."
    },
    {
      id: 3,
      name: "Navigator's Compass",
      category: "Quartermaster Provisions",
      price: "$150",
      restricted: true,
      image: "https://images.unsplash.com/photo-1502920514313-52581002a659?auto=format&fit=crop&q=80&w=600",
      description: "Precision analog tool for the digital sea."
    }
  ];

  return (
    <div className="pt-32 pb-20 min-h-screen bg-transparent bg-grid">
      <Helmet>
        <title>The Armory | James Ellars</title>
        <meta name="description" content="Equipment Registry and Quartermaster Provisions." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-6">
        <header className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-white/10 pb-8">
          <div>
            <span className="font-editorial text-[10px] text-[#9400FF] uppercase tracking-widest font-bold block mb-4">Equipment Registry</span>
            <h1 className="font-editorial font-black text-5xl md:text-7xl text-white leading-tight">
              THE <span className="text-[#9400FF]">ARMORY.</span>
            </h1>
          </div>
          <div className="mt-6 md:mt-0">
            {!walletConnected ? (
              <button onClick={connectWallet} className="flex items-center space-x-2 bg-[#9400FF] hover:bg-[#a855f7] text-white px-6 py-3 rounded-sm transition-colors shadow-[0_0_15px_rgba(148,0,255,0.4)]">
                <SafeIcon name="Lock" className="w-4 h-4" />
                <span className="font-mono text-sm uppercase tracking-widest">Connect MusterRoll</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 bg-white/5 border border-[#4ade80]/30 text-[#4ade80] px-6 py-3 rounded-sm">
                <SafeIcon name="Unlock" className="w-4 h-4" />
                <span className="font-mono text-sm uppercase tracking-widest">Sovereignty Verified</span>
              </div>
            )}
          </div>
        </header>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              key={product.id}
              className={`interactive-card group border-b-[#9400FF]/20 hover:border-[#9400FF] ${product.restricted && !walletConnected ? 'opacity-50 grayscale' : ''}`}
            >
              <div className="aspect-square w-full relative overflow-hidden bg-void">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                {product.restricted && !walletConnected && (
                  <div className="absolute inset-0 bg-void/80 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
                    <SafeIcon name="Lock" className="w-8 h-8 text-[#9400FF] mb-4" />
                    <p className="font-mono text-xs text-white uppercase tracking-widest">Sovereign Gating</p>
                    <p className="text-text-muted text-[10px] mt-2">Connect wallet to access</p>
                  </div>
                )}
              </div>
              <div className="p-6">
                <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest block mb-2">{product.category}</span>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-editorial font-bold text-xl text-white group-hover:text-[#9400FF] transition-colors">{product.name}</h3>
                  <span className="font-mono text-[#4ade80]">{product.price}</span>
                </div>
                <p className="text-text-muted text-sm font-light leading-relaxed mb-6">{product.description}</p>

                <button
                  disabled={product.restricted && !walletConnected}
                  className={`w-full py-3 border font-mono text-xs uppercase tracking-widest transition-colors ${product.restricted && !walletConnected ? 'border-gray-800 text-gray-600 cursor-not-allowed' : 'border-[#9400FF]/50 text-white hover:bg-[#9400FF] hover:border-[#9400FF]'}`}
                >
                  {product.restricted && !walletConnected ? 'Restricted Access' : 'Requisition'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Armory;
