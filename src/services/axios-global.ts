"use client"

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"

let installed = false

function formatFullUrl(config: InternalAxiosRequestConfig): string | undefined {
  const { url, baseURL } = config || {}
  try {
    if (!url && baseURL) return baseURL
    if (url && baseURL) return new URL(url, baseURL).toString()
    return url
  } catch {
    return url || baseURL
  }
}

export function installAxiosInterceptors() {
  if (installed) return
  installed = true

  // Request interceptor (kept minimal; can add tracing if desired)
  axios.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
  )

  // Response error interceptor: log rich context globally
  axios.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const cfg = error.config as InternalAxiosRequestConfig | undefined
      const fullUrl = cfg ? formatFullUrl(cfg) : undefined

      const isNetworkError = !error.response && !!(error as any).request
      const code = (error as any)?.code
      const status = error.response?.status
      const statusText = error.response?.statusText

      // Detect FormData to avoid logging raw contents
      const data = (cfg as any)?.data
      const dataType = data instanceof FormData ? "FormData" : typeof data

      // Global structured error log
      console.error("[Axios] Request error", {
        message: error.message,
        code,
        url: fullUrl,
        baseURL: cfg?.baseURL,
        method: cfg?.method,
        params: (cfg as any)?.params,
        dataType,
        status,
        statusText,
        networkError: isNetworkError,
        isTimeout: code === "ECONNABORTED",
        requestHeaders: cfg?.headers,
        responseHeaders: error.response?.headers,
        responseData: error.response?.data,
      })

      return Promise.reject(error)
    }
  )
}