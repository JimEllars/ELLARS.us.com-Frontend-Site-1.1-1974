import { create } from 'zustand';

export const useAppStore = create((set) => ({
  userRole: 'Observer',
  walletConnected: false,
  articles: [],
  isDonateModalOpen: false,
  toastMessage: null,
  setArticles: (articles) => set({ articles }),
  setWalletConnected: (status) => set({ walletConnected: status, userRole: status ? 'Navigator' : 'Observer' }),
  setRole: (role) => set({ userRole: role }),
  setDonateModalOpen: (isOpen) => set({ isDonateModalOpen: isOpen }),
  showToast: (message) => {
    set({ toastMessage: message });
    setTimeout(() => {
      set({ toastMessage: null });
    }, 3000);
  }
}));
