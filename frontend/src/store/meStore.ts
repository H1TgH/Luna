import { create } from 'zustand'
import type { ProfileResponse } from '../types'

interface MeState {
  me: ProfileResponse | null
  loading: boolean
  fetched: boolean
  setMe: (profile: ProfileResponse | null) => void
  setLoading: (v: boolean) => void
  setFetched: (v: boolean) => void
  clear: () => void
}

export const useMeStore = create<MeState>((set) => ({
  me: null,
  loading: false,
  fetched: false,
  setMe: (profile) => set({ me: profile }),
  setLoading: (v) => set({ loading: v }),
  setFetched: (v) => set({ fetched: v }),
  clear: () => set({ me: null, loading: false, fetched: false }),
}))