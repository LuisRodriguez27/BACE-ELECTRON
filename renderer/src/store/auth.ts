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
  userPermissions: string[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User) => void;
  setBusiness: (business: Business) => void;
  setUserPermissions: (permissions: string[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  isAuthenticated: () => boolean;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  business: null,
  userPermissions: [],
  isLoading: false,
  error: null,

  setUser: (user: User) => set({ user, error: null }),
  setBusiness: (business: Business) => set({ business }),
  setUserPermissions: (permissions: string[]) => set({ userPermissions: permissions }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  reset: () => set({ 
    user: null, 
    business: null, 
    userPermissions: [],
    isLoading: false, 
    error: null 
  }),
  isAuthenticated: () => !!get().user,
  hasPermission: (permission: string) => {
    const { userPermissions } = get();
    return userPermissions.includes(permission);
  },
}));
