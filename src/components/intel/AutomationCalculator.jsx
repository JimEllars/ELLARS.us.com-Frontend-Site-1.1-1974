import React, { useState, useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useTelemetry } from '@/hooks/useTelemetry';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const AutomationCalculator = () => {
  const { trackEvent } = useTelemetry();

  const [efficiency, setEfficiency] = useState(() => {
    try {
      const saved = localStorage.getItem('automation_efficiency');
      return saved ? Number(saved) : 15;
    } catch {
      return 15;
    }
  });

  const [sessionUuid, setSessionUuid] = useState(() => {
    try {
      let uuid = localStorage.getItem('calculator_session_uuid');
      if (!uuid) {
        uuid = generateUUID();
        localStorage.setItem('calculator_session_uuid', uuid);
      }
      return uuid;
    } catch {
      return generateUUID();
    }
  });

  // Base constants for the conceptual calculation
  const totalCorporateTaxBase = 2500000000000; // $2.5 Trillion
  const populationEligible = 200000000; // 200 Million eligible adults

  // Spring animation for smooth numbers
  const springEfficiency = useSpring(efficiency, { stiffness: 50, damping: 20 });

  useEffect(() => {
    try {
      localStorage.setItem('automation_efficiency', efficiency);
    } catch (e) { console.warn('Failed to save efficiency', e); }

    const timer = setTimeout(() => {
      trackEvent('calculator_interaction', {
        efficiency_value: efficiency,
        session_uuid: sessionUuid
      });
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [efficiency, trackEvent, sessionUuid]);


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
    <div className="deco-frame bg-surface border border-yellow-electric/20 p-6 sm:p-8 mt-6 relative overflow-hidden group min-w-0">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-electric/5 rounded-full blur-3xl group-hover:bg-yellow-electric/10 transition-colors duration-700 pointer-events-none"></div>

      <div className="relative z-10 min-w-0">
        <div className="flex items-center gap-3 mb-6 min-w-0">
          <div className="w-2 h-2 bg-yellow-electric animate-pulse shrink-0"></div>
          <h3 className="tracking-[0.2em] uppercase font-deco font-normal text-xs text-yellow-electric truncate">
            Automation Dividend Calculator
          </h3>
        </div>

        <p className="text-text-muted text-xs mb-8 leading-relaxed">
          Adjust the projected Corporate AI Efficiency Savings percentage to see the conceptual
          Negative Income Tax Return distributed to American citizens.
        </p>

        <div className="mb-8 min-w-0">
          <div className="flex justify-between text-xs font-mono text-gray-400 mb-4 min-w-0">
            <span className="truncate mr-2">AI Efficiency Savings</span>
            <span className="text-yellow-electric font-bold shrink-0">{efficiency}%</span>
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
          <div className="flex justify-between text-[10px] text-gray-600 mt-2 font-mono uppercase tracking-widest min-w-0">
            <span className="truncate mr-2">Conservative (1%)</span>
            <span className="truncate">Aggressive (100%)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-6 min-w-0">
          <div className="bg-void border border-white/5 p-4 rounded-sm min-w-0 overflow-hidden">
            <span className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1 truncate">
              Projected Monthly Return
            </span>
            <motion.div className="text-2xl font-editorial font-bold text-white flex items-center min-w-0 overflow-hidden">
              <span className="text-yellow-electric mr-1 shrink-0">$</span>
              <span className="truncate">{displayMonthly.toLocaleString()}</span>
            </motion.div>
          </div>

          <div className="bg-void border border-white/5 p-4 rounded-sm min-w-0 overflow-hidden">
            <span className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1 truncate">
              Projected Annual Dividend
            </span>
            <motion.div className="text-2xl font-editorial font-bold text-white flex items-center min-w-0 overflow-hidden">
              <span className="text-yellow-electric mr-1 shrink-0">$</span>
              <span className="truncate">{displayAnnual.toLocaleString()}</span>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationCalculator;
