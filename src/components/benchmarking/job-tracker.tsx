"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"
import {
  getBenchmarkJobStatusUrl,
  getBenchmarkEventsUrl,
  getBenchmarkLogsUrl,
} from "@/lib/config"
import axios from "axios"
import { toast } from "react-hot-toast"
import { RefreshCw } from "lucide-react"
import type {
  ToolStatusEvent,
  LogLine,
  LogLevel,
  AggregateProgress,
  ToolLogsResponse,
} from "@/types/benchmarking"

// Strip ANSI escape codes from log lines
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "")

const MAX_LOG_LINES_PER_TOOL = 1500

interface JobTrackerProps {
  jobId: string
  onClear: () => void
  onReset?: () => void
  onStatusChange?: (status: string) => void
}

export function JobTracker({
  jobId,
  onClear,
  onReset,
  onStatusChange,
}: JobTrackerProps) {
  // Connection & job state
  const [isConnected, setIsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [currentStatus, setCurrentStatus] = useState("")
  const [isCanceling, setIsCanceling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  // Per-tool state
  const [toolStates, setToolStates] = useState<Record<string, ToolStatusEvent>>({})
  const [toolLogs, setToolLogs] = useState<Record<string, LogLine[]>>({})

  // Aggregate progress
  const [aggregateProgress, setAggregateProgress] = useState<AggregateProgress | null>(null)

  // Log panel UI state
  const [activeLogTab, setActiveLogTab] = useState<string>("")
  const [logLevelFilter, setLogLevelFilter] = useState<string>("info")
  const [autoScroll, setAutoScroll] = useState(true)

  // Extraction progress (for zip files)
  const [extractionProgress, setExtractionProgress] = useState<{
    current: number
    total: number
  } | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  // Tool names derived from toolStates
  const toolNames = useMemo(() => Object.keys(toolStates).sort(), [toolStates])

  // Set first tool as active log tab when tools appear
  useEffect(() => {
    if (!activeLogTab && toolNames.length > 0) {
      setActiveLogTab(toolNames[0])
    }
  }, [toolNames, activeLogTab])

  // Auto-scroll log panel
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [toolLogs, activeLogTab, autoScroll])

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const appendLogLines = useCallback(
    (tool: string, lines: LogLine[]) => {
      setToolLogs((prev) => {
        const existing = prev[tool] || []
        const combined = [...existing, ...lines]
        return {
          ...prev,
          [tool]: combined.length > MAX_LOG_LINES_PER_TOOL
            ? combined.slice(-MAX_LOG_LINES_PER_TOOL)
            : combined,
        }
      })
    },
    []
  )

  // ---------------------------------------------------------------------------
  // Fetch historical logs for all tools (on mount / reconnect)
  // ---------------------------------------------------------------------------

  const fetchHistoricalLogs = useCallback(
    async (tools: string[]) => {
      for (const tool of tools) {
        try {
          const res = await axios.get<ToolLogsResponse>(
            getBenchmarkLogsUrl(jobId, tool, { limit: MAX_LOG_LINES_PER_TOOL })
          )
          if (res.data?.lines?.length) {
            const lines: LogLine[] = res.data.lines.map((l) => ({
              level: l.level,
              line: stripAnsi(l.line),
              timestamp: l.timestamp,
              source: l.source,
            }))
            setToolLogs((prev) => ({ ...prev, [tool]: lines }))
          }
        } catch {
          // Logs may not be available yet — that's OK
        }
      }
    },
    [jobId]
  )

  // ---------------------------------------------------------------------------
  // SSE connection
  // ---------------------------------------------------------------------------

  const connectToSSE = useCallback(() => {
    if (!jobId) return null

    // Fetch current status first
    const fetchCurrentStatus = async () => {
      try {
        const response = await axios.get(getBenchmarkJobStatusUrl(jobId))
        const data = response.data
        if (data.status) {
          setCurrentStatus(data.status)
          localStorage.setItem("benchmark_job_status", data.status)
          onStatusChange?.(data.status)
        }
        // Initialize tool states from status.tools[] if present
        if (data.tools && Array.isArray(data.tools)) {
          const states: Record<string, ToolStatusEvent> = {}
          for (const t of data.tools) {
            states[t.tool_name] = {
              tool: t.tool_name,
              stage: t.progress_stage || "",
              status: inferToolStatus(t),
              progress_percent: t.progress_percent ?? 0,
              message: t.progress_message || "",
              last_error: t.last_error || null,
              timestamp: new Date().toISOString(),
            }
          }
          setToolStates(states)
          // Fetch historical logs for these tools
          fetchHistoricalLogs(Object.keys(states))
        }
        if (data.progress) {
          setAggregateProgress(data.progress)
        }
      } catch (error) {
        console.error("Failed to fetch current job status:", error)
      }
    }

    fetchCurrentStatus()

    const es = new EventSource(getBenchmarkEventsUrl(jobId))

    es.onopen = () => {
      setIsConnected(true)
      setIsReconnecting(false)
    }

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const eventType = data.type || event.type || "message"

        switch (eventType) {
          case "status": {
            const status = data.status || ""
            setCurrentStatus(status)
            localStorage.setItem("benchmark_job_status", status)
            onStatusChange?.(status)

            // Update tool states from tools[] array
            if (data.tools && Array.isArray(data.tools)) {
              setToolStates((prev) => {
                const next = { ...prev }
                for (const t of data.tools) {
                  next[t.tool_name] = {
                    tool: t.tool_name,
                    stage: t.progress_stage || prev[t.tool_name]?.stage || "",
                    status: inferToolStatus(t),
                    progress_percent: t.progress_percent ?? 0,
                    message: t.progress_message || "",
                    last_error: t.last_error || null,
                    timestamp: new Date().toISOString(),
                  }
                }
                return next
              })
            }

            // Update aggregate progress
            if (data.progress) {
              setAggregateProgress(data.progress)
            }

            // Notify on terminal states
            if (status === "completed" || status === "failed") {
              setTimeout(() => {
                toast.success(
                  `Job ${status}! You can now proceed to the next step.`
                )
              }, 1000)
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
              timestamp: data.timestamp || new Date().toISOString(),
            }
            setToolStates((prev) => ({ ...prev, [ts.tool]: ts }))
            break
          }

          case "progress": {
            if (data.progress) {
              setAggregateProgress(data.progress)
            } else if (data.stage != null) {
              // Top-level progress fields
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
              appendLogLines(data.tool, [line])
            }
            break
          }

          case "extracting": {
            if (data.status === "start") {
              setExtractionProgress({ current: 0, total: data.total_files || 0 })
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

    es.onerror = () => {
      setIsConnected(false)
    }

    return es
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, appendLogLines, fetchHistoricalLogs])

  // Connect on mount
  useEffect(() => {
    if (!jobId) return

    const es = connectToSSE()
    if (es) eventSourceRef.current = es

    return () => {
      es?.close()
      setIsConnected(false)
    }
  }, [jobId, connectToSSE])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const cancelJob = async () => {
    setIsCanceling(true)
    try {
      await axios.delete(getBenchmarkJobStatusUrl(jobId))
      toast.success("Job cancelled successfully")
      onReset?.()
      onClear()
    } catch {
      toast.error("Failed to cancel job")
    } finally {
      setIsCanceling(false)
    }
  }

  const handleRefreshConnection = () => {
    setIsReconnecting(true)
    eventSourceRef.current?.close()
    setTimeout(() => {
      const es = connectToSSE()
      if (es) eventSourceRef.current = es
    }, 500)
  }

  // ---------------------------------------------------------------------------
  // Rendering helpers
  // ---------------------------------------------------------------------------

  const filteredLogs = useMemo(() => {
    const lines = toolLogs[activeLogTab] || []
    const levels: LogLevel[] = ["debug", "info", "warning", "error"]
    const minIdx = levels.indexOf(logLevelFilter as LogLevel)
    if (minIdx <= 0) return lines
    return lines.filter((l) => levels.indexOf(l.level) >= minIdx)
  }, [toolLogs, activeLogTab, logLevelFilter])

  return (
    <div className="space-y-4">
      {/* Header card: overall status + aggregate progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Job Status</CardTitle>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
              />
              <span className="text-sm text-muted-foreground">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                disabled={isCanceling}
              >
                {isCanceling ? "Canceling..." : "Cancel Job"}
              </Button>
              <Button variant="outline" size="sm" onClick={onClear}>
                Clear Job
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshConnection}
                disabled={isReconnecting}
                title={isReconnecting ? "Reconnecting..." : "Refresh Connection"}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isReconnecting ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          {/* Status badge */}
          {currentStatus && (
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getStatusIcon(currentStatus)}</span>
              <span className={`font-medium ${getStatusColor(currentStatus)}`}>
                {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
              </span>
            </div>
          )}

          {/* Extraction progress */}
          {extractionProgress && extractionProgress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Extracting files...</span>
                <span>
                  {extractionProgress.current}/{extractionProgress.total}
                </span>
              </div>
              <Progress
                value={
                  (extractionProgress.current / extractionProgress.total) * 100
                }
                className="h-2"
              />
            </div>
          )}

          {/* Aggregate progress */}
          {aggregateProgress && aggregateProgress.percent > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {aggregateProgress.message || `Stage: ${aggregateProgress.stage}`}
                </span>
                <span className="font-medium">
                  {Math.round(aggregateProgress.percent)}%
                </span>
              </div>
              <Progress value={aggregateProgress.percent} className="h-3" />
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Per-tool status rows */}
      {toolNames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tool Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {toolNames.map((name) => {
                const ts = toolStates[name]
                if (!ts) return null
                return (
                  <div
                    key={name}
                    className="flex items-center gap-4 rounded-lg border p-3"
                  >
                    <div className="w-24 shrink-0 truncate text-sm font-medium">
                      {name}
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-xs ${getToolBadgeClass(ts.status)}`}
                    >
                      {ts.status}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <Progress
                        value={ts.progress_percent}
                        className="h-2"
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                      {Math.round(ts.progress_percent)}%
                    </span>
                    <span className="hidden truncate text-xs text-muted-foreground sm:block sm:max-w-[200px]">
                      {ts.stage ? `${ts.stage}` : ""}
                      {ts.message ? ` — ${ts.message}` : ""}
                    </span>
                    {ts.last_error && (
                      <span
                        className="max-w-[200px] truncate text-xs text-red-600"
                        title={ts.last_error}
                      >
                        {ts.last_error}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log stream panel */}
      {toolNames.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Logs</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={logLevelFilter} onValueChange={setLogLevelFilter}>
                  <SelectTrigger className="h-8 w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={autoScroll ? "bg-primary/10" : ""}
                >
                  {autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeLogTab} onValueChange={setActiveLogTab}>
              <TabsList className="mb-2">
                {toolNames.map((name) => (
                  <TabsTrigger key={name} value={name} className="text-xs">
                    {name}
                    {(toolLogs[name]?.length ?? 0) > 0 && (
                      <span className="ml-1 text-muted-foreground">
                        ({toolLogs[name]?.length})
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              {toolNames.map((name) => (
                <TabsContent key={name} value={name}>
                  <div
                    className="h-80 overflow-auto rounded-md bg-zinc-950 p-3 font-mono text-xs text-zinc-200"
                    onScroll={(e) => {
                      const el = e.currentTarget
                      const atBottom =
                        el.scrollHeight - el.scrollTop - el.clientHeight < 40
                      if (autoScroll && !atBottom) setAutoScroll(false)
                      if (!autoScroll && atBottom) setAutoScroll(true)
                    }}
                  >
                    {filteredLogs.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-zinc-500">
                        {toolLogs[name]?.length
                          ? `No logs at level "${logLevelFilter}" or above`
                          : "Waiting for log output..."}
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap break-words">
                        {filteredLogs.map((l, i) => (
                          <div key={i} className={getLogLineClass(l.level)}>
                            {l.timestamp && (
                              <span className="text-zinc-500">
                                {formatLogTimestamp(l.timestamp)}{" "}
                              </span>
                            )}
                            <span className={getLogLevelClass(l.level)}>
                              {l.level.toUpperCase().padEnd(7)}{" "}
                            </span>
                            {l.line}
                          </div>
                        ))}
                      </pre>
                    )}
                    <div ref={activeLogTab === name ? logEndRef : undefined} />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={cancelJob}
        title="Cancel Job"
        description="Are you sure you want to cancel this job? This action cannot be undone and will reset the entire benchmarking workflow."
        confirmText="Cancel Job"
        cancelText="Keep Job"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function inferToolStatus(
  t: Record<string, any>
): ToolStatusEvent["status"] {
  if (t.processing_status === "completed" && t.preprocessing_status === "completed")
    return "completed"
  if (t.processing_status === "failed" || t.preprocessing_status === "failed")
    return "failed"
  if (t.processing_status === "running" || t.preprocessing_status === "running")
    return "running"
  if (t.processing_status === "skipped" && t.preprocessing_status === "skipped")
    return "skipped"
  return "pending"
}

function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case "uploaded":
      return "📤"
    case "extracting":
      return "📦"
    case "configured":
      return "⚙️"
    case "preprocessing":
      return "🔧"
    case "processing":
      return "🔄"
    case "evaluating":
      return "📊"
    case "completed":
      return "✅"
    case "failed":
      return "❌"
    case "cancelled":
      return "🚫"
    default:
      return "📋"
  }
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "uploaded":
      return "text-blue-600"
    case "extracting":
      return "text-amber-600"
    case "configured":
      return "text-yellow-600"
    case "preprocessing":
      return "text-indigo-600"
    case "processing":
      return "text-purple-600"
    case "evaluating":
      return "text-cyan-600"
    case "completed":
      return "text-green-600"
    case "failed":
      return "text-red-600"
    case "cancelled":
      return "text-gray-600"
    default:
      return "text-gray-600"
  }
}

function getToolBadgeClass(status: string) {
  switch (status) {
    case "completed":
      return "border-green-300 bg-green-50 text-green-700"
    case "running":
      return "border-blue-300 bg-blue-50 text-blue-700"
    case "failed":
      return "border-red-300 bg-red-50 text-red-700"
    case "skipped":
      return "border-gray-300 bg-gray-50 text-gray-600"
    default:
      return "border-gray-200 bg-gray-50 text-gray-500"
  }
}

function getLogLineClass(level: LogLevel) {
  switch (level) {
    case "error":
      return "text-red-400"
    case "warning":
      return "text-yellow-400"
    default:
      return ""
  }
}

function getLogLevelClass(level: LogLevel) {
  switch (level) {
    case "error":
      return "text-red-500 font-semibold"
    case "warning":
      return "text-yellow-500"
    case "debug":
      return "text-zinc-500"
    default:
      return "text-blue-400"
  }
}

function formatLogTimestamp(ts: string) {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString()
  } catch {
    return ts
  }
}
