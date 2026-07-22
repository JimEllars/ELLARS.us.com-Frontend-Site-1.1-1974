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
      setUpdateAvailable: (status) => set({ updateAvailable: status })
    }),
    {
      name: 'ellars_us_com_preferences',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userRole: state.userRole,
        walletConnected: state.walletConnected,
        privacyConsent: state.privacyConsent
      })
    }
  )
);
