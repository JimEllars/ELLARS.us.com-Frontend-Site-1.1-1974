import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import TelemetryStatus from './TelemetryStatus';
import { jwtDecode } from 'jwt-decode';
import { mutate } from 'swr';

const AccountSettings = () => {
  const navigate = useNavigate();
  const token = useAppStore(state => state.userToken);
  const clearAuth = useAppStore(state => state.clearAuth);
  const walletConnected = useAppStore(state => state.walletConnected);
  const privacyConsent = useAppStore(state => state.privacyConsent);
  const setPrivacyConsent = useAppStore(state => state.setPrivacyConsent);
  const showToast = useAppStore(state => state.showToast);

  const [email, setEmail] = useState('Unknown User');
  const [telemetryEnabled, setTelemetryEnabled] = useState(privacyConsent);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.email) {
          setEmail(decoded.email);
        }
      } catch (e) {
        // Fallback or ignore
      }
    }
  }, [token]);

  const handleToggleTelemetry = () => {
    const newValue = !telemetryEnabled;
    setTelemetryEnabled(newValue);
    setPrivacyConsent(newValue);
    localStorage.setItem('ellars_privacy_consent', newValue.toString());
    showToast(newValue ? 'Telemetry enabled' : 'Telemetry disabled');
  };

  const handleClearCache = () => {
    try {
      localStorage.removeItem('ellars_telemetry_queue');
      mutate(() => true, undefined, { revalidate: false }); // clear SWR cache (mutate all with undefined)
      showToast('Offline cache purged successfully');
    } catch (e) {
      showToast('Error purging cache');
    }
  };

  const handleEndSession = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="w-full">
      <div className="deco-frame p-6 bg-black/40 backdrop-blur-md rounded-sm border border-white/10">
        <h3 className="font-editorial font-bold text-2xl text-white mb-4">
          Account <span className="text-yellow-electric">Security</span>
        </h3>
        <div className="h-px w-16 bg-yellow-electric/50 mb-6"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-editorial font-bold text-lg text-white mb-4">Profile Information</h4>
            <div className="space-y-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-gray-500 block mb-1">Authenticated Session</label>
                <div className="text-white font-mono text-sm border border-white/10 p-2 bg-black/60">{email}</div>
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-gray-500 block mb-1">Active Tenant Scope</label>
                <div className="text-yellow-electric font-mono text-sm border border-white/10 p-2 bg-black/60">ELLARS_PERSONAL</div>
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-gray-500 block mb-1">Wallet Status</label>
                <div className="text-white font-mono text-sm border border-white/10 p-2 bg-black/60">
                  {walletConnected ? <span className="text-green-500">Connected</span> : <span className="text-red-500">Disconnected</span>}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-editorial font-bold text-lg text-white mb-4">Security Controls</h4>
            <div className="space-y-4">

              <div className="flex items-center justify-between p-3 border border-white/10 bg-black/60">
                <span className="font-mono text-xs uppercase tracking-widest text-gray-300">Telemetry & Analytics</span>
                <button
                  onClick={handleToggleTelemetry}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 ${telemetryEnabled ? 'bg-yellow-electric/50' : 'bg-gray-700'}`}
                >
                  <div className={`w-4 h-4 bg-yellow-electric rounded-full shadow-md transform transition-transform ${telemetryEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleClearCache}
                  className="w-full py-2 mb-2 border border-white/20 text-gray-300 font-mono text-xs uppercase tracking-widest hover:bg-white/5 transition-colors"
                >
                  Clear Offline Cache
                </button>
                <button
                  onClick={handleEndSession}
                  className="w-full py-2 border border-red-500/30 text-red-500 font-mono text-xs uppercase tracking-widest hover:bg-red-500/10 transition-colors"
                >
                  End Session
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      <TelemetryStatus />
    </div>
  );
};

export default AccountSettings;
