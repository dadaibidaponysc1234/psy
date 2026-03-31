"use client"

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import benchmarkApi from "@/lib/benchmark-api"
import { getBenchmarkJobLogsUrl, getBenchmarkLogsUrl, getBenchmarkJobStatusUrl } from "@/lib/config"
import type { LogLevel, LogLine } from "@/types/benchmarking"

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "")
const MAX_LOG_LINES = 1500

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

interface HistoricalJobLogsProps {
  jobId: string
}

export function HistoricalJobLogs({ jobId }: HistoricalJobLogsProps) {
  const [jobLogs, setJobLogs] = useState<LogLine[]>([])
  const [toolLogs, setToolLogs] = useState<Record<string, LogLine[]>>({})
  const [toolNames, setToolNames] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("__job__")
  const [logLevelFilter, setLogLevelFilter] = useState("info")
  const [loading, setLoading] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)
  const logEndRef = useRef<HTMLDivElement>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch job-level logs
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
        // Job logs may not be available
      }

      // Fetch tool names from job status
      try {
        const statusRes = await benchmarkApi.get(getBenchmarkJobStatusUrl(jobId))
        const tools: any[] = statusRes.data?.tools ?? []
        const names = tools.map((t: any) => t.tool_name).sort()
        setToolNames(names)

        // Fetch per-tool logs
        const allToolLogs: Record<string, LogLine[]> = {}
        await Promise.all(
          names.map(async (tool) => {
            try {
              const url = getBenchmarkLogsUrl(jobId, tool, { limit: MAX_LOG_LINES })
              const res = await benchmarkApi.get(url)
              if (res.data?.lines?.length) {
                allToolLogs[tool] = res.data.lines.map((l: any) => ({
                  level: l.level,
                  line: stripAnsi(l.line),
                  timestamp: l.timestamp,
                  source: l.source,
                }))
              }
            } catch {
              // Tool logs may not be available
            }
          })
        )
        setToolLogs(allToolLogs)
      } catch {
        // Status fetch failed
      }
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      const container = logEndRef.current.parentElement
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    }
  }, [toolLogs, jobLogs, activeTab, autoScroll])

  const filteredLogs = useMemo(() => {
    const lines =
      activeTab === "__job__" ? jobLogs : toolLogs[activeTab] || []
    const levels: LogLevel[] = ["debug", "info", "warning", "error"]
    const minIdx = levels.indexOf(logLevelFilter as LogLevel)
    if (minIdx <= 0) return lines
    return lines.filter((l) => levels.indexOf(l.level) >= minIdx)
  }, [toolLogs, jobLogs, activeTab, logLevelFilter])

  const hasAnyLogs =
    jobLogs.length > 0 || Object.values(toolLogs).some((l) => l.length > 0)

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading logs...</span>
        </CardContent>
      </Card>
    )
  }

  if (!hasAnyLogs) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No logs available for this job.
        </CardContent>
      </Card>
    )
  }

  return (
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-2">
            <TabsTrigger value="__job__" className="group text-xs">
              Job
              {jobLogs.length > 0 && (
                <Badge
                  variant="outline"
                  className="ml-1.5 px-1.5 py-0 text-[10px] group-data-[state=active]:border-white/50 group-data-[state=active]:text-white"
                >
                  {jobLogs.length}
                </Badge>
              )}
            </TabsTrigger>
            {toolNames.map((name) => (
              <TabsTrigger key={name} value={name} className="group text-xs">
                {name}
                {(toolLogs[name]?.length ?? 0) > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-1.5 px-1.5 py-0 text-[10px] group-data-[state=active]:border-white/50 group-data-[state=active]:text-white"
                  >
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
                      : "No logs available."}
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
                <div ref={activeTab === name ? logEndRef : undefined} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
