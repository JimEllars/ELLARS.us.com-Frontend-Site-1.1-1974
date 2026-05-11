import { create } from 'zustand';

export const useAppStore = create((set) => ({
  userRole: 'Observer',
  walletConnected: false,
  setWalletConnected: (status) => set({ walletConnected: status, userRole: status ? 'Navigator' : 'Observer' }),
  setRole: (role) => set({ userRole: role })
}));
