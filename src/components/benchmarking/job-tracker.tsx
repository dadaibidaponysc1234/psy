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
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  SkipForward,
  Package,
  Settings,
  Cpu,
  BarChart3,
  AlertTriangle,
} from "lucide-react"
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
          const url = getBenchmarkLogsUrl(jobId, tool, { limit: MAX_LOG_LINES_PER_TOOL })
          console.log(`[JobTracker] Fetching historical logs for ${tool}:`, url)
          const res = await axios.get<ToolLogsResponse>(url)
          console.log(`[JobTracker] Historical logs for ${tool}:`, JSON.stringify({
            total_lines: res.data?.total_lines,
            returned: res.data?.lines?.length ?? 0,
            status: res.status,
          }))
          if (res.data?.lines?.length) {
            const lines: LogLine[] = res.data.lines.map((l) => ({
              level: l.level,
              line: stripAnsi(l.line),
              timestamp: l.timestamp,
              source: l.source,
            }))
            setToolLogs((prev) => ({ ...prev, [tool]: lines }))
          }
        } catch (err: any) {
          console.error(`[JobTracker] Failed to fetch logs for ${tool}:`, JSON.stringify({
            status: err?.response?.status,
            data: err?.response?.data,
            message: err?.message,
            url: err?.config?.url,
          }))
        }
      }
    },
    [jobId]
  )

  // Fetch historical logs whenever new tools appear in toolStates
  const fetchedLogsForRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const newTools = toolNames.filter((name) => !fetchedLogsForRef.current.has(name))
    if (newTools.length === 0) return
    newTools.forEach((name) => fetchedLogsForRef.current.add(name))
    fetchHistoricalLogs(newTools)
  }, [toolNames, fetchHistoricalLogs])

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
        console.log("[JobTracker] Status tools array:", JSON.stringify({
          hasTools: !!data.tools,
          isArray: Array.isArray(data.tools),
          length: data.tools?.length ?? 0,
          toolNames: data.tools?.map((t: any) => t.tool_name) ?? [],
        }))
        // Initialize tool states from status.tools[] if present
        if (data.tools && Array.isArray(data.tools)) {
          const isCompleted = (data.status || "").toLowerCase() === "completed"
          const states: Record<string, ToolStatusEvent> = {}
          for (const t of data.tools) {
            states[t.tool_name] = {
              tool: t.tool_name,
              stage: t.progress_stage || "",
              status: isCompleted ? "completed" : inferToolStatus(t),
              progress_percent: isCompleted ? 100 : (t.progress_percent ?? 0),
              message: t.progress_message || "",
              last_error: t.last_error || null,
              timestamp: new Date().toISOString(),
            }
          }
          setToolStates(states)
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

    // Unified handler for all SSE events (named and unnamed)
    const handleSSEEvent = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        // Named events use event.type; unnamed events fall back to data.type
        const eventType = (event.type !== "message" ? event.type : null) || data.type || "message"

        console.log("[JobTracker] SSE event:", eventType, JSON.stringify(data))

        switch (eventType) {
          case "status": {
            const status = data.status || ""
            setCurrentStatus(status)
            localStorage.setItem("benchmark_job_status", status)
            onStatusChange?.(status)

            // Update tool states from tools[] array
            if (data.tools && Array.isArray(data.tools) && data.tools.length > 0) {
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

            // On completion, set all tool progress to 100%
            if (status === "completed") {
              setToolStates((prev) => {
                const next = { ...prev }
                for (const name of Object.keys(next)) {
                  next[name] = {
                    ...next[name],
                    status: "completed",
                    progress_percent: 100,
                  }
                }
                return next
              })
              setAggregateProgress((prev) =>
                prev
                  ? { ...prev, percent: 100, message: "Completed" }
                  : { stage: "completed", percent: 100, message: "Completed", timestamp: new Date().toISOString() }
              )
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

    // Listen for unnamed events (fallback)
    es.onmessage = handleSSEEvent

    // Listen for all named event types the backend may send
    const namedEvents = ["status", "tool_status", "progress", "log", "extracting", "connected", "keepalive", "info", "error"]
    for (const name of namedEvents) {
      es.addEventListener(name, handleSSEEvent as EventListener)
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
              <span className="text-xs text-muted-foreground">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                disabled={isCanceling}
              >
                {isCanceling ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Canceling...
                  </>
                ) : (
                  "Cancel Job"
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={onClear}>
                Clear Job
              </Button>
              <Button
                variant="ghost"
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
              {getStatusIcon(currentStatus)}
              <span className={`font-medium ${getStatusColor(currentStatus)}`}>
                {formatStatusLabel(currentStatus)}
              </span>
            </div>
          )}

          {/* Extraction progress */}
          {extractionProgress && extractionProgress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Extracting files...</span>
                <span className="text-muted-foreground">
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
              <Progress value={aggregateProgress.percent} className="h-2" />
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
                      <span className="mr-1">{getToolStatusIcon(ts.status)}</span>
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
                    {ts.stage && (
                      <span className="hidden truncate text-xs text-muted-foreground sm:block sm:max-w-[200px]">
                        {ts.stage}
                        {ts.message ? ` — ${ts.message}` : ""}
                      </span>
                    )}
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
                  variant={autoScroll ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setAutoScroll(!autoScroll)}
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
                      <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px]">
                        {toolLogs[name]?.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              {toolNames.map((name) => (
                <TabsContent key={name} value={name}>
                  <div
                    className="h-80 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs"
                    onScroll={(e) => {
                      const el = e.currentTarget
                      const atBottom =
                        el.scrollHeight - el.scrollTop - el.clientHeight < 40
                      if (autoScroll && !atBottom) setAutoScroll(false)
                      if (!autoScroll && atBottom) setAutoScroll(true)
                    }}
                  >
                    {filteredLogs.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        {toolLogs[name]?.length
                          ? `No logs at level "${logLevelFilter}" or above`
                          : "Waiting for log output..."}
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap break-words">
                        {filteredLogs.map((l, i) => (
                          <div key={i} className={getLogLineClass(l.level)}>
                            {l.timestamp && (
                              <span className="text-muted-foreground">
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

function formatStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function getStatusIcon(status: string) {
  const cls = "h-5 w-5"
  switch (status.toLowerCase()) {
    case "uploaded":
      return <CheckCircle className={`${cls} text-blue-600`} />
    case "extracting":
      return <Package className={`${cls} text-amber-600`} />
    case "configured":
      return <Settings className={`${cls} text-yellow-600`} />
    case "preprocessing":
      return <Cpu className={`${cls} text-indigo-600`} />
    case "processing":
      return <Loader2 className={`${cls} animate-spin text-primary`} />
    case "evaluating":
      return <BarChart3 className={`${cls} text-cyan-600`} />
    case "completed":
      return <CheckCircle className={`${cls} text-green-600`} />
    case "failed":
      return <XCircle className={`${cls} text-red-600`} />
    case "cancelled":
      return <XCircle className={`${cls} text-muted-foreground`} />
    default:
      return <Clock className={`${cls} text-muted-foreground`} />
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
      return "text-primary"
    case "evaluating":
      return "text-cyan-600"
    case "completed":
      return "text-green-600"
    case "failed":
      return "text-red-600"
    case "cancelled":
      return "text-muted-foreground"
    default:
      return "text-muted-foreground"
  }
}

function getToolStatusIcon(status: string) {
  const cls = "inline h-3 w-3"
  switch (status) {
    case "completed":
      return <CheckCircle className={cls} />
    case "running":
      return <Loader2 className={`${cls} animate-spin`} />
    case "failed":
      return <XCircle className={cls} />
    case "skipped":
      return <SkipForward className={cls} />
    default:
      return <Clock className={cls} />
  }
}

function getToolBadgeClass(status: string) {
  switch (status) {
    case "completed":
      return "border-green-300 bg-green-50 text-green-700"
    case "running":
      return "border-primary/30 bg-primary/5 text-primary"
    case "failed":
      return "border-red-300 bg-red-50 text-red-700"
    case "skipped":
      return "border-muted bg-muted text-muted-foreground"
    default:
      return "border-border bg-muted/50 text-muted-foreground"
  }
}

function getLogLineClass(level: LogLevel) {
  switch (level) {
    case "error":
      return "text-red-600"
    case "warning":
      return "text-amber-600"
    default:
      return ""
  }
}

function getLogLevelClass(level: LogLevel) {
  switch (level) {
    case "error":
      return "font-semibold text-red-600"
    case "warning":
      return "text-amber-600"
    case "debug":
      return "text-muted-foreground"
    default:
      return "text-primary"
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
