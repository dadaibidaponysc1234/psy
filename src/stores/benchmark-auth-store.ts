import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { UserOut } from "@/types/benchmarking"

interface BenchmarkAuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserOut | null
  isAuthenticated: boolean

  setTokens: (access: string, refresh: string) => void
  setUser: (user: UserOut) => void
  logout: () => void
}

export const useBenchmarkAuthStore = create<BenchmarkAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setTokens: (access, refresh) =>
        set({
          accessToken: access,
          refreshToken: refresh,
          isAuthenticated: true,
        }),

      setUser: (user) => set({ user }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "benchmark-auth",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
