import { useCallback, useEffect, useRef, useState } from "react"
import benchmarkApi from "@/lib/benchmark-api"
import { getBenchmarkJobStatusUrl, getBenchmarkUploadUrl } from "@/lib/config"
import type { DatasetStructure } from "@/components/benchmarking/mapping-step/dataset"

const READY = [
  "uploaded",
  "configured",
  "preprocessing",
  "processing",
  "completed",
]
const EXTRACTING_POLL_MS = 3000
const WAITING_POLL_MS = 10000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchStatus(jobId: string): Promise<string> {
  const response = await benchmarkApi.get<{ status?: string }>(
    getBenchmarkJobStatusUrl(jobId)
  )
  return (response.data.status ?? "").toLowerCase()
}

async function fetchStructure(jobId: string): Promise<DatasetStructure> {
  const base = getBenchmarkUploadUrl().replace("/upload", "")
  const response = await benchmarkApi.get<{
    dataset_structure: DatasetStructure
  }>(`${base}/${jobId}/explore`)
  return response.data.dataset_structure
}

/**
 * The job's dataset listing: waits out extraction, then fetches `/explore`. While the job
 * isn't ready yet it checks again every 10 seconds, in the background: `loading` is only
 * set for the first check and a manual refresh, so the page doesn't flash to a spinner.
 */
export function useDatasetStructure(jobId: string | null) {
  const [structure, setStructure] = useState<DatasetStructure | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const background = useRef(false)

  const refresh = useCallback(() => setAttempt((count) => count + 1), [])

  useEffect(() => {
    if (!jobId) return
    let cancelled = false

    const load = async () => {
      if (!background.current) setLoading(true)
      background.current = false
      setError(null)
      try {
        let status = await fetchStatus(jobId)
        while (!cancelled && status === "extracting") {
          await sleep(EXTRACTING_POLL_MS)
          status = await fetchStatus(jobId)
        }
        if (cancelled) return
        if (READY.includes(status)) {
          const next = await fetchStructure(jobId)
          if (!cancelled) setStructure(next)
          return
        }
        setLoading(false)
        await sleep(WAITING_POLL_MS)
        if (!cancelled) {
          background.current = true
          refresh()
        }
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Failed to load the dataset"
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [jobId, attempt, refresh])

  return { structure, loading, error, refresh }
}
