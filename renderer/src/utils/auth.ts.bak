import { create } from "zustand";
import { type UserData } from "@/features/auth/types";

interface AuthState {
  user: UserData | null
  setUser: (user: UserData) => void
  reset: () => void
  isAuthenticated: () => boolean
}

export const useAuth = create<AuthState>()((set, get) => ({
  user: null,
  setUser: (user: UserData) => set({ user }),
  reset: () => set({ user: null }),
  isAuthenticated: () => !!get().user,
}))




