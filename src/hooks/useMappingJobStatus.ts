/**
 * useMappingJobStatus
 *
 * Hook for polling job status during the mapping step.
 * Handles status checking, polling intervals, and terminal state detection.
 */

import { useState, useEffect, useCallback, useRef } from "react"
import axios from "axios"
import { getBenchmarkJobStatusUrl } from "@/lib/config"

export interface JobStatusResponse {
  job_id: string
  status: string
  created_at: string
  uploaded_at: string
  processing_started_at: string
  processing_completed_at: string | null
  processing_details?: {
    uploaded_files: string[]
    zip_files_to_extract: string[]
    message: string
  }
  uploaded_files?: string[]
  zip_files_to_extract?: string[]
  message?: string
}

export interface UseMappingJobStatusOptions {
  /** Job ID to poll */
  jobId: string | null
  /** Polling interval in ms (default: 5000) */
  pollInterval?: number
  /** Whether to enable polling (default: true) */
  enabled?: boolean
  /** Callback when status changes */
  onStatusChange?: (status: string) => void
}

export interface UseMappingJobStatusReturn {
  /** Current job status response */
  jobStatus: JobStatusResponse | null
  /** Current status string */
  status: string | null
  /** Whether currently checking status */
  isChecking: boolean
  /** Any error that occurred */
  error: string | null
  /** Whether job is in a terminal state */
  isTerminal: boolean
  /** Manually trigger a status check */
  checkStatus: () => Promise<void>
}

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"])

/**
 * Hook for managing job status polling during mapping
 *
 * @example
 * const { jobStatus, status, isTerminal, checkStatus } = useMappingJobStatus({
 *   jobId,
 *   pollInterval: 5000,
 *   onStatusChange: (s) => console.log('Status changed:', s),
 * })
 */
export function useMappingJobStatus({
  jobId,
  pollInterval = 5000,
  enabled = true,
  onStatusChange,
}: UseMappingJobStatusOptions): UseMappingJobStatusReturn {
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const prevStatus = useRef<string | null>(null)

  const checkStatus = useCallback(async () => {
    if (!jobId) return

    setIsChecking(true)
    setError(null)

    try {
      const res = await axios.get<JobStatusResponse>(
        getBenchmarkJobStatusUrl(jobId)
      )
      setJobStatus(res.data)
      const newStatus = res.data?.status ?? null
      setStatus(newStatus)

      // Trigger callback on status change
      if (newStatus !== prevStatus.current && onStatusChange) {
        onStatusChange(newStatus || "")
      }
      prevStatus.current = newStatus
    } catch (e: any) {
      const message =
        e?.response?.data?.message || e?.message || "Failed to check status"
      setError(message)
    } finally {
      setIsChecking(false)
    }
  }, [jobId, onStatusChange])

  // Initial check
  useEffect(() => {
    if (enabled && jobId) {
      checkStatus()
    }
  }, [enabled, jobId, checkStatus])

  // Polling
  useEffect(() => {
    if (!enabled || !jobId) return

    const currentStatus = (status || "").toLowerCase()
    if (TERMINAL_STATUSES.has(currentStatus)) return

    const intervalId = setInterval(checkStatus, pollInterval)
    return () => clearInterval(intervalId)
  }, [enabled, jobId, status, pollInterval, checkStatus])

  const isTerminal = TERMINAL_STATUSES.has((status || "").toLowerCase())

  return {
    jobStatus,
    status,
    isChecking,
    error,
    isTerminal,
    checkStatus,
  }
}

export default useMappingJobStatus
