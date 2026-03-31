"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
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
import { getBenchmarkJobStatusUrl } from "@/lib/config"
import benchmarkApi from "@/lib/benchmark-api"
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
} from "lucide-react"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"
import type { LogLevel } from "@/types/benchmarking"

interface JobTrackerProps {
  jobId: string
  onClear: () => void
  onReset?: () => void
  reconnectSSE?: () => void
}

export function JobTracker({
  jobId,
  onClear,
  onReset,
  reconnectSSE,
}: JobTrackerProps) {
  // Local UI state only
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [activeLogTab, setActiveLogTab] = useState<string>("")
  const [logLevelFilter, setLogLevelFilter] = useState<string>("info")
  const [autoScroll, setAutoScroll] = useState(true)
  const logEndRef = useRef<HTMLDivElement>(null)

  // SSE-driven state from zustand
  const isConnected = useBenchmarkingStore((s) => s.sseConnected)
  const currentStatus = useBenchmarkingStore((s) => s.sseStatus)
  const toolStates = useBenchmarkingStore((s) => s.toolStates)
  const toolLogs = useBenchmarkingStore((s) => s.toolLogs)
  const jobLogs = useBenchmarkingStore((s) => s.jobLogs)
  const aggregateProgress = useBenchmarkingStore((s) => s.aggregateProgress)
  const extractionProgress = useBenchmarkingStore((s) => s.extractionProgress)

  // Tool names derived from toolStates
  const toolNames = useMemo(
    () => Object.keys(toolStates).sort(),
    [toolStates]
  )

  // Set "Job" as default active log tab
  useEffect(() => {
    if (!activeLogTab) {
      setActiveLogTab("__job__")
    }
  }, [toolNames, activeLogTab])

  // Auto-scroll within the log panel only (not the page)
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      // Scroll within the log container, not the page
      const container = logEndRef.current.parentElement
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    }
  }, [toolLogs, jobLogs, activeLogTab, autoScroll])

  // Toast on terminal states — only when status *transitions*, not on mount
  const prevStatusRef = useRef<string>("")
  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = currentStatus
    // Only toast if we transitioned from a non-terminal state
    if (!prev || prev === currentStatus) return
    if (currentStatus === "completed" || currentStatus === "failed") {
      toast.success(
        `Job ${currentStatus}! You can now proceed to the next step.`
      )
    }
  }, [currentStatus])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const cancelJob = async () => {
    setIsCanceling(true)
    try {
      await benchmarkApi.delete(getBenchmarkJobStatusUrl(jobId))
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
    reconnectSSE?.()
    setTimeout(() => setIsReconnecting(false), 1000)
  }

  // ---------------------------------------------------------------------------
  // Rendering helpers
  // ---------------------------------------------------------------------------

  const filteredLogs = useMemo(() => {
    const lines = activeLogTab === "__job__" ? jobLogs : (toolLogs[activeLogTab] || [])
    const levels: LogLevel[] = ["debug", "info", "warning", "error"]
    const minIdx = levels.indexOf(logLevelFilter as LogLevel)
    if (minIdx <= 0) return lines
    return lines.filter((l) => levels.indexOf(l.level) >= minIdx)
  }, [toolLogs, jobLogs, activeLogTab, logLevelFilter])

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
                <TabsTrigger key="__job__" value="__job__" className="group text-xs">
                  Job
                  {jobLogs.length > 0 && (
                    <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px] group-data-[state=active]:border-white/50 group-data-[state=active]:text-white">
                      {jobLogs.length}
                    </Badge>
                  )}
                </TabsTrigger>
                {toolNames.map((name) => (
                  <TabsTrigger key={name} value={name} className="group text-xs">
                    {name}
                    {(toolLogs[name]?.length ?? 0) > 0 && (
                      <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px] group-data-[state=active]:border-white/50 group-data-[state=active]:text-white">
                        {toolLogs[name]?.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              {["__job__", ...toolNames].map((name) => (
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
                        {(name === "__job__" ? jobLogs.length : toolLogs[name]?.length)
                          ? `No logs at level "${logLevelFilter}" or above`
                          : "Waiting for log output..."}
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap break-words space-y-1">
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
