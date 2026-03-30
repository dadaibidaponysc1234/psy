"use client"

import { useEffect, useRef, useCallback } from "react"
import axios from "axios"
import {
  getBenchmarkJobStatusUrl,
  getBenchmarkEventsUrl,
  getBenchmarkLogsUrl,
} from "@/lib/config"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"
import type {
  ToolStatusEvent,
  LogLine,
  AggregateProgress,
  ToolLogsResponse,
} from "@/types/benchmarking"

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "")
const MAX_LOG_LINES = 1500

function inferToolStatus(
  t: Record<string, any>
): ToolStatusEvent["status"] {
  if (
    t.processing_status === "completed" &&
    t.preprocessing_status === "completed"
  )
    return "completed"
  if (
    t.processing_status === "failed" ||
    t.preprocessing_status === "failed"
  )
    return "failed"
  if (
    t.processing_status === "running" ||
    t.preprocessing_status === "running"
  )
    return "running"
  if (
    t.processing_status === "skipped" &&
    t.preprocessing_status === "skipped"
  )
    return "skipped"
  if (
    t.processing_status === "pending" &&
    t.preprocessing_status === "pending"
  )
    return "pending"
  return "running"
}

/**
 * Shared hook that manages the SSE connection for a benchmark job.
 * Writes all state to the zustand store so any component can read it.
 *
 * Mount this once (e.g. in the benchmarking page layout or job-status component).
 * Multiple mounts for the same jobId are safe — only the first connects.
 */
export function useBenchmarkSSE(
  jobId: string | null,
  onStatusChange?: (status: string) => void
) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const fetchedLogsForRef = useRef<Set<string>>(new Set())

  const {
    setSseConnected,
    setSseStatus,
    setToolStates,
    updateToolState,
    appendToolLogs,
    setToolLogs,
    setAggregateProgress,
    setExtractionProgress,
    clearSseState,
  } = useBenchmarkingStore()

  // Fetch historical logs for a list of tools
  const fetchHistoricalLogs = useCallback(
    async (tools: string[]) => {
      if (!jobId) return
      for (const tool of tools) {
        try {
          const url = getBenchmarkLogsUrl(jobId, tool, {
            limit: MAX_LOG_LINES,
          })
          console.log(
            `[SSE] Fetching historical logs for ${tool}:`,
            url
          )
          const res = await axios.get<ToolLogsResponse>(url)
          console.log(
            `[SSE] Historical logs for ${tool}:`,
            JSON.stringify({
              total_lines: res.data?.total_lines,
              returned: res.data?.lines?.length ?? 0,
            })
          )
          if (res.data?.lines?.length) {
            const lines: LogLine[] = res.data.lines.map((l) => ({
              level: l.level,
              line: stripAnsi(l.line),
              timestamp: l.timestamp,
              source: l.source,
            }))
            setToolLogs(tool, lines)
          }
        } catch (err: any) {
          console.error(
            `[SSE] Failed to fetch logs for ${tool}:`,
            JSON.stringify({
              status: err?.response?.status,
              message: err?.message,
            })
          )
        }
      }
    },
    [jobId, setToolLogs]
  )

  // Fetch historical logs when new tools appear
  const ensureHistoricalLogs = useCallback(
    (toolNames: string[]) => {
      const newTools = toolNames.filter(
        (name) => !fetchedLogsForRef.current.has(name)
      )
      if (newTools.length === 0) return
      newTools.forEach((name) => fetchedLogsForRef.current.add(name))
      fetchHistoricalLogs(newTools)
    },
    [fetchHistoricalLogs]
  )

  // Process tools array from status response/event
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

  const connect = useCallback(() => {
    if (!jobId) return null

    // Fetch current status first
    const fetchCurrentStatus = async () => {
      try {
        const response = await axios.get(getBenchmarkJobStatusUrl(jobId))
        const data = response.data
        if (data.status) {
          setSseStatus(data.status)
          onStatusChange?.(data.status)
        }
        console.log(
          "[SSE] Status tools array:",
          JSON.stringify({
            hasTools: !!data.tools,
            isArray: Array.isArray(data.tools),
            length: data.tools?.length ?? 0,
            toolNames: data.tools?.map((t: any) => t.tool_name) ?? [],
          })
        )
        if (data.tools) {
          processToolsArray(data.tools, data.status)
        }
        if (data.progress) {
          setAggregateProgress(data.progress)
        }
      } catch (error) {
        console.error("[SSE] Failed to fetch current job status:", error)
      }
    }

    fetchCurrentStatus()

    const es = new EventSource(getBenchmarkEventsUrl(jobId))

    es.onopen = () => {
      setSseConnected(true)
    }

    const handleSSEEvent = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        const eventType =
          (event.type !== "message" ? event.type : null) ||
          data.type ||
          "message"

        console.log("[SSE] event:", eventType, JSON.stringify(data))

        switch (eventType) {
          case "status": {
            const status = data.status || ""
            setSseStatus(status)
            onStatusChange?.(status)

            if (data.tools && Array.isArray(data.tools) && data.tools.length > 0) {
              processToolsArray(data.tools, status)
            }

            if (data.progress) {
              setAggregateProgress(data.progress)
            }

            // On completion, set all tool progress to 100%
            if (status === "completed") {
              const current = useBenchmarkingStore.getState().toolStates
              const updated: Record<string, ToolStatusEvent> = {}
              for (const name of Object.keys(current)) {
                updated[name] = {
                  ...current[name],
                  status: "completed",
                  progress_percent: 100,
                }
              }
              setToolStates(updated)
              setAggregateProgress(
                data.progress
                  ? { ...data.progress, percent: 100, message: "Completed" }
                  : {
                      stage: "completed",
                      percent: 100,
                      message: "Completed",
                      timestamp: new Date().toISOString(),
                    }
              )
            }

            if (status === "completed" || status === "failed") {
              // Fetch final historical logs for all tools
              const toolNames = Object.keys(
                useBenchmarkingStore.getState().toolStates
              )
              fetchedLogsForRef.current.clear()
              ensureHistoricalLogs(toolNames)
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

          case "extracting": {
            if (data.status === "start") {
              setExtractionProgress({
                current: 0,
                total: data.total_files || 0,
              })
            } else if (data.status === "completed") {
              setExtractionProgress({
                current: data.total_files || 0,
                total: data.total_files || 0,
              })
            }
            break
          }

          default:
            break
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error)
      }
    }

    es.onmessage = handleSSEEvent

    const namedEvents = [
      "status",
      "tool_status",
      "progress",
      "log",
      "extracting",
      "connected",
      "keepalive",
      "info",
      "error",
    ]
    for (const name of namedEvents) {
      es.addEventListener(name, handleSSEEvent as EventListener)
    }

    es.onerror = () => {
      setSseConnected(false)
    }

    return es
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (!jobId) return

    clearSseState()
    fetchedLogsForRef.current.clear()

    const es = connect()
    if (es) eventSourceRef.current = es

    return () => {
      es?.close()
      setSseConnected(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, connect])

  // Return reconnect function for manual refresh
  const reconnect = useCallback(() => {
    eventSourceRef.current?.close()
    fetchedLogsForRef.current.clear()
    const es = connect()
    if (es) eventSourceRef.current = es
  }, [connect])

  return { reconnect }
}
