import { create } from "zustand";

interface User {
  id: number;
  username: string;
  active: number; // SQLite usa number (0 o 1)
}

interface Business {
  id: number;
  name: string;
}

interface AuthState {
  user: User | null;
  business: Business | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User) => void;
  setBusiness: (business: Business) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  business: null,
  isLoading: false,
  error: null,

  setUser: (user: User) => set({ user, error: null }),
  setBusiness: (business: Business) => set({ business }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  reset: () => set({ 
    user: null, 
    business: null, 
    isLoading: false, 
    error: null 
  }),
  isAuthenticated: () => !!get().user,
}));
