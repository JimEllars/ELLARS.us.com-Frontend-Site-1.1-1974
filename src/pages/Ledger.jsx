import React from 'react';
import { Helmet } from 'react-helmet-async';
import SafeIcon from '@/common/SafeIcon';
import { motion } from 'framer-motion';

const Ledger = () => {
  const transactions = [
    { id: "0x1a...4b2", date: "2026-05-11", amount: "$12,450", allocation: "Community Aid - Article III", status: "VERIFIED" },
    { id: "0x9f...8c1", date: "2026-05-10", amount: "$4,200", allocation: "Operational Infrastructure", status: "VERIFIED" },
    { id: "0x3e...2d9", date: "2026-05-08", amount: "$15,000", allocation: "Automation Dividend Dispersal", status: "VERIFIED" },
    { id: "0x7b...1a4", date: "2026-05-05", amount: "$8,320", allocation: "Guild Research Grant", status: "PENDING" },
  ];

  return (
    <div className="pt-32 pb-20 min-h-screen bg-transparent bg-grid">
      <Helmet>
        <title>The Mothership Ledger | James Ellars</title>
        <meta name="description" content="Live Federation Treasury Transparency." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-6">
        <header className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-white/10 pb-8">
          <div>
            <span className="font-editorial text-[10px] text-[#4ade80] uppercase tracking-widest font-bold block mb-4">Treasury Transparency</span>
            <h1 className="font-editorial font-black text-5xl md:text-7xl text-white leading-tight">
              THE <span className="text-[#4ade80]">LEDGER.</span>
            </h1>
          </div>
          <div className="mt-6 md:mt-0">
            <a href="ipfs://QmYourHashHere" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/20 text-white px-6 py-3 rounded-sm transition-colors">
              <SafeIcon name="Download" className="w-4 h-4 text-[#4ade80]" />
              <span className="font-mono text-sm uppercase tracking-widest">Download Full Audit (IPFS)</span>
            </a>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="interactive-card p-8 border-b-[#4ade80]/20 hover:border-[#4ade80]">
            <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">Total Treasury</span>
            <div className="text-4xl font-mono text-[#4ade80] mt-2">$1.42M</div>
          </div>
          <div className="interactive-card p-8 border-b-yellow-electric/20 hover:border-yellow-electric">
            <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">Distributed (YTD)</span>
            <div className="text-4xl font-mono text-yellow-electric mt-2">$845K</div>
          </div>
          <div className="interactive-card p-8 border-b-[#9400FF]/20 hover:border-[#9400FF]">
            <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">Active Validators</span>
            <div className="text-4xl font-mono text-[#9400FF] mt-2">1,024</div>
          </div>
        </div>

        <div className="glass-panel overflow-hidden rounded-sm border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-sm">
              <thead className="bg-white/5 text-gray-400 border-b border-white/10 text-xs uppercase tracking-widest">
                <tr>
                  <th className="p-6">Tx Hash</th>
                  <th className="p-6">Date</th>
                  <th className="p-6">Amount</th>
                  <th className="p-6">Allocation</th>
                  <th className="p-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx, idx) => (
                  <motion.tr
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    key={tx.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="p-6 text-[#9400FF]">{tx.id}</td>
                    <td className="p-6 text-gray-300">{tx.date}</td>
                    <td className="p-6 text-white">{tx.amount}</td>
                    <td className="p-6 text-gray-300">{tx.allocation}</td>
                    <td className="p-6 text-right">
                      <span className={`px-2 py-1 text-[10px] bg-white/5 border ${tx.status === 'VERIFIED' ? 'border-[#4ade80]/30 text-[#4ade80]' : 'border-yellow-electric/30 text-yellow-electric'}`}>
                        {tx.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ledger;
