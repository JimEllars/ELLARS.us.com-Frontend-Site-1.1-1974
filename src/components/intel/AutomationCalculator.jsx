import React, { useState, useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useTelemetry } from '@/hooks/useTelemetry';
import { toast } from 'react-toastify';

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

  const clampValue = (val, min, max) => Math.min(Math.max(val, min), max);


  const [efficiency, setEfficiency] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlEff = params.get('efficiency') || params.get('roi');
      if (urlEff && !isNaN(Number(urlEff))) {
        const val = Number(urlEff);
        return clampValue(val, 1, 100);
      }
      const saved = localStorage.getItem('automation_efficiency');
      if (saved) {
        const val = Number(saved);
        return clampValue(val, 1, 100);
      }
      return 15;
    } catch {
      return 15;
    }
  });

  const [hours, setHours] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlHours = params.get('hours');
      if (urlHours && !isNaN(Number(urlHours))) {
        const val = Number(urlHours);
        return clampValue(val, 0, 168);
      }
      const saved = localStorage.getItem('automation_hours');
      if (saved) {
        const val = Number(saved);
        return clampValue(val, 0, 168);
      }
      return 40;
    } catch {
      return 40;
    }
  });

  // Initialization check for clamped URL variables
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      let wasClamped = false;

      const urlEff = params.get('efficiency') || params.get('roi');
      if (urlEff && !isNaN(Number(urlEff))) {
        const val = Number(urlEff);
        if (val < 1 || val > 100) wasClamped = true;
      }

      const urlHours = params.get('hours');
      if (urlHours && !isNaN(Number(urlHours))) {
        const val = Number(urlHours);
        if (val < 0 || val > 168) wasClamped = true;
      }

      if (wasClamped) {
        toast("Notice: Shared metrics parameters adjusted safely to meet platform operating bounds.", {
          position: "bottom-center",
          autoClose: 3500,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: false,
          draggable: false,
          className: 'bg-void border border-yellow-electric/20 text-yellow-electric font-mono text-xs uppercase tracking-widest text-center',
        });
      }
    } catch (e) {
      // Ignore
    }
  }, []);


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
  const springHours = useSpring(hours, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('automation_efficiency', efficiency);
        localStorage.setItem('automation_hours', hours);

        const params = new URLSearchParams(window.location.search);
        params.set('roi', efficiency);
        params.set('hours', hours);
        // Remove old 'efficiency' param if it exists to clean up
        if (params.has('efficiency')) {
          params.delete('efficiency');
        }
        // Replace history state to update search params without triggering re-render cascades
        window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
      } catch (e) {
        // Silent failure for history API
      }

      trackEvent('calculator_interaction', {
        efficiency_value: efficiency,
        hours_value: hours,
        session_uuid: sessionUuid
      });
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [efficiency, hours, trackEvent, sessionUuid]);


  // Effect to update spring when state changes
  useEffect(() => {
    springEfficiency.set(efficiency);
    return () => {};
  }, [efficiency, springEfficiency]);

  useEffect(() => {
    springHours.set(hours);
    return () => {};
  }, [hours, springHours]);

  // Derived calculations using framer-motion transforms
  const annualDividend = useTransform([springEfficiency, springHours], ([eff, hrs]) => {
    // A conceptual formula: Savings scale with hours to show impact. Baseline is 40 hours = 1x.
    const hoursMultiplier = hrs / 40;
    const savingsPool = totalCorporateTaxBase * (eff / 100) * hoursMultiplier;
    return Math.round(savingsPool / populationEligible);
  });

  const monthlyDividend = useTransform(annualDividend, (annual) => {
    return Math.round(annual / 12);
  });

  // Formatting for display
  const [displayAnnual, setDisplayAnnual] = useState(0);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const handleShare = () => {
    const url = new URL(window.location.href); url.searchParams.set('roi', efficiency); url.searchParams.set('hours', hours); navigator.clipboard.writeText(url.toString()).then(() => {
      toast('Configuration link copied to clipboard', {
        position: "bottom-center",
        autoClose: 2000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: false,
        className: 'bg-void border border-yellow-electric/20 text-yellow-electric font-mono text-xs uppercase tracking-widest text-center',
      });
      trackEvent('share_configuration', { url: window.location.href });
    }).catch(err => {
      console.error('Failed to copy link', err);
    });
  };

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
    <div id="automation-calculator-print-zone" className="deco-frame bg-surface border border-yellow-electric/20 p-6 sm:p-8 mt-6 relative overflow-hidden group min-w-0">

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #automation-calculator-print-zone, #automation-calculator-print-zone * {
            visibility: visible;
          }
          #automation-calculator-print-zone {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #050505 !important;
            color: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
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
          Adjust the projected Corporate AI Efficiency Savings percentage and Weekly Automated Hours to see the conceptual
          Negative Income Tax Return distributed to American citizens.
        </p>

        <div className="mb-8 min-w-0">
          <div className="flex justify-between text-xs font-mono text-gray-400 mb-4 min-w-0">
            <span className="truncate mr-2">AI Efficiency Savings</span>
            <div className="flex items-center shrink-0"><input type="number" min="1" max="100" value={efficiency} onChange={(e) => { let val = e.target.value; if (val === '') { setEfficiency(''); return; } let v = parseInt(val, 10); if (isNaN(v)) return; setEfficiency(clampValue(v, 1, 100)); }} onBlur={() => { if (efficiency === '' || isNaN(efficiency)) setEfficiency(1); else setEfficiency(clampValue(efficiency, 1, 100)); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }} className="w-12 bg-transparent text-yellow-electric font-bold text-right border-b border-white/10 focus:border-yellow-electric focus:outline-none appearance-none m-0 p-0" /><span className="text-yellow-electric font-bold ml-1">%</span></div>
          </div>

          <input
            type="range"
            min="1"
            max="100"
            value={efficiency}
            onChange={(e) => setEfficiency(clampValue(Number(e.target.value), 1, 100))}
            className="w-full h-1 bg-void rounded-sm appearance-none cursor-pointer border border-white/10 accent-yellow-electric hover:accent-yellow-electric/80 focus:outline-none focus:border-yellow-electric/50 transition-colors"
            style={{
              background: `linear-gradient(to right, #fde047 ${efficiency}%, #0a0a0a ${efficiency}%)`
            }}
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-2 font-mono uppercase tracking-widest min-w-0 mb-6">
            <span className="truncate mr-2">Conservative (1%)</span>
            <span className="truncate">Aggressive (100%)</span>
          </div>

          <div className="flex justify-between text-xs font-mono text-gray-400 mb-4 min-w-0">
            <span className="truncate mr-2">Weekly Automated Hours</span>
            <input type="number" min="0" max="168" value={hours} onChange={(e) => { let val = e.target.value; if (val === '') { setHours(''); return; } let v = parseInt(val, 10); if (isNaN(v)) return; setHours(clampValue(v, 0, 168)); }} onBlur={() => { if (hours === '' || isNaN(hours)) setHours(0); else setHours(clampValue(hours, 0, 168)); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }} className="w-12 bg-transparent text-yellow-electric font-bold text-right border-b border-white/10 focus:border-yellow-electric focus:outline-none appearance-none m-0 p-0 shrink-0" />
          </div>

          <input
            type="range"
            min="0"
            max="168"
            value={hours}
            onChange={(e) => setHours(clampValue(Number(e.target.value), 0, 168))}
            className="w-full h-1 bg-void rounded-sm appearance-none cursor-pointer border border-white/10 accent-yellow-electric hover:accent-yellow-electric/80 focus:outline-none focus:border-yellow-electric/50 transition-colors"
            style={{
              background: `linear-gradient(to right, #fde047 ${(hours / 168) * 100}%, #0a0a0a ${(hours / 168) * 100}%)`
            }}
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-2 font-mono uppercase tracking-widest min-w-0">
            <span className="truncate mr-2">Low (0h)</span>
            <span className="truncate">High (168h)</span>
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


        <div className="mt-6 border-t border-white/10 pt-4 min-w-0">
          <button
            onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsBreakdownOpen(!isBreakdownOpen);
              }
            }}
            aria-expanded={isBreakdownOpen}
            aria-controls="metadata-breakdown-drawer"
            className="text-[10px] font-mono text-gray-500 uppercase tracking-widest hover:text-yellow-electric transition-colors flex items-center gap-2 outline-none focus-visible:ring-1 focus-visible:ring-yellow-electric/50"
          >
            <span className="shrink-0">{isBreakdownOpen ? '[-]' : '[+]'}</span>
            <span className="truncate">View Calculation Metadata Breakdown</span>
          </button>

          <motion.div
            id="metadata-breakdown-drawer"
            initial={false}
            animate={{ height: isBreakdownOpen ? 'auto' : 0, opacity: isBreakdownOpen ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="bg-void border border-white/5 p-4 mt-4 text-[10px] font-mono text-gray-400 uppercase tracking-widest space-y-2">
              <div className="flex justify-between"><span className="truncate mr-2">Total Corporate Tax Base</span><span className="shrink-0">2.5 Trillion</span></div>
              <div className="flex justify-between"><span className="truncate mr-2">Eligible Population</span><span className="shrink-0">200 Million</span></div>
              <div className="flex justify-between"><span className="truncate mr-2">Current Efficiency Rate</span><span className="shrink-0">{efficiency}%</span></div>
              <div className="flex justify-between"><span className="truncate mr-2">Current Hours Multiplier</span><span className="shrink-0">{(hours / 40).toFixed(2)}x</span></div>

              <div className="mt-4 pt-4 border-t border-white/5 flex justify-end print:hidden">
                <button
                  onClick={() => window.print()}
                  className="text-yellow-electric/70 hover:text-yellow-electric transition-colors flex items-center gap-1 focus:outline-none"
                >
                  <span className="shrink-0">[&gt;]</span>
                  <span className="truncate">Export Layout Blueprint</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-6 flex justify-end min-w-0 print:hidden">
          <button
            onClick={handleShare}
            className="border border-yellow-electric/30 text-yellow-electric text-xs tracking-widest uppercase hover:bg-yellow-electric/10 transition-colors px-4 py-2"
          >
            Share Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutomationCalculator;
