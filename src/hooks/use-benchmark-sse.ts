"use client"

import { useEffect, useRef, useCallback } from "react"
import axios from "axios"
import { getBenchmarkJobStatusUrl, getBenchmarkEventsUrl, getBenchmarkLogsUrl, getBenchmarkJobLogsUrl, getBenchmarkRefreshUrl } from "@/lib/config"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"
import { useBenchmarkAuthStore } from "@/stores/benchmark-auth-store"
import benchmarkApi from "@/lib/benchmark-api"
import { MAX_LOG_LINES, parseSSE, toLogLine } from "@/lib/job-log-stream"
import type { ToolStatusEvent, ToolLogsResponse } from "@/types/benchmarking"

/** A job in one of these has sent its last events; the stream isn't reopened. */
const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"])
const MAX_RETRY_DELAY_MS = 30000

function inferToolStatus(t: Record<string, any>): ToolStatusEvent["status"] {
  if (t.processing_status === "completed" && t.preprocessing_status === "completed") return "completed"
  if (t.processing_status === "failed" || t.preprocessing_status === "failed") return "failed"
  if (t.processing_status === "running" || t.preprocessing_status === "running") return "running"
  if (t.processing_status === "skipped" && t.preprocessing_status === "skipped") return "skipped"
  if (t.processing_status === "pending" && t.preprocessing_status === "pending") return "pending"
  return "running"
}

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener("abort", () => {
      clearTimeout(timer)
      resolve()
    })
  })

/**
 * Shared hook that manages the SSE connection for a benchmark job.
 * Uses fetch with auth headers instead of EventSource.
 * Writes all state to the zustand store so any component can read it.
 *
 * Logs: the history of each view is read first, then the stream opens after the lowest
 * `last_seq` those reads saw; lines both carry are dropped by seq. A dropped stream reopens
 * after the newest seq seen, with backoff, until the job has ended.
 */
export function useBenchmarkSSE(
  jobId: string | null,
  onStatusChange?: (status: string) => void
) {
  const abortRef = useRef<AbortController | null>(null)
  const fetchedLogsForRef = useRef<Set<string>>(new Set())
  const lastSeqRef = useRef(0)
  const statusRef = useRef("")
  const onStatusChangeRef = useRef(onStatusChange)
  onStatusChangeRef.current = onStatusChange

  const {
    setSseConnected,
    setSseStatus,
    setToolStates,
    updateToolState,
    addToolLogs,
    addJobLogs,
    setAggregateProgress,
    setExtractionProgress,
    clearSseState,
  } = useBenchmarkingStore()

  const noteStatus = useCallback(
    (status: string) => {
      statusRef.current = status
      setSseStatus(status)
      onStatusChangeRef.current?.(status)
    },
    [setSseStatus]
  )

  const noteSeq = (seq: unknown) => {
    if (typeof seq === "number" && seq > lastSeqRef.current) lastSeqRef.current = seq
  }

  /** Reads a tool's log history; returns the log's `last_seq` at the time, or null if unread. */
  const fetchToolHistory = useCallback(
    async (tool: string): Promise<number | null> => {
      if (!jobId) return null
      try {
        const url = getBenchmarkLogsUrl(jobId, tool, { limit: MAX_LOG_LINES })
        const res = await benchmarkApi.get<ToolLogsResponse>(url)
        addToolLogs(tool, (res.data?.lines ?? []).map(toLogLine))
        return res.data?.last_seq ?? null
      } catch {
        // Logs may not be available yet
        return null
      }
    },
    [jobId, addToolLogs]
  )

  const fetchJobHistory = useCallback(async (): Promise<number | null> => {
    if (!jobId) return null
    try {
      const res = await benchmarkApi.get(getBenchmarkJobLogsUrl(jobId, { limit: MAX_LOG_LINES }))
      addJobLogs((res.data?.lines ?? []).map(toLogLine))
      return res.data?.last_seq ?? null
    } catch {
      // Job logs may not be available yet
      return null
    }
  }, [jobId, addJobLogs])

  /** Reads the overview's and each tool's history; returns the lowest `last_seq` read. */
  const fetchHistory = useCallback(
    async (tools: string[]): Promise<number | undefined> => {
      const seqs = await Promise.all([fetchJobHistory(), ...tools.map(fetchToolHistory)])
      const read = seqs.filter((seq): seq is number => seq != null)
      return read.length ? Math.min(...read) : undefined
    },
    [fetchJobHistory, fetchToolHistory]
  )

  // A tool first named by a later status event gets its history read then.
  const ensureHistoricalLogs = useCallback(
    (toolNames: string[]) => {
      const newTools = toolNames.filter((name) => !fetchedLogsForRef.current.has(name))
      newTools.forEach((name) => {
        fetchedLogsForRef.current.add(name)
        fetchToolHistory(name)
      })
    },
    [fetchToolHistory]
  )

  const processToolsArray = useCallback(
    (tools: any[], jobStatus?: string) => {
      if (!tools || !Array.isArray(tools) || tools.length === 0) return
      const isCompleted = (jobStatus || "").toLowerCase() === "completed"
      const states: Record<string, ToolStatusEvent> = {}
      const names: string[] = []
      for (const t of tools) {
        names.push(t.tool_name)
        states[t.tool_name] = {
          tool: t.tool_name,
          stage: t.progress_stage || "",
          status: isCompleted ? "completed" : inferToolStatus(t),
          progress_percent: isCompleted ? 100 : (t.progress_percent ?? 0),
          message: t.progress_message || "",
          last_error: t.last_error || null,
          evaluation_r2_status: t.evaluation_r2_status || "pending",
          evaluation_auc_status: t.evaluation_auc_status || "pending",
          timestamp: new Date().toISOString(),
        }
      }
      setToolStates(states)
      ensureHistoricalLogs(names)
    },
    [setToolStates, ensureHistoricalLogs]
  )

  const handleSSEData = useCallback(
    (eventType: string, rawData: string) => {
      try {
        const data = JSON.parse(rawData)

        switch (eventType) {
          case "status": {
            const status = data.status || ""
            noteStatus(status)

            if (data.tools && Array.isArray(data.tools) && data.tools.length > 0) {
              processToolsArray(data.tools, status)
            }
            if (data.progress) {
              setAggregateProgress(data.progress)
            }

            if (status === "completed") {
              const current = useBenchmarkingStore.getState().toolStates
              const updated: Record<string, ToolStatusEvent> = {}
              for (const name of Object.keys(current)) {
                updated[name] = { ...current[name], status: "completed", progress_percent: 100 }
              }
              setToolStates(updated)
              setAggregateProgress(
                data.progress
                  ? { ...data.progress, percent: 100, message: "Completed" }
                  : { stage: "completed", percent: 100, message: "Completed", timestamp: new Date().toISOString() }
              )
            }
            break
          }

          case "tool_status": {
            const ts: ToolStatusEvent = {
              tool: data.tool,
              stage: data.stage,
              status: data.status,
              progress_percent: data.progress_percent ?? 0,
              message: data.message || "",
              last_error: data.last_error || null,
              evaluation_r2_status: data.evaluation_r2_status || "pending",
              evaluation_auc_status: data.evaluation_auc_status || "pending",
              timestamp: data.timestamp || new Date().toISOString(),
            }
            updateToolState(ts.tool, ts)
            ensureHistoricalLogs([ts.tool])
            break
          }

          case "progress": {
            if (data.progress) {
              setAggregateProgress(data.progress)
            } else if (data.stage != null) {
              setAggregateProgress({
                stage: data.stage,
                message: data.message || "",
                percent: data.percent ?? 0,
                timestamp: data.timestamp || new Date().toISOString(),
              })
            }
            break
          }

          case "log": {
            noteSeq(data.seq)
            if (data.tool) {
              addToolLogs(data.tool, [toLogLine(data)])
            }
            break
          }

          case "job_log": {
            noteSeq(data.seq)
            addJobLogs([toLogLine(data)])
            break
          }

          case "extracting": {
            if (data.status === "start") {
              setExtractionProgress({ current: 0, total: data.total_files || 0 })
            } else if (data.status === "completed") {
              setExtractionProgress({ current: data.total_files || 0, total: data.total_files || 0 })
            }
            break
          }

          default:
            break
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jobId]
  )

  /** Opens the stream with auth; one token refresh on 401. Null means signed out. */
  const openStream = useCallback(
    async (after: number | undefined, signal: AbortSignal): Promise<Response | null> => {
      if (!jobId) return null
      const tok = useBenchmarkAuthStore.getState().accessToken
      const hdrs: Record<string, string> = { Accept: "text/event-stream" }
      if (tok) hdrs.Authorization = `Bearer ${tok}`

      const res = await fetch(getBenchmarkEventsUrl(jobId, after), {
        headers: hdrs,
        signal,
      })

      if (res.status === 401) {
        // Try one token refresh and retry
        const { refreshToken, setTokens, setUser, logout } =
          useBenchmarkAuthStore.getState()
        if (!refreshToken) { logout(); return null }
        try {
          const refreshRes = await axios.post(getBenchmarkRefreshUrl(), {
            refresh_token: refreshToken,
          })
          setTokens(refreshRes.data.access_token, refreshRes.data.refresh_token)
          setUser(refreshRes.data.user)

          const retryHdrs: Record<string, string> = {
            Accept: "text/event-stream",
            Authorization: `Bearer ${refreshRes.data.access_token}`,
          }
          return fetch(getBenchmarkEventsUrl(jobId, after), {
            headers: retryHdrs,
            signal,
          })
        } catch {
          logout()
          return null
        }
      }

      return res
    },
    [jobId]
  )

  /**
   * Reads the stream until it closes. Returns "retry" when it should be reopened, "stop" when
   * it shouldn't (signed out, or the server refused the job).
   */
  const readStream = useCallback(
    async (after: number | undefined, signal: AbortSignal): Promise<"retry" | "stop"> => {
      try {
        const response = await openStream(after, signal)
        if (!response) return "stop"
        if (!response.ok) {
          console.error("[SSE] Connection failed:", response.status)
          return response.status >= 400 && response.status < 500 ? "stop" : "retry"
        }

        setSseConnected(true)
        const reader = response.body?.getReader()
        if (!reader) return "retry"

        const decoder = new TextDecoder()
        let buffer = ""
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            buffer = parseSSE(buffer, handleSSEData)
          }
        } finally {
          reader.cancel().catch(() => {})
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("[SSE] Stream error:", err)
        }
      } finally {
        setSseConnected(false)
      }
      return "retry"
    },
    [openStream, handleSSEData, setSseConnected]
  )

  const connect = useCallback(
    async (signal: AbortSignal) => {
      if (!jobId) return

      // Fetch current status first (via authenticated client)
      let tools: string[] = []
      try {
        const response = await benchmarkApi.get(getBenchmarkJobStatusUrl(jobId))
        const data = response.data
        if (data.status) noteStatus(data.status)
        if (data.tools) {
          // Their history is read below, together with the overview's.
          tools = data.tools.map((t: any) => t.tool_name)
          tools.forEach((name) => fetchedLogsForRef.current.add(name))
          processToolsArray(data.tools, data.status)
        }
        if (data.progress) {
          setAggregateProgress(data.progress)
        }
      } catch (error) {
        console.error("[SSE] Failed to fetch current job status:", error)
      }

      const historySeq = await fetchHistory(tools)
      if (signal.aborted) return
      if (historySeq != null) lastSeqRef.current = historySeq
      let after = historySeq

      for (let attempt = 0; !signal.aborted; attempt++) {
        const seqBefore = lastSeqRef.current
        if ((await readStream(after, signal)) === "stop") return
        if (signal.aborted || TERMINAL_STATUSES.has(statusRef.current)) return
        // A stream that delivered events was healthy; start the backoff over.
        if (lastSeqRef.current > seqBefore) attempt = 0
        await wait(Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** attempt), signal)
        after = lastSeqRef.current
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jobId, processToolsArray, fetchHistory, readStream]
  )

  const start = useCallback(() => {
    abortRef.current?.abort()
    fetchedLogsForRef.current.clear()
    lastSeqRef.current = 0
    statusRef.current = ""
    const controller = new AbortController()
    abortRef.current = controller
    connect(controller.signal)
    return controller
  }, [connect])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (!jobId) return

    clearSseState()
    const controller = start()

    return () => {
      controller.abort()
      setSseConnected(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, start])

  return { reconnect: start }
}
