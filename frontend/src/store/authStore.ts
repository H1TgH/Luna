import { create } from 'zustand'

interface AuthState {
  isAuthenticated: boolean
  setAuthenticated: (value: boolean) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  clearAuth: () => set({ isAuthenticated: false }),
}))

if (typeof localStorage !== 'undefined' && localStorage.getItem('luna-auth')) {
  localStorage.removeItem('luna-auth')
}
