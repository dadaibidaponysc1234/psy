import axios from "axios"
import { BENCHMARK_CONFIG, getBenchmarkRefreshUrl } from "@/lib/config"
import { useBenchmarkAuthStore } from "@/stores/benchmark-auth-store"
import type { TokenResponse } from "@/types/benchmarking"

/**
 * Axios instance for all benchmarking API calls.
 * Automatically attaches Bearer token and handles 401 refresh.
 */
const benchmarkApi = axios.create({
  baseURL: BENCHMARK_CONFIG.BASE_URL,
  headers: { "Content-Type": "application/json" },
})

// Attach access token to every request
benchmarkApi.interceptors.request.use((config) => {
  const token = useBenchmarkAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401: try refresh, then retry — otherwise logout
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token)
    else reject(error)
  })
  failedQueue = []
}

benchmarkApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(benchmarkApi(originalRequest))
          },
          reject,
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    const { refreshToken, setTokens, setUser, logout } =
      useBenchmarkAuthStore.getState()

    if (!refreshToken) {
      isRefreshing = false
      logout()
      return Promise.reject(error)
    }

    try {
      // Use plain axios (not benchmarkApi) to avoid interceptor loop
      const res = await axios.post<TokenResponse>(getBenchmarkRefreshUrl(), {
        refresh_token: refreshToken,
      })

      const { access_token, refresh_token, user } = res.data
      setTokens(access_token, refresh_token)
      setUser(user)

      processQueue(null, access_token)

      originalRequest.headers.Authorization = `Bearer ${access_token}`
      return benchmarkApi(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      logout()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default benchmarkApi
