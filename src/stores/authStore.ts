// src/stores/authStore.ts
import { create } from 'zustand'

interface CustomUser {
  uid: string
  email: string | null
  nickname: string
}

interface AuthState {
  user: CustomUser | null
  loading: boolean
  setUser: (user: CustomUser | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
}))
