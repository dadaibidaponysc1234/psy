"use client"

import { useEffect, useState } from "react"
import { getBenchmarkHealthUrl } from "@/lib/config"

/**
 * Backend deployment mode.
 *
 * The backend runs in one of two modes (env `APP_MODE`, read at container start,
 * constant for the deployment's lifetime):
 *   - "full"  → controller handles everything; uploads via resumable chunked POST.
 *   - "split" → controller (api) + private worker; uploads direct to S3 via presign.
 *
 * `GET <origin>/health` returns mode "full" | "api" | "worker". Behind the LB only
 * the controller is public, so per request you only ever see "full" or "api".
 * Map api/worker → "split".
 *
 * Mode is constant per deployment, so we fetch /health once and cache it at the
 * module level. We deliberately do NOT use a NEXT_PUBLIC_* flag — that bakes in at
 * `next build` and can drift from the actual deployment.
 */
export type BenchmarkMode = "full" | "split"

let cached: BenchmarkMode | null = null
let inflight: Promise<BenchmarkMode> | null = null

const mapMode = (raw: unknown): BenchmarkMode =>
  raw === "full" ? "full" : "split"

/**
 * Resolve the backend mode, fetching /health once and caching the result.
 * On failure, falls back to "split" (the presign path, which matches the
 * already-shipped behaviour) and does not cache, so a later call can retry.
 */
export async function resolveBenchmarkMode(): Promise<BenchmarkMode> {
  if (cached) return cached
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const res = await fetch(getBenchmarkHealthUrl(), { method: "GET" })
      if (!res.ok) throw new Error(`health ${res.status}`)
      const data = await res.json()
      cached = mapMode(data?.mode)
      return cached
    } catch (err) {
      console.warn("[benchmark-mode] /health unreachable, defaulting to split", err)
      return "split"
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/** Synchronously read the cached mode (null until /health has resolved once). */
export function getCachedBenchmarkMode(): BenchmarkMode | null {
  return cached
}

/**
 * React hook: returns the resolved backend mode (null while the first /health
 * request is in flight). Triggers the fetch on mount if not already cached.
 */
export function useBenchmarkMode(): { mode: BenchmarkMode | null; loading: boolean } {
  const [mode, setMode] = useState<BenchmarkMode | null>(getCachedBenchmarkMode())

  useEffect(() => {
    if (mode) return
    let active = true
    resolveBenchmarkMode().then((m) => {
      if (active) setMode(m)
    })
    return () => {
      active = false
    }
  }, [mode])

  return { mode, loading: mode === null }
}
