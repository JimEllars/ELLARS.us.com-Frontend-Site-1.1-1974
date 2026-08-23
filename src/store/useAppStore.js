import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set) => ({
      userRole: 'Observer',
      walletConnected: false,
      articles: [],
      isDonateModalOpen: false,
      toastMessage: null,
      updateAvailable: false,
      privacyConsent: false, // Added privacy banner consent flag
      userToken: null,
      isAuthenticated: false,
      isAuthChecking: true,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setArticles: (articles) => set({ articles }),
      setWalletConnected: (status) => set({ walletConnected: status, userRole: status ? 'Navigator' : 'Observer' }),
      setRole: (role) => set({ userRole: role }),
      setDonateModalOpen: (isOpen) => set({ isDonateModalOpen: isOpen }),
      showToast: (message) => {
        set({ toastMessage: message });
        setTimeout(() => {
          set({ toastMessage: null });
        }, 3000);
      },
      setPrivacyConsent: (status) => set({ privacyConsent: status }),
      setUpdateAvailable: (status) => set({ updateAvailable: status }),
      setUserToken: (token) => set({ userToken: token, isAuthenticated: !!token }),
      logout: () => set({ userToken: null, isAuthenticated: false }),
      setIsAuthChecking: (status) => set({ isAuthChecking: status }),
      clearAuth: () => set({ userToken: null, isAuthenticated: false })
    }),
    {
      name: 'ellars_us_com_preferences',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
      partialize: (state) => ({
        userRole: state.userRole,
        walletConnected: state.walletConnected,
        privacyConsent: state.privacyConsent,
        userToken: state.userToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
