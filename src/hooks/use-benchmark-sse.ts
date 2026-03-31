"use client"

import { useEffect, useRef, useCallback } from "react"
import axios from "axios"
import { getBenchmarkJobStatusUrl, getBenchmarkEventsUrl, getBenchmarkLogsUrl, getBenchmarkJobLogsUrl, getBenchmarkRefreshUrl } from "@/lib/config"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"
import { useBenchmarkAuthStore } from "@/stores/benchmark-auth-store"
import benchmarkApi from "@/lib/benchmark-api"
import type { ToolStatusEvent, LogLine, ToolLogsResponse } from "@/types/benchmarking"

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "")
const MAX_LOG_LINES = 1500

function inferToolStatus(t: Record<string, any>): ToolStatusEvent["status"] {
  if (t.processing_status === "completed" && t.preprocessing_status === "completed") return "completed"
  if (t.processing_status === "failed" || t.preprocessing_status === "failed") return "failed"
  if (t.processing_status === "running" || t.preprocessing_status === "running") return "running"
  if (t.processing_status === "skipped" && t.preprocessing_status === "skipped") return "skipped"
  if (t.processing_status === "pending" && t.preprocessing_status === "pending") return "pending"
  return "running"
}

/**
 * Parse a raw SSE text stream into individual events.
 * Handles "event:", "data:", and blank-line delimiters.
 */
function parseSSELine(
  buffer: string,
  onEvent: (eventType: string, data: string) => void
): string {
  const lines = buffer.split(/\r?\n/)
  let currentEvent = "message"
  let currentData = ""
  let remaining = ""

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // If this is the last line and buffer doesn't end with a newline, it's incomplete
    if (i === lines.length - 1 && !/\r?\n$/.test(buffer)) {
      remaining = line
      break
    }

    // SSE comments (keep-alive) — ignore
    if (line.startsWith(":")) continue

    if (line.startsWith("event:")) {
      currentEvent = line.slice(6).trim()
    } else if (line.startsWith("data:")) {
      currentData += (currentData ? "\n" : "") + line.slice(5).trim()
    } else if (line === "" && currentData) {
      onEvent(currentEvent, currentData)
      currentEvent = "message"
      currentData = ""
    }
  }

  return remaining
}

/**
 * Shared hook that manages the SSE connection for a benchmark job.
 * Uses fetch with auth headers instead of EventSource.
 * Writes all state to the zustand store so any component can read it.
 */
export function useBenchmarkSSE(
  jobId: string | null,
  onStatusChange?: (status: string) => void
) {
  const abortRef = useRef<AbortController | null>(null)
  const fetchedLogsForRef = useRef<Set<string>>(new Set())
  const fetchedJobLogsRef = useRef(false)
  const onStatusChangeRef = useRef(onStatusChange)
  onStatusChangeRef.current = onStatusChange

  const {
    setSseConnected,
    setSseStatus,
    setToolStates,
    updateToolState,
    appendToolLogs,
    setToolLogs,
    appendJobLogs,
    setJobLogs,
    setAggregateProgress,
    setExtractionProgress,
    clearSseState,
  } = useBenchmarkingStore()

  const fetchHistoricalLogs = useCallback(
    async (tools: string[]) => {
      if (!jobId) return
      for (const tool of tools) {
        try {
          const url = getBenchmarkLogsUrl(jobId, tool, { limit: MAX_LOG_LINES })
          const res = await benchmarkApi.get<ToolLogsResponse>(url)
          if (res.data?.lines?.length) {
            const lines: LogLine[] = res.data.lines.map((l) => ({
              level: l.level,
              line: stripAnsi(l.line),
              timestamp: l.timestamp,
              source: l.source,
            }))
            setToolLogs(tool, lines)
          }
        } catch {
          // Logs may not be available yet
        }
      }
    },
    [jobId, setToolLogs]
  )

  const fetchHistoricalJobLogs = useCallback(
    async () => {
      if (!jobId || fetchedJobLogsRef.current) return
      fetchedJobLogsRef.current = true
      try {
        const url = getBenchmarkJobLogsUrl(jobId, { limit: MAX_LOG_LINES })
        const res = await benchmarkApi.get(url)
        const lines: any[] = res.data?.lines ?? []
        if (lines.length) {
          setJobLogs(
            lines.map((l: any) => ({
              level: l.level || "info",
              line: stripAnsi(l.line || ""),
              timestamp: l.timestamp || null,
            }))
          )
        }
      } catch {
        // Job logs may not be available yet
      }
    },
    [jobId, setJobLogs]
  )

  const ensureHistoricalLogs = useCallback(
    (toolNames: string[]) => {
      const newTools = toolNames.filter((name) => !fetchedLogsForRef.current.has(name))
      if (newTools.length === 0) return
      newTools.forEach((name) => fetchedLogsForRef.current.add(name))
      fetchHistoricalLogs(newTools)
    },
    [fetchHistoricalLogs]
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
            setSseStatus(status)
            onStatusChangeRef.current?.(status)

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

            if (status === "completed" || status === "failed") {
              const toolNames = Object.keys(useBenchmarkingStore.getState().toolStates)
              fetchedLogsForRef.current.clear()
              fetchedJobLogsRef.current = false
              ensureHistoricalLogs(toolNames)
              fetchHistoricalJobLogs()
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
            const line: LogLine = {
              level: data.level || "info",
              line: stripAnsi(data.line || ""),
              timestamp: data.timestamp || null,
            }
            if (data.tool) {
              appendToolLogs(data.tool, [line])
            }
            break
          }

          case "job_log": {
            const jobLine: LogLine = {
              level: "info",
              line: stripAnsi(data.message || ""),
              timestamp: data.timestamp || null,
            }
            appendJobLogs([jobLine])
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

  const connect = useCallback(
    async (signal: AbortSignal) => {
      if (!jobId) return

      // Fetch current status first (via authenticated client)
      try {
        const response = await benchmarkApi.get(getBenchmarkJobStatusUrl(jobId))
        const data = response.data
        if (data.status) {
          setSseStatus(data.status)
          onStatusChangeRef.current?.(data.status)
        }
        if (data.tools) {
          processToolsArray(data.tools, data.status)
        }
        if (data.progress) {
          setAggregateProgress(data.progress)
        }
        // Fetch historical job logs on connect (covers reconnect & completed jobs)
        fetchHistoricalJobLogs()
      } catch (error) {
        console.error("[SSE] Failed to fetch current job status:", error)
      }

      // Open SSE stream with auth header via fetch
      const openStream = async (): Promise<Response | null> => {
        const tok = useBenchmarkAuthStore.getState().accessToken
        const hdrs: Record<string, string> = { Accept: "text/event-stream" }
        if (tok) hdrs.Authorization = `Bearer ${tok}`

        const res = await fetch(getBenchmarkEventsUrl(jobId), {
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
            return fetch(getBenchmarkEventsUrl(jobId), {
              headers: retryHdrs,
              signal,
            })
          } catch {
            logout()
            return null
          }
        }

        return res
      }

      try {
        const response = await openStream()

        if (!response || !response.ok) {
          console.error("[SSE] Connection failed:", response?.status)
          setSseConnected(false)
          return
        }

        setSseConnected(true)

        const reader = response.body?.getReader()
        if (!reader) return

        const decoder = new TextDecoder()
        let buffer = ""

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            buffer = parseSSELine(buffer, handleSSEData)
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jobId, handleSSEData, processToolsArray]
  )

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (!jobId) return

    clearSseState()
    fetchedLogsForRef.current.clear()
    fetchedJobLogsRef.current = false

    const controller = new AbortController()
    abortRef.current = controller
    connect(controller.signal)

    return () => {
      controller.abort()
      setSseConnected(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, connect])

  const reconnect = useCallback(() => {
    abortRef.current?.abort()
    fetchedLogsForRef.current.clear()
    fetchedJobLogsRef.current = false
    const controller = new AbortController()
    abortRef.current = controller
    connect(controller.signal)
  }, [connect])

  return { reconnect }
}
