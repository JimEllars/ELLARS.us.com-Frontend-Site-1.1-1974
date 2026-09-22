import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Custom wrapper for localStorage with defensive try/catch to prevent crash loops
const safeLocalStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch (error) {
      console.warn(`[safeLocalStorage] Error getting item ${name}:`, error);
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      console.warn(`[safeLocalStorage] Error setting item ${name}:`, error);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch (error) {
      console.warn(`[safeLocalStorage] Error removing item ${name}:`, error);
    }
  },
};

export const useAppStore = create(
  persist(
    (set) => ({
      userRole: 'Observer',
      walletConnected: false,
      articles: [],
      isDonateModalOpen: false,
      isNewsletterModalOpen: false,
      isLiveStreamActive: false,
      streamEmbedUrl: null,
      toastMessage: null,
      updateAvailable: false,
      privacyConsent: false, // Added privacy banner consent flag
      userToken: null,
      isAuthenticated: false,
      isAuthChecking: true,
      _hasHydrated: false,
      isHydrating: true,
      audioIsPlaying: false,
      audioActiveTrack: null,
      audioProgress: 0,
      audioVolume: 1,
      setAudioIsPlaying: (status) => set(() => ({ audioIsPlaying: status })),
      setAudioActiveTrack: (track) => set(() => ({ audioActiveTrack: track })),
      setAudioProgress: (progress) => set(() => ({ audioProgress: progress })),
      setAudioVolume: (volume) => set(() => ({ audioVolume: volume })),
      setHasHydrated: (status) => set(() => ({ _hasHydrated: status })),
      setIsHydrating: (status) => set(() => ({ isHydrating: status })),
      setIsLiveStreamActive: (status) => set(() => ({ isLiveStreamActive: status })),
      setArticles: (articles) => set(() => ({ articles: [...articles] })),
      setWalletConnected: (status) => set(() => ({ walletConnected: status, userRole: status ? 'Navigator' : 'Observer' })),
      setRole: (role) => set(() => ({ userRole: role })),
      setDonateModalOpen: (isOpen) => set(() => ({ isDonateModalOpen: isOpen })),
      setNewsletterModalOpen: (isOpen) => set(() => ({ isNewsletterModalOpen: isOpen })),
      showToast: (message) => {
        set(() => ({ toastMessage: message }));
        setTimeout(() => {
          set(() => ({ toastMessage: null }));
        }, 3000);
      },
      setPrivacyConsent: (status) => set(() => ({ privacyConsent: status })),
      setUpdateAvailable: (status) => set(() => ({ updateAvailable: status })),
      setUserToken: (token) => set(() => ({ userToken: token, isAuthenticated: !!token })),
      logout: () => set(() => ({ userToken: null, isAuthenticated: false })),
      setIsAuthChecking: (status) => set(() => ({ isAuthChecking: status })),
      clearAuth: () => set(() => ({ userToken: null, isAuthenticated: false }))
    }),
    {
      name: 'ellars_us_com_preferences',
      storage: createJSONStorage(() => safeLocalStorage),
      onRehydrateStorage: () => (state, error) => {
        if (!error) {
          useAppStore.setState({ _hasHydrated: true, isHydrating: false });
        }
      },
      partialize: (state) => ({
        audioVolume: state.audioVolume,
        userRole: state.userRole,
        walletConnected: state.walletConnected,
        privacyConsent: state.privacyConsent,
        userToken: state.userToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
