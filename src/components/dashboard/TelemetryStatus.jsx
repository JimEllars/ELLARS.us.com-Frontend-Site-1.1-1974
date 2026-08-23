import React, { useState, useEffect } from 'react';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const TelemetryStatus = () => {
  const { flushQueue } = useTelemetry();
  const isOnline = useNetworkStatus();
  const [queueDepth, setQueueDepth] = useState(0);
  const [isFlushing, setIsFlushing] = useState(false);

  useEffect(() => {
    const checkQueue = () => {
      try {
        const queue = JSON.parse(localStorage.getItem('ellars_telemetry_queue') || '[]');
        setQueueDepth(queue.length);
      } catch (e) {
        setQueueDepth(0);
      }
    };
    checkQueue();
    const interval = setInterval(checkQueue, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleFlush = async () => {
    setIsFlushing(true);
    await flushQueue();
    // Update queue after flushing
    try {
      const queue = JSON.parse(localStorage.getItem('ellars_telemetry_queue') || '[]');
      setQueueDepth(queue.length);
    } catch (e) {
      setQueueDepth(0);
    }
    setTimeout(() => setIsFlushing(false), 500); // Small delay to show animation
  };

  return (
    <div className="deco-frame p-6 bg-black/40 backdrop-blur-md rounded-sm border border-white/10 mb-8 mt-8">
      <h3 className="font-editorial font-bold text-2xl text-white mb-4">
        Edge Telemetry <span className="text-yellow-electric">Status</span>
      </h3>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-2">
          <span className="font-mono text-xs uppercase tracking-widest text-gray-400">Network State</span>
          <span className={`font-mono text-xs font-bold uppercase tracking-widest ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        <div className="flex justify-between items-center border-b border-white/10 pb-2">
          <span className="font-mono text-xs uppercase tracking-widest text-gray-400">Queue Depth</span>
          <span className="font-mono text-xs uppercase tracking-widest text-white">
            {queueDepth} Pending
          </span>
        </div>
        <div className="flex justify-between items-center border-b border-white/10 pb-2">
          <span className="font-mono text-xs uppercase tracking-widest text-gray-400">Protocol</span>
          <span className="font-mono text-xs uppercase tracking-widest text-yellow-electric">
            AXiM-Frontend-v1
          </span>
        </div>
        <div className="mt-4">
          <button
            onClick={handleFlush}
            disabled={isFlushing || queueDepth === 0}
            className={`w-full py-2 border font-mono text-xs uppercase tracking-widest transition-colors flex justify-center items-center gap-2 ${isFlushing || queueDepth === 0 ? 'border-gray-600 text-gray-500 cursor-not-allowed' : 'border-yellow-electric/30 text-yellow-electric hover:bg-yellow-electric/10'}`}
          >
            {isFlushing ? (
              <>
                <div className="w-3 h-3 border-2 border-yellow-electric/30 border-t-yellow-electric rounded-full animate-spin"></div>
                Flushing...
              </>
            ) : (
              'Flush Telemetry'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TelemetryStatus;
