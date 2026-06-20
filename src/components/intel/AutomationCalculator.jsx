import React, { useState, useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useTelemetry } from '@/hooks/useTelemetry';


const AutomationCalculator = () => {
  const { trackEvent } = useTelemetry();
  const [efficiency, setEfficiency] = useState(15);

  // Base constants for the conceptual calculation
  const totalCorporateTaxBase = 2500000000000; // $2.5 Trillion
  const populationEligible = 200000000; // 200 Million eligible adults

  // Spring animation for smooth numbers
  const springEfficiency = useSpring(efficiency, { stiffness: 50, damping: 20 });
  useEffect(() => {
    const timer = setTimeout(() => {
      trackEvent('calculator_interaction', { efficiency_value: efficiency });
    }, 1000);
    return () => clearTimeout(timer);
  }, [efficiency, trackEvent]);


  // Effect to update spring when state changes
  useEffect(() => {
    springEfficiency.set(efficiency);
  }, [efficiency, springEfficiency]);

  // Derived calculations using framer-motion transforms
  const annualDividend = useTransform(springEfficiency, (eff) => {
    const savingsPool = totalCorporateTaxBase * (eff / 100);
    return Math.round(savingsPool / populationEligible);
  });

  const monthlyDividend = useTransform(annualDividend, (annual) => {
    return Math.round(annual / 12);
  });

  // Formatting for display
  const [displayAnnual, setDisplayAnnual] = useState(0);
  const [displayMonthly, setDisplayMonthly] = useState(0);

  useEffect(() => {
    const unsubscribeAnnual = annualDividend.onChange((v) => setDisplayAnnual(Math.round(v)));
    const unsubscribeMonthly = monthlyDividend.onChange((v) => setDisplayMonthly(Math.round(v)));
    return () => {
      unsubscribeAnnual();
      unsubscribeMonthly();
    };
  }, [annualDividend, monthlyDividend]);

  return (
    <div className="deco-frame bg-surface border border-yellow-electric/20 p-6 sm:p-8 mt-6 relative overflow-hidden group">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-electric/5 rounded-full blur-3xl group-hover:bg-yellow-electric/10 transition-colors duration-700 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-2 h-2 bg-yellow-electric animate-pulse"></div>
          <h3 className="tracking-[0.2em] uppercase font-deco font-normal text-xs text-yellow-electric">
            Automation Dividend Calculator
          </h3>
        </div>

        <p className="text-text-muted text-xs mb-8 leading-relaxed">
          Adjust the projected Corporate AI Efficiency Savings percentage to see the conceptual
          Negative Income Tax Return distributed to American citizens.
        </p>

        <div className="mb-8">
          <div className="flex justify-between text-xs font-mono text-gray-400 mb-4">
            <span>AI Efficiency Savings</span>
            <span className="text-yellow-electric font-bold">{efficiency}%</span>
          </div>

          <input
            type="range"
            min="1"
            max="100"
            value={efficiency}
            onChange={(e) => setEfficiency(Number(e.target.value))}
            className="w-full h-1 bg-void rounded-sm appearance-none cursor-pointer border border-white/10 accent-yellow-electric hover:accent-yellow-electric/80 focus:outline-none focus:border-yellow-electric/50 transition-colors"
            style={{
              background: `linear-gradient(to right, #fde047 ${efficiency}%, #0a0a0a ${efficiency}%)`
            }}
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-2 font-mono uppercase tracking-widest">
            <span>Conservative (1%)</span>
            <span>Aggressive (100%)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-6">
          <div className="bg-void border border-white/5 p-4 rounded-sm">
            <span className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">
              Projected Monthly Return
            </span>
            <motion.div className="text-2xl font-editorial font-bold text-white flex items-center">
              <span className="text-yellow-electric mr-1">$</span>
              <span>{displayMonthly.toLocaleString()}</span>
            </motion.div>
          </div>

          <div className="bg-void border border-white/5 p-4 rounded-sm">
            <span className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">
              Projected Annual Dividend
            </span>
            <motion.div className="text-2xl font-editorial font-bold text-white flex items-center">
              <span className="text-yellow-electric mr-1">$</span>
              <span>{displayAnnual.toLocaleString()}</span>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationCalculator;
