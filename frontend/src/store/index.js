import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (userData) => set((state) => ({
        user: { ...state.user, ...userData }
      })),

      isAdmin: () => get().user?.role === 'admin',
      isAgent: () => get().user?.role === 'agent',
      isFarmer: () => get().user?.role === 'farmer',
    }),
    { name: 'auth-storage' }
  )
);

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  language: localStorage.getItem('i18nextLng') || 'en',
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setLanguage: (lang) => {
    localStorage.setItem('i18nextLng', lang);
    set({ language: lang });
  },
}));

// Offline queue store for milk entries
export const useOfflineStore = create(
  persist(
    (set, get) => ({
      pendingEntries: [],
      
      addPendingEntry: (entry) => set((state) => ({
        pendingEntries: [...state.pendingEntries, {
          ...entry,
          _offlineId: Date.now().toString(),
          _createdAt: new Date().toISOString()
        }]
      })),

      removePendingEntry: (offlineId) => set((state) => ({
        pendingEntries: state.pendingEntries.filter(e => e._offlineId !== offlineId)
      })),

      clearPendingEntries: () => set({ pendingEntries: [] }),

      getPendingCount: () => get().pendingEntries.length,
    }),
    { name: 'offline-queue' }
  )
);
