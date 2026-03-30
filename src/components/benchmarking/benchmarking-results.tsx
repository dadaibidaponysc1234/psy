"use client"

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react"
import axios from "axios"
import { toast } from "react-hot-toast"
import { BENCHMARK_CONFIG, getBenchmarkJobStatusUrl } from "@/lib/config"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"
import { useBenchmarkSSE } from "@/hooks/use-benchmark-sse"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Image as ImageIcon,
  FileText as FileTextIcon,
  Download,
  RefreshCw,
  Link as LinkIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface BenchmarkingResultsProps {
  jobId: string
  onBack?: () => void
}

interface ManifestArtifact {
  name: string
  path: string
  size: number
  last_modified: string
  content_type: string
  url: string
  is_previewable?: boolean
}

interface ManifestPlot {
  name: string
  path: string
  url: string
  content_type?: string
  is_previewable?: boolean
  tool?: string | null
  evaluation_type?: "quantitative" | "binary" | null
}

interface ResultsManifest {
  job_id: string
  artifacts: ManifestArtifact[]
  plots?: ManifestPlot[]
  summary?: Record<string, any>
  config?: {
    tools_to_run?: string[]
    [key: string]: any
  }
  stages?: Record<string, any>
}

interface PRSSummaryResponse {
  job_id: string
  summary?: { tool?: string; r2?: string | number; auc?: string | number }
  links?: Record<string, Record<string, string>>
  table?: { columns: string[]; rows: Array<Record<string, string | number>> }
}

interface EvalR2Response {
  job_id: string
  tables?: Record<
    string,
    { columns: string[]; rows: Array<Record<string, string | number>> }
  >
}

// Per-tool execution summary types
interface ToolStageSummary {
  preprocessing?: "succeeded" | "failed" | "skipped" | "unknown"
  processing?: "succeeded" | "failed" | "skipped" | "unknown"
  evaluation_r2?: "succeeded" | "missing" | "unknown"
  evaluation_auc?: "succeeded" | "missing" | "unknown"
  messages?: string | null
}

type SummaryTableRow = Record<string, string | number>

interface EvaluationTableSection {
  key: string
  label: string
  columns: string[]
  rows: Array<Record<string, string | number>>
}

export function BenchmarkingResults({
  jobId,
  onBack,
}: BenchmarkingResultsProps) {
  const [manifest, setManifest] = useState<ResultsManifest | null>(null)
  const [prsSummary, setPrsSummary] = useState<PRSSummaryResponse | null>(null)
  const [evalR2, setEvalR2] = useState<EvalR2Response | null>(null)
  const [evalAUC, setEvalAUC] = useState<EvalR2Response | null>(null)
  const [plots, setPlots] = useState<ManifestPlot[] | null>(null)
  // SSE-driven tool states from zustand (replaces tool-summary endpoint)
  const toolStates = useBenchmarkingStore((s) => s.toolStates)

  // Connect SSE so tool states are live even on the results page
  useBenchmarkSSE(jobId || null)
  const [loading, setLoading] = useState({
    manifest: true,
    summary: true,
    eval: true,
    evalAuc: true,
  })
  const [errors, setErrors] = useState<{
    manifest?: string
    summary?: string
    eval?: string
    evalAuc?: string
  }>({})
  const [backendStatus, setBackendStatus] = useState<string | null>(null)
  const [statusDetails, setStatusDetails] = useState<Record<
    string,
    any
  > | null>(null)

  // Preview modal state
  const [previewItem, setPreviewItem] = useState<{
    name: string
    url: string
    contentType?: string
  } | null>(null)

  // Files tab search query
  const [filesQuery, setFilesQuery] = useState("")

  // Ref for raw files slider
  // Guard to ensure we auto-refresh results only once when job completes
  const hasRefreshedOnCompletion = useRef(false)

  // Label formatter for tool/file names
  const formatLabel = (s?: string) => {
    if (!s) return ""
    const spaced = s.replace(/_/g, " ")
    return spaced.replace(/\b\w/g, (c) => c.toUpperCase())
  }

  // Basic filter for log-like entries
  const isLogLike = (s?: string) => {
    if (!s) return false
    const lower = s.toLowerCase()
    return (
      lower.endsWith(".log") ||
      lower.includes("/logs") ||
      lower.includes("_log") ||
      lower.includes("-log")
    )
  }

  const endpoints = useMemo(() => {
    const base = BENCHMARK_CONFIG.BASE_URL
    return {
      manifest: `${base}/${jobId}/results/manifest`,
      plots: `${base}/${jobId}/results/plots`,
      prsSummary: `${base}/${jobId}/results/prs-summary`,
      evalR2: `${base}/${jobId}/results/eval-r2`,
      evalAUC: `${base}/${jobId}/results/eval-auc`,
      archive: `${base}/${jobId}/results/archive.zip`,
    }
  }, [jobId])

  // Ensure URLs returned by backend (which may be relative) are resolved against the backend base URL
  const resolveUrl = useCallback((u?: string) => {
    if (!u) return ""
    try {
      return new URL(u, BENCHMARK_CONFIG.BASE_URL).toString()
    } catch {
      return u
    }
  }, [])

  const backendOrigin = useMemo(() => {
    try {
      return new URL(BENCHMARK_CONFIG.BASE_URL).origin
    } catch {
      return ""
    }
  }, [])

  const toBackendOrigin = useCallback(
    (u?: string) => {
      if (!u) return ""
      try {
        const parsed = new URL(u)
        return `${backendOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`
      } catch {
        // if it's relative, fall back to resolveUrl
        return resolveUrl(u)
      }
    },
    [backendOrigin, resolveUrl]
  )

  // Build the API endpoint URL for a results file.
  // In split mode this returns JSON { url, filename } with a presigned S3 URL.
  const fileEndpointFromPath = (path: string) => {
    const p = encodeURIComponent(path)
    return `${BENCHMARK_CONFIG.BASE_URL}/${jobId}/results/file?path=${p}`
  }

  // Fetch a presigned URL for a results file (split mode).
  // Falls back to returning the API endpoint URL directly on error.
  const fetchPresignedUrl = useCallback(
    async (path: string): Promise<string> => {
      try {
        const res = await axios.get(fileEndpointFromPath(path))
        // Split mode returns { url, filename }
        if (res.data?.url) return res.data.url
        // Full mode — the endpoint itself serves the file
        return fileEndpointFromPath(path)
      } catch {
        return fileEndpointFromPath(path)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jobId]
  )

  // Open a preview dialog for an artifact (resolves presigned URL first)
  const openArtifactPreview = useCallback(
    async (artifact: ManifestArtifact) => {
      const url = artifact.url
        ? resolveUrl(artifact.url)
        : await fetchPresignedUrl(artifact.path)
      setPreviewItem({
        name: artifact.name,
        url,
        contentType: artifact.content_type,
      })
    },
    [resolveUrl, fetchPresignedUrl]
  )

  // Trigger a download for an artifact (resolves presigned URL first)
  const downloadArtifact = useCallback(
    async (artifact: ManifestArtifact) => {
      try {
        const url = artifact.url
          ? resolveUrl(artifact.url)
          : await fetchPresignedUrl(artifact.path)
        const a = document.createElement("a")
        a.href = url
        a.download = artifact.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } catch {
        toast.error("Failed to get download URL")
      }
    },
    [resolveUrl, fetchPresignedUrl]
  )

  const isImageLike = (contentType?: string, nameOrUrl?: string) => {
    if (contentType && contentType.startsWith("image/")) return true
    if (!nameOrUrl) return false
    const lower = nameOrUrl.toLowerCase()
    return [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp"].some(
      (ext) => lower.endsWith(ext)
    )
  }

  const fetchStatus = useCallback(
    async (log?: boolean) => {
      if (!jobId) return
      try {
        const res = await axios.get(getBenchmarkJobStatusUrl(jobId))
        const status = (res.data?.status ?? "").toString()
        if (log) console.log("[Benchmark] Status response:", JSON.stringify(res.data, null, 2))
        setBackendStatus(status)
        setStatusDetails(res.data)
      } catch (e: any) {
        if (log)
          console.error(
            "[Benchmark] Status error:",
            JSON.stringify(e?.response?.data || e?.message || e)
          )
        setBackendStatus(null)
        setStatusDetails(null)
      }
    },
    [jobId]
  )

  const fetchAll = useCallback(
    async (log?: boolean) => {
      if (!jobId) return
      setLoading({ manifest: true, summary: true, eval: true, evalAuc: true })
      setErrors({})
      fetchStatus(log)
      try {
        const res = await axios.get<ResultsManifest>(endpoints.manifest)
        if (log) console.log("[Benchmark] Manifest response:", JSON.stringify(res.data, null, 2))
        setManifest(res.data)
      } catch (e: any) {
        if (log)
          console.error(
            "[Benchmark] Manifest error:",
            JSON.stringify(e?.response?.data || e?.message || e)
          )
        setErrors((prev) => ({
          ...prev,
          manifest: e?.message || "Failed to load manifest",
        }))
      } finally {
        setLoading((prev) => ({ ...prev, manifest: false }))
      }

      // Fetch plots from new endpoint (falls back to manifest.plots if this fails)
      try {
        const res = await axios.get<{ job_id: string; plots: ManifestPlot[] }>(
          endpoints.plots
        )
        if (log) console.log("[Benchmark] Plots response:", JSON.stringify(res.data, null, 2))
        setPlots(res.data?.plots ?? null)
      } catch (e: any) {
        if (log)
          console.error(
            "[Benchmark] Plots error:",
            JSON.stringify(e?.response?.data || e?.message || e)
          )
        // no error surfaced; we will rely on manifest.plots if present
      }

      try {
        const res = await axios.get<PRSSummaryResponse>(endpoints.prsSummary)
        if (log) console.log("[Benchmark] PRS summary response:", JSON.stringify(res.data, null, 2))
        setPrsSummary(res.data)
      } catch (e: any) {
        if (log)
          console.error(
            "[Benchmark] PRS summary error:",
            JSON.stringify(e?.response?.data || e?.message || e)
          )
        setErrors((prev) => ({
          ...prev,
          summary: e?.message || "Failed to load PRS summary",
        }))
      } finally {
        setLoading((prev) => ({ ...prev, summary: false }))
      }

      try {
        const res = await axios.get<EvalR2Response>(endpoints.evalR2)
        if (log) console.log("[Benchmark] R2 tables response:", JSON.stringify(res.data, null, 2))
        setEvalR2(res.data)
      } catch (e: any) {
        if (log)
          console.error(
            "[Benchmark] R2 tables error:",
            JSON.stringify(e?.response?.data || e?.message || e)
          )
        setErrors((prev) => ({
          ...prev,
          eval: e?.message || "Failed to load R2 evaluation tables",
        }))
      } finally {
        setLoading((prev) => ({ ...prev, eval: false }))
      }

      try {
        const res = await axios.get<EvalR2Response>(endpoints.evalAUC)
        if (log) console.log("[Benchmark] AUC tables response:", JSON.stringify(res.data, null, 2))
        setEvalAUC(res.data)
      } catch (e: any) {
        if (log)
          console.error(
            "[Benchmark] AUC tables error:",
            JSON.stringify(e?.response?.data || e?.message || e)
          )
        setErrors((prev) => ({
          ...prev,
          evalAuc: e?.message || "Failed to load AUC evaluation tables",
        }))
      } finally {
        setLoading((prev) => ({ ...prev, evalAuc: false }))
      }
    },
    [endpoints, fetchStatus, jobId]
  )

  useEffect(() => {
    // reset completion refresh guard on job change
    hasRefreshedOnCompletion.current = false
    fetchAll(true) // log on initial load to aid debugging
  }, [fetchAll, jobId])

  // Light polling to keep status fresh until a terminal state
  useEffect(() => {
    if (!jobId) return
    const terminal = new Set(["completed", "failed", "cancelled"]) // backend terminal statuses
    const current = (backendStatus || "").toLowerCase()
    if (terminal.has(current)) return
    const id = setInterval(() => {
      fetchStatus()
    }, 5000)
    return () => clearInterval(id)
  }, [jobId, backendStatus, fetchStatus])

  // When the backend status transitions to completed, trigger a one-time refresh to load results
  useEffect(() => {
    if (!jobId) return
    if (
      (backendStatus || "").toLowerCase() === "completed" &&
      !hasRefreshedOnCompletion.current
    ) {
      hasRefreshedOnCompletion.current = true
      fetchAll() // silent refresh to load manifest, summaries, and evaluations
    }
  }, [backendStatus, fetchAll, jobId])

  const allPlots = useMemo(() => {
    const fromManifest = manifest?.plots ?? []
    const result = plots && plots.length > 0 ? plots : fromManifest
    console.log("[Benchmark] allPlots:", JSON.stringify({
      fromPlotsEndpoint: plots?.length ?? 0,
      fromManifest: fromManifest.length,
      using: result.length,
      sampleUrls: result.slice(0, 3).map((p) => ({ name: p.name, url: p.url?.slice(0, 120) })),
    }, null, 2))
    return result
  }, [manifest, plots])

  const orderedTools = useMemo(() => {
    const seen = new Set<string>()
    const ordered: string[] = []

    const pushValue = (value?: string) => {
      if (!value) return
      const normalized = value.trim().toLowerCase()
      if (!normalized || seen.has(normalized)) return
      seen.add(normalized)
      ordered.push(normalized)
    }

    const configTools = manifest?.config?.tools_to_run
    if (Array.isArray(configTools)) {
      configTools.forEach((tool) => pushValue(String(tool ?? "")))
    }

    prsSummary?.table?.rows?.forEach((row) => {
      const rawTool = String(
        (row as SummaryTableRow)?.Tool ?? (row as any)?.tool ?? ""
      )
      if (rawTool) pushValue(rawTool)
    })

    if (prsSummary?.summary?.tool) pushValue(String(prsSummary.summary.tool))

    Object.keys(evalR2?.tables ?? {}).forEach((key) => {
      const base = key.includes("_") ? key.split("_")[0] : key
      pushValue(base)
    })

    Object.keys(evalAUC?.tables ?? {}).forEach((key) => {
      const base = key.includes("_") ? key.split("_")[0] : key
      pushValue(base)
    })

    allPlots.forEach((plot) => {
      if (plot.tool) pushValue(plot.tool)
    })

    manifest?.artifacts?.forEach((artifact) => {
      const reference =
        `${artifact.name || ""} ${artifact.path || ""}`.toLowerCase()
      if (reference.includes("prsice")) pushValue("prsice")
      if (reference.includes("prscsx")) pushValue("prscsx")
    })

    return ordered
  }, [allPlots, evalAUC, evalR2, manifest, prsSummary])

  const formatToolDisplay = useCallback((toolId: string) => {
    const normalized = toolId.toLowerCase()
    if (normalized === "prsice") return "PRSice"
    if (normalized === "prscsx") return "PRS-CSx"
    if (normalized === "xpass") return "XPASS"
    if (normalized === "xpass+") return "XPASS+"
    return formatLabel(toolId)
  }, [])

  const matchToolId = useCallback(
    (identifier?: string | null) => {
      if (!identifier) return null
      const normalized = identifier.trim().toLowerCase()
      if (!normalized) return null
      // Exact match first
      for (const id of orderedTools) {
        if (normalized === id) return id
      }
      // Sort by length descending so longer/more specific tools match first
      // e.g., "xpass+" should match before "xpass" in "prs_results/xpass+/..."
      const sortedByLength = [...orderedTools].sort((a, b) => b.length - a.length)
      for (const id of sortedByLength) {
        if (normalized.includes(id)) return id
      }
      if (orderedTools.length === 0) {
        const fallback = normalized.split(/[^a-z0-9]+/)[0]
        return fallback || null
      }
      return null
    },
    [orderedTools]
  )

  const summaryTableByTool = useMemo(() => {
    if (!prsSummary?.table) return {}
    const map: Record<string, SummaryTableRow[]> = {}
    prsSummary.table.rows.forEach((row) => {
      const tool = matchToolId(String(row["Tool"] ?? (row as any)?.tool ?? ""))
      if (!tool) return
      if (!map[tool]) map[tool] = []
      map[tool].push(row)
    })
    return map
  }, [matchToolId, prsSummary])

  const summaryMetricsByTool = useMemo(() => {
    const map: Record<string, { r2?: string | number; auc?: string | number }> =
      {}
    prsSummary?.table?.rows.forEach((row) => {
      const tool = matchToolId(String(row["Tool"] ?? (row as any)?.tool ?? ""))
      if (!tool) return
      map[tool] = {
        r2: row["R2"] ?? map[tool]?.r2,
        auc: row["AUC"] ?? map[tool]?.auc,
      }
    })

    if (prsSummary?.summary?.tool) {
      const tool =
        matchToolId(String(prsSummary.summary.tool)) ??
        String(prsSummary.summary.tool).toLowerCase()
      map[tool] = {
        r2: prsSummary.summary.r2 ?? map[tool]?.r2,
        auc: prsSummary.summary.auc ?? map[tool]?.auc,
      }
    }

    return map
  }, [matchToolId, prsSummary])

  const evaluationByTool = useMemo(() => {
    const map: Record<
      string,
      { r2: EvaluationTableSection[]; auc: EvaluationTableSection[] }
    > = {}

    const ensure = (tool: string) => {
      if (!map[tool]) {
        map[tool] = { r2: [], auc: [] }
      }
      return map[tool]
    }

    Object.entries(evalR2?.tables ?? {}).forEach(([key, table]) => {
      const tool =
        matchToolId(key) ??
        (key.includes("_")
          ? key.split("_")[0].toLowerCase()
          : key.toLowerCase())
      const bucket = ensure(tool)
      bucket.r2.push({
        key,
        label: formatLabel(key),
        columns: table.columns,
        rows: table.rows,
      })
    })

    Object.entries(evalAUC?.tables ?? {}).forEach(([key, table]) => {
      const tool =
        matchToolId(key) ??
        (key.includes("_")
          ? key.split("_")[0].toLowerCase()
          : key.toLowerCase())
      const bucket = ensure(tool)
      bucket.auc.push({
        key,
        label: formatLabel(key),
        columns: table.columns,
        rows: table.rows,
      })
    })

    return map
  }, [evalAUC, evalR2, matchToolId])

  // Derive tool execution summary from SSE-driven toolStates in zustand
  const combinedToolSummary = useMemo<Record<string, ToolStageSummary>>(() => {
    const result: Record<string, ToolStageSummary> = {}
    const mapStatus = (s: string): "succeeded" | "failed" | "skipped" | "unknown" => {
      if (s === "completed") return "succeeded"
      if (s === "failed") return "failed"
      if (s === "skipped") return "skipped"
      return "unknown"
    }
    const mapEvalStatus = (s: string): "succeeded" | "missing" | "unknown" => {
      if (s === "completed") return "succeeded"
      if (s === "failed" || s === "skipped") return "missing"
      return "unknown"
    }
    for (const [name, ts] of Object.entries(toolStates)) {
      result[name] = {
        preprocessing: mapStatus(ts.status),
        processing: mapStatus(ts.status),
        evaluation_r2: mapEvalStatus(ts.evaluation_r2_status),
        evaluation_auc: mapEvalStatus(ts.evaluation_auc_status),
        messages: ts.message || ts.last_error || null,
      }
    }
    return result
  }, [toolStates])

  const renderStageBadge = useCallback((value?: string) => {
    const v = (value || "unknown").toLowerCase()
    let cls = "bg-muted text-muted-foreground border-border"
    let label = v
    switch (v) {
      case "succeeded":
        cls = "bg-green-100 text-green-800 border-green-200"
        label = "Succeeded"
        break
      case "failed":
        cls = "bg-red-100 text-red-800 border-red-200"
        label = "Failed"
        break
      case "skipped":
        cls = "bg-amber-100 text-amber-800 border-amber-200"
        label = "Skipped"
        break
      case "missing":
        cls = "bg-gray-100 text-gray-800 border-gray-200"
        label = "Missing"
        break
      default:
        cls = "bg-muted text-muted-foreground border-border"
        label = "Unknown"
        break
    }
    return (
      <Badge variant="outline" className={`text-xs ${cls}`}>
        {label}
      </Badge>
    )
  }, [])

  const plotsByTool = useMemo(() => {
    const perTool: Record<string, ManifestPlot[]> = {}
    const shared: ManifestPlot[] = []
    allPlots.forEach((plot) => {
      const reference = plot.tool || plot.name || plot.path
      const tool = matchToolId(reference)
      if (tool) {
        if (!perTool[tool]) perTool[tool] = []
        perTool[tool].push(plot)
      } else {
        shared.push(plot)
      }
    })
    return { perTool, shared }
  }, [allPlots, matchToolId])

  const artifactsByTool = useMemo(() => {
    const perTool: Record<string, ManifestArtifact[]> = {}
    const shared: ManifestArtifact[] = []
    manifest?.artifacts?.forEach((artifact) => {
      const tool = matchToolId(`${artifact.name ?? ""} ${artifact.path ?? ""}`)
      if (tool) {
        if (!perTool[tool]) perTool[tool] = []
        perTool[tool].push(artifact)
      } else {
        shared.push(artifact)
      }
    })
    return { perTool, shared }
  }, [manifest, matchToolId])

  // Apply client-side filtering for Files tab based on search query
  const filteredArtifactsByTool = useMemo(() => {
    const q = filesQuery.trim().toLowerCase()
    if (!q) return artifactsByTool
    const match = (a: ManifestArtifact) => {
      const fields = [
        a.name,
        a.path,
        a.content_type,
        a.last_modified,
        typeof a.size === "number" ? String(a.size) : (a.size as any),
      ]
      return fields.some((v) => v && String(v).toLowerCase().includes(q))
    }
    const perTool: Record<string, ManifestArtifact[]> = {}
    Object.keys(artifactsByTool.perTool).forEach((tool) => {
      perTool[tool] = (artifactsByTool.perTool[tool] ?? []).filter(match)
    })
    const shared = (artifactsByTool.shared ?? []).filter(match)
    return { perTool, shared }
  }, [artifactsByTool, filesQuery])

  const hasFilteredPerToolArtifacts = useMemo(
    () =>
      orderedTools.some(
        (toolId) => (filteredArtifactsByTool.perTool[toolId] ?? []).length > 0
      ),
    [filteredArtifactsByTool, orderedTools]
  )

  const linksByTool = useMemo(() => {
    const perTool: Record<
      string,
      Array<{ category: string; name: string; url: string }>
    > = {}
    const shared: Array<{ category: string; name: string; url: string }> = []

    if (prsSummary?.links) {
      Object.entries(prsSummary.links).forEach(([category, files]) => {
        Object.entries(files).forEach(([name, url]) => {
          const resolvedUrl = toBackendOrigin(url)
          const tool =
            matchToolId(url) ??
            matchToolId(name) ??
            matchToolId(category) ??
            null
          const entry = { category, name, url: resolvedUrl }
          if (tool) {
            if (!perTool[tool]) perTool[tool] = []
            perTool[tool].push(entry)
          } else {
            shared.push(entry)
          }
        })
      })
    }

    return { perTool, shared }
  }, [matchToolId, prsSummary, toBackendOrigin])

  const summaryColumns = prsSummary?.table?.columns ?? []

  const hasPerToolArtifacts = useMemo(
    () =>
      orderedTools.some(
        (toolId) => (artifactsByTool.perTool[toolId] ?? []).length > 0
      ),
    [artifactsByTool, orderedTools]
  )

  const timelineEntries = useMemo(() => {
    if (!statusDetails) return []
    
    // Helper to infer missing timestamps if a later step is completed
    const inferTimestamp = (current: string | null | undefined, later: (string | null | undefined)[]) => {
      if (current) return current
      // If any later step has a timestamp, assume this step is completed (use the earliest later timestamp)
      const firstLater = later.find(t => t)
      return firstLater ? firstLater : null
    }

    const { created_at, uploaded_at, configured_at, started_at, completed_at } = statusDetails

    const entries = [
      { 
        label: "Created", 
        value: created_at 
      },
      { 
        label: "Uploaded", 
        value: inferTimestamp(uploaded_at, [configured_at, started_at, completed_at])
      },
      { 
        label: "Configured", 
        value: inferTimestamp(configured_at, [started_at, completed_at]) 
      },
      { 
        label: "Started", 
        value: inferTimestamp(started_at, [completed_at]) 
      },
      { 
        label: "Completed", 
        value: completed_at 
      },
    ]

    return entries
  }, [statusDetails])

  const formatTimelineValue = useCallback((value?: string | null) => {
    if (!value) return "Pending"
    try {
      return new Date(value).toLocaleString()
    } catch {
      return "Completed"
    }
  }, [])

  const currentTimelineIndex = useMemo(() => {
    if (timelineEntries.length === 0) return -1
    const firstIncomplete = timelineEntries.findIndex((entry) => !entry.value)
    if (firstIncomplete === -1) return timelineEntries.length - 1
    return firstIncomplete
  }, [timelineEntries])

  const getEvaluationType = useCallback(
    (toolId: string) => {
      const toolConfig = (manifest as any)?.config?.[toolId]
      return toolConfig?.pre_processing?.options?.evaluation_type ?? null
    },
    [manifest]
  )

  const jobStatus = useMemo<{
    label: string
    className: string
    Icon: React.ElementType
  }>(() => {
    const s = (backendStatus || "").toLowerCase()
    if (!s) {
      if (loading.manifest || loading.summary || loading.eval) {
        return {
          label: "Processing",
          className: "bg-amber-100 text-amber-800 border-amber-200",
          Icon: Clock,
        }
      }
      return {
        label: "Processing",
        className: "bg-amber-100 text-amber-800 border-amber-200",
        Icon: Clock,
      }
    }
    switch (s) {
      case "queued":
        return {
          label: "Queued",
          className: "bg-amber-100 text-amber-800 border-amber-200",
          Icon: Clock,
        }
      case "uploaded":
        return {
          label: "Uploaded",
          className: "bg-blue-100 text-blue-800 border-blue-200",
          Icon: Clock,
        }
      case "configured":
        return {
          label: "Configured",
          className: "bg-yellow-100 text-yellow-800 border-yellow-200",
          Icon: Clock,
        }
      case "running":
        return {
          label: "Running",
          className: "bg-amber-100 text-amber-800 border-amber-200",
          Icon: Clock,
        }
      case "completed":
        return {
          label: "Successful",
          className: "bg-green-100 text-green-800 border-green-200",
          Icon: CheckCircle,
        }
      case "failed":
        return {
          label: "Failed",
          className: "bg-red-100 text-red-800 border-red-200",
          Icon: AlertCircle,
        }
      default:
        return {
          label: "Processing",
          className: "bg-amber-100 text-amber-800 border-amber-200",
          Icon: Clock,
        }
    }
  }, [backendStatus, loading])

  function LinkScroller({
    items,
  }: {
    items: Array<{ category: string; name: string; url: string }>
  }) {
    const scrollerRef = useRef<HTMLDivElement>(null)
    const filteredItems = items.filter(({ name, url }) => {
      if (isLogLike(name) || isLogLike(url)) return false
      if (isImageLike(undefined, name) || isImageLike(undefined, url))
        return false
      return true
    })

    if (filteredItems.length === 0) return null

    return (
      <div className="flex w-full items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() =>
            scrollerRef.current?.scrollBy({ left: -400, behavior: "smooth" })
          }
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div
          ref={scrollerRef}
          className="no-scrollbar relative w-full min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain"
        >
          <div className="inline-flex gap-2 whitespace-nowrap pr-4">
            {filteredItems.map((item) => (
              <Button
                key={`${item.category}-${item.name}`}
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() =>
                  setPreviewItem({
                    name: `${formatLabel(item.category)}: ${formatLabel(
                      item.name
                    )}`,
                    url: item.url,
                  })
                }
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                {formatLabel(item.category)}: {formatLabel(item.name)}
              </Button>
            ))}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() =>
            scrollerRef.current?.scrollBy({ left: 400, behavior: "smooth" })
          }
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    )
  }

  const tabListClass =
    "no-scrollbar flex w-full gap-2 overflow-x-auto border-b border-border pb-1 [&::-webkit-scrollbar]:hidden"
  const tabTriggerClass =
    "rounded-none border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition data-[state=active]:border-primary data-[state=active]:text-primary"

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      {/* Top summary status for loading/errors */}
      {(loading.manifest ||
        loading.summary ||
        loading.eval ||
        loading.evalAuc) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Fetching results
          (manifest, PRS summary, evaluation)...
        </div>
      )}
      {Object.values(errors).some(Boolean) && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> Some sections failed to load. Try
          Refresh. We will polish messages later.
        </div>
      )}

      {/* Header / Action bar */}
      <div className="flex flex-col justify-between gap-4 overflow-x-hidden sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h3 className="mb-1 text-xl font-semibold">
            PRS Benchmarking Results
          </h3>
          <p className="text-sm text-muted-foreground">
            Job ID: <span className="break-all font-mono">{jobId || "-"}</span>
            <span
              className={`ml-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${jobStatus.className}`}
            >
              {React.createElement(jobStatus.Icon, {
                className: "h-3.5 w-3.5",
              })}{" "}
              {jobStatus.label}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a href={resolveUrl(endpoints.archive)} download>
            <Button variant="default">
              <Download className="mr-2 h-4 w-4" /> Export all (zip)
            </Button>
          </a>
          <Button variant="outline" onClick={() => fetchAll(true)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              Back
            </Button>
          )}
        </div>
      </div>

      {/* Failure notice card */}
      {(backendStatus || "").toLowerCase() === "failed" && (
        <Card className="border-red-200 bg-red-50 text-red-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Job Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              {statusDetails?.error_message || statusDetails?.error || statusDetails?.message ? (
                <span className="break-words">
                  {String(
                    statusDetails?.error_message ||
                      statusDetails?.error ||
                      statusDetails?.message
                  )}
                </span>
              ) : (
                <span>
                  This job encountered an error and did not complete.
                </span>
              )}
            </div>
            <div className="text-red-800/80">
              Try Refresh, review your configuration, and check logs or files
              in the Files tab.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs
        defaultValue="overview"
        className="w-full min-w-0 overflow-x-hidden overflow-y-hidden"
      >
        <TabsList className={tabListClass}>
          <TabsTrigger
            className={`${tabTriggerClass} data-[state=active]:bg-primary/60 data-[state=active]:shadow`}
            value="overview"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            className={`${tabTriggerClass} data-[state=active]:bg-primary/60 data-[state=active]:shadow`}
            value="tools"
          >
            Tools
          </TabsTrigger>
          <TabsTrigger
            className={`${tabTriggerClass} data-[state=active]:bg-primary/60 data-[state=active]:shadow`}
            value="files"
          >
            Files
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          className="w-full min-w-0 space-y-4 overflow-x-hidden"
        >
          {orderedTools.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Summary Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {orderedTools.map((toolId) => {
                    const metrics = summaryMetricsByTool[toolId] ?? {}
                    const evaluationType = getEvaluationType(toolId)
                    const hasR2 =
                      metrics.r2 !== undefined &&
                      metrics.r2 !== null &&
                      `${metrics.r2}` !== ""
                    const hasAuc =
                      metrics.auc !== undefined &&
                      metrics.auc !== null &&
                      `${metrics.auc}` !== ""
                    return (
                      <div
                        key={toolId}
                        className="flex flex-col gap-3 rounded-lg border p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs uppercase text-muted-foreground">
                              Tool
                            </div>
                            <div className="text-lg font-semibold">
                              {formatToolDisplay(toolId)}
                            </div>
                          </div>
                          {evaluationType && (
                            <Badge variant="outline" className="uppercase">
                              {evaluationType}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <div className="text-xs uppercase text-muted-foreground">
                              R2
                            </div>
                            <div className="break-all text-base font-semibold">
                              {hasR2 ? metrics.r2 : "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs uppercase text-muted-foreground">
                              AUC
                            </div>
                            <div className="break-all text-base font-semibold">
                              {hasAuc ? metrics.auc : "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {timelineEntries.length > 0 && (
            <Card className="bg-gradient-to-br from-background via-background to-primary/5">
              <CardHeader>
                <CardTitle>Run Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto pb-4">
                  <ol className="flex min-w-[600px] w-full items-start justify-between">
                    {timelineEntries.map((entry, index) => {
                      const isCompleted = Boolean(entry.value)
                      const isCurrent = index === currentTimelineIndex
                      const isLast = index === timelineEntries.length - 1

                      const labelClass = isCompleted || isCurrent ? "text-primary font-bold" : "text-muted-foreground"
                      
                      const circleClass = (() => {
                        if (isCompleted)
                          return "border-primary bg-primary text-white shadow-md ring-2 ring-primary/20"
                        if (isCurrent)
                          return "border-primary bg-background text-primary shadow ring-4 ring-primary/10"
                        return "border-muted-foreground/30 bg-muted/50 text-muted-foreground"
                      })()

                      const connectorClass = isCompleted
                        ? "bg-primary"
                        : "bg-muted-foreground/20"

                      return (
                        <li key={entry.label} className="flex flex-1 flex-col items-center gap-2">
                           {/* Label */}
                           <div className={`text-xs uppercase tracking-wider transition-colors duration-300 ${labelClass}`}>
                              {entry.label}
                           </div>

                           {/* Circle & Connector Wrapper */}
                           <div className="relative flex w-full justify-center">
                              {/* Connector Line */}
                              {!isLast && (
                                <div 
                                   className="absolute left-[50%] top-1/2 -z-0 w-full -translate-y-1/2 px-0" 
                                   aria-hidden="true"
                                >
                                  <div className={`h-1 w-full rounded-full transition-colors duration-500 ${connectorClass}`} />
                                </div>
                              )}
                              
                              {/* Circle */}
                              <div className={`relative z-10 grid h-10 w-10 place-items-center rounded-full border-2 text-sm font-bold transition-all duration-500 ${circleClass}`}>
                                {index + 1}
                                {isCurrent && (
                                   <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/20 opacity-75" />
                                )}
                              </div>
                           </div>

                           {/* Date */}
                           <div className="text-[10px] text-muted-foreground/80 whitespace-nowrap">
                              {formatTimelineValue(entry.value)}
                           </div>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

          {Object.keys(combinedToolSummary).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tool Execution Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="border px-3 py-2 text-left">Tool</th>
                        <th className="border px-3 py-2 text-left">Preprocessing</th>
                        <th className="border px-3 py-2 text-left">Processing</th>
                        <th className="border px-3 py-2 text-left">R2 Evaluation</th>
                        <th className="border px-3 py-2 text-left">AUC Evaluation</th>
                        <th className="border px-3 py-2 text-left">Messages</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(orderedTools.length > 0
                        ? orderedTools
                        : Object.keys(combinedToolSummary)
                      ).map((toolId) => {
                        const summary = combinedToolSummary[toolId] || {}
                        return (
                          <tr key={toolId} className="odd:bg-muted/10">
                            <td className="border px-3 py-2">
                              {formatToolDisplay(toolId)}
                            </td>
                            <td className="border px-3 py-2">
                              {renderStageBadge(summary.preprocessing)}
                            </td>
                            <td className="border px-3 py-2">
                              {renderStageBadge(summary.processing)}
                            </td>
                            <td className="border px-3 py-2">
                              {renderStageBadge(summary.evaluation_r2)}
                            </td>
                            <td className="border px-3 py-2">
                              {renderStageBadge(summary.evaluation_auc)}
                            </td>
                            <td className="border px-3 py-2">
                              {summary.messages ? (
                                <span className="break-words">{summary.messages}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {linksByTool.shared.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Shared Downloads</CardTitle>
              </CardHeader>
              <CardContent>
                <LinkScroller items={linksByTool.shared} />
              </CardContent>
            </Card>
          )}

          {plotsByTool.shared.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Shared Plots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {plotsByTool.shared.map((plot) => (
                    <button
                      key={plot.path}
                      type="button"
                      className="overflow-hidden rounded-lg border text-left transition hover:shadow"
                      onClick={() =>
                        setPreviewItem({
                          name: plot.name,
                          url: resolveUrl(plot.url) || fileEndpointFromPath(plot.path),
                          contentType: plot.content_type,
                        })
                      }
                    >
                      <div className="flex items-center justify-between border-b px-4 py-2">
                        <div className="truncate text-sm font-medium">
                          {formatLabel(plot.name)}
                        </div>
                        {plot.evaluation_type && (
                          <Badge
                            variant="outline"
                            className="text-xs uppercase"
                          >
                            {plot.evaluation_type}
                          </Badge>
                        )}
                      </div>
                      <div className="relative aspect-[4/3] bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveUrl(plot.url) || fileEndpointFromPath(plot.path)}
                          alt={plot.name}
                          className="absolute inset-0 h-full w-full object-contain"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          {orderedTools.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No tool-specific results yet</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Configure and run a benchmarking job to see per-tool summaries
                here.
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue={orderedTools[0]} className="space-y-4">
              <TabsList className={tabListClass}>
                {orderedTools.map((toolId) => (
                  <TabsTrigger
                    key={toolId}
                    value={toolId}
                    className={`${tabTriggerClass} data-[state=active]:bg-primary/60 data-[state=active]:shadow`}
                  >
                    {formatToolDisplay(toolId)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {orderedTools.map((toolId) => {
                const metrics = summaryMetricsByTool[toolId] ?? {}
                const tableRows = summaryTableByTool[toolId] ?? []
                const evaluation = evaluationByTool[toolId] ?? {
                  r2: [],
                  auc: [],
                }
                const toolPlots = plotsByTool.perTool[toolId] ?? []
                const toolLinks = linksByTool.perTool[toolId] ?? []
                const evaluationType = getEvaluationType(toolId)
                const hasSummaryTable =
                  tableRows.length > 0 && summaryColumns.length > 0
                const hasR2 =
                  metrics.r2 !== undefined &&
                  metrics.r2 !== null &&
                  `${metrics.r2}` !== ""
                const hasAuc =
                  metrics.auc !== undefined &&
                  metrics.auc !== null &&
                  `${metrics.auc}` !== ""

                return (
                  <TabsContent
                    key={toolId}
                    value={toolId}
                    className="space-y-6"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex flex-wrap items-center gap-3">
                          <span>{formatToolDisplay(toolId)} Overview</span>
                          {evaluationType && (
                            <Badge variant="outline" className="uppercase">
                              {evaluationType}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="rounded border p-4">
                            <div className="text-xs uppercase text-muted-foreground">
                              R2
                            </div>
                            <div className="break-all text-lg font-semibold">
                              {hasR2 ? metrics.r2 : "—"}
                            </div>
                          </div>
                          <div className="rounded border p-4">
                            <div className="text-xs uppercase text-muted-foreground">
                              AUC
                            </div>
                            <div className="break-all text-lg font-semibold">
                              {hasAuc ? metrics.auc : "—"}
                            </div>
                          </div>
                          {statusDetails?.progress?.timestamp && (
                            <div className="rounded border p-4">
                              <div className="text-xs uppercase text-muted-foreground">
                                Updated
                              </div>
                              <div className="text-lg font-semibold">
                                {new Date(
                                  statusDetails.progress.timestamp
                                ).toLocaleString()}
                              </div>
                            </div>
                          )}
                        </div>

                        {toolLinks.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium">
                              Quick Downloads
                            </div>
                            <LinkScroller items={toolLinks} />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {hasSummaryTable && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Summary Table</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="w-full overflow-x-auto">
                            <table className="min-w-full border text-sm">
                              <thead className="bg-muted/40">
                                <tr>
                                  {summaryColumns.map((col) => (
                                    <th
                                      key={col}
                                      className="border px-3 py-2 text-left font-medium"
                                    >
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {tableRows.map((row, idx) => (
                                  <tr key={idx} className="odd:bg-muted/10">
                                    {summaryColumns.map((col) => (
                                      <td
                                        key={col}
                                        className="border px-3 py-2"
                                      >
                                        {String(row[col] ?? "")}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {evaluation.r2.length > 0 &&
                      evaluation.r2.map((section) => (
                        <Card key={`r2-${section.key}`}>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                R2
                              </Badge>
                              <span>{formatLabel(section.label)}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="w-full overflow-x-auto">
                              <table className="min-w-full border text-sm">
                                <thead className="bg-muted/40">
                                  <tr>
                                    {section.columns.map((col) => (
                                      <th
                                        key={col}
                                        className="border px-3 py-2 text-left font-medium"
                                      >
                                        {col}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {section.rows.map((row, idx) => (
                                    <tr key={idx} className="odd:bg-muted/10">
                                      {section.columns.map((col) => (
                                        <td
                                          key={col}
                                          className="border px-3 py-2"
                                        >
                                          {String(row[col] ?? "")}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                    {evaluation.auc.length > 0 &&
                      evaluation.auc.map((section) => (
                        <Card key={`auc-${section.key}`}>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                AUC
                              </Badge>
                              <span>{formatLabel(section.label)}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="w-full overflow-x-auto">
                              <table className="min-w-full border text-sm">
                                <thead className="bg-muted/40">
                                  <tr>
                                    {section.columns.map((col) => (
                                      <th
                                        key={col}
                                        className="border px-3 py-2 text-left font-medium"
                                      >
                                        {col}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {section.rows.map((row, idx) => (
                                    <tr key={idx} className="odd:bg-muted/10">
                                      {section.columns.map((col) => (
                                        <td
                                          key={col}
                                          className="border px-3 py-2"
                                        >
                                          {String(row[col] ?? "")}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                    {toolPlots.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Plots</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {toolPlots.map((plot) => (
                              <button
                                key={plot.path}
                                type="button"
                                className="overflow-hidden rounded-lg border text-left transition hover:shadow"
                                onClick={() =>
                                  setPreviewItem({
                                    name: plot.name,
                                    url: resolveUrl(plot.url) || fileEndpointFromPath(plot.path),
                                    contentType: plot.content_type,
                                  })
                                }
                              >
                                <div className="flex items-center justify-between border-b px-4 py-2">
                                  <div className="truncate text-sm font-medium">
                                    {formatLabel(plot.name)}
                                  </div>
                                  {plot.evaluation_type && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs uppercase"
                                    >
                                      {plot.evaluation_type}
                                    </Badge>
                                  )}
                                </div>
                                <div className="relative aspect-[4/3] bg-muted">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={resolveUrl(plot.url) || fileEndpointFromPath(plot.path)}
                                    alt={plot.name}
                                    className="absolute inset-0 h-full w-full object-contain"
                                  />
                                </div>
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                )
              })}
            </Tabs>
          )}
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle>Artifacts</CardTitle>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={filesQuery}
                  onChange={(e) => setFilesQuery(e.target.value)}
                  placeholder="Search files by name, type, or path"
                  className="max-w-md"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading.manifest ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading
                  manifest...
                </div>
              ) : hasPerToolArtifacts || artifactsByTool.shared.length > 0 ? (
                <>
                  {orderedTools.map((toolId) => {
                    const toolArtifacts = filteredArtifactsByTool.perTool[toolId] ?? []
                    if (toolArtifacts.length === 0) return null
                    return (
                      <div key={toolId} className="space-y-2">
                        <div className="text-sm font-semibold">
                          {formatToolDisplay(toolId)}
                        </div>
                        <div className="max-h-64 w-full overflow-x-auto overflow-y-auto">
                          <table className="min-w-full border text-sm">
                            <thead className="bg-muted/40">
                              <tr>
                                <th className="border px-3 py-2 text-left">
                                  Name
                                </th>
                                <th className="border px-3 py-2 text-left">
                                  Type
                                </th>
                                <th className="border px-3 py-2 text-left">
                                  Size (bytes)
                                </th>
                                <th className="border px-3 py-2 text-left">
                                  Last modified
                                </th>
                                <th className="border px-3 py-2 text-left">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {toolArtifacts.map((artifact) => (
                                <tr
                                  key={artifact.path}
                                  className="odd:bg-muted/10"
                                >
                                  <td className="border px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      {artifact.content_type?.startsWith(
                                        "image/"
                                      ) ? (
                                        <ImageIcon className="h-4 w-4" />
                                      ) : (
                                        <FileTextIcon className="h-4 w-4" />
                                      )}
                                      <span
                                        className="truncate"
                                        title={artifact.name}
                                      >
                                        {artifact.name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="border px-3 py-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {artifact.content_type || ""}
                                    </Badge>
                                  </td>
                                  <td className="border px-3 py-2">
                                    {artifact.size}
                                  </td>
                                  <td className="border px-3 py-2">
                                    {artifact.last_modified
                                      ? new Date(
                                          artifact.last_modified
                                        ).toLocaleString()
                                      : ""}
                                  </td>
                                  <td className="border px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={
                                          !(
                                            artifact.is_previewable ||
                                            artifact.content_type?.startsWith(
                                              "image/"
                                            )
                                          )
                                        }
                                        onClick={() => {
                                          if (
                                            artifact.is_previewable ||
                                            artifact.content_type?.startsWith(
                                              "image/"
                                            )
                                          ) {
                                            openArtifactPreview(artifact)
                                          }
                                        }}
                                      >
                                        Open
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          downloadArtifact(artifact)
                                        }
                                      >
                                        <Download className="mr-2 h-4 w-4" />{" "}
                                        Download
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}

                  {filteredArtifactsByTool.shared.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">Shared</div>
                      <div className="max-h-64 w-full overflow-x-auto overflow-y-auto">
                        <table className="min-w-full border text-sm">
                          <thead className="bg-muted/40">
                            <tr>
                              <th className="border px-3 py-2 text-left">
                                Name
                              </th>
                              <th className="border px-3 py-2 text-left">
                                Type
                              </th>
                              <th className="border px-3 py-2 text-left">
                                Size (bytes)
                              </th>
                              <th className="border px-3 py-2 text-left">
                                Last modified
                              </th>
                              <th className="border px-3 py-2 text-left">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredArtifactsByTool.shared.map((artifact) => (
                              <tr
                                key={artifact.path}
                                className="odd:bg-muted/10"
                              >
                                <td className="border px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    {artifact.content_type?.startsWith(
                                      "image/"
                                    ) ? (
                                      <ImageIcon className="h-4 w-4" />
                                    ) : (
                                      <FileTextIcon className="h-4 w-4" />
                                    )}
                                    <span
                                      className="truncate"
                                      title={artifact.name}
                                    >
                                      {artifact.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="border px-3 py-2">
                                  <Badge variant="outline" className="text-xs">
                                    {artifact.content_type || ""}
                                  </Badge>
                                </td>
                                <td className="border px-3 py-2">
                                  {artifact.size}
                                </td>
                                <td className="border px-3 py-2">
                                  {artifact.last_modified
                                    ? new Date(
                                        artifact.last_modified
                                      ).toLocaleString()
                                    : ""}
                                </td>
                                <td className="border px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={
                                        !(
                                          artifact.is_previewable ||
                                          artifact.content_type?.startsWith(
                                            "image/"
                                          )
                                        )
                                      }
                                      onClick={() => {
                                        if (
                                          artifact.is_previewable ||
                                          artifact.content_type?.startsWith(
                                            "image/"
                                          )
                                        ) {
                                          openArtifactPreview(artifact)
                                        }
                                      }}
                                    >
                                      Open
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        downloadArtifact(artifact)
                                      }
                                    >
                                      <Download className="mr-2 h-4 w-4" />{" "}
                                      Download
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {filesQuery && !hasFilteredPerToolArtifacts && filteredArtifactsByTool.shared.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      No files match “{filesQuery}”.
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No artifacts found.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Preview Dialog */}
      <Dialog
        open={!!previewItem}
        onOpenChange={(open) => !open && setPreviewItem(null)}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="truncate">
              {previewItem?.name || "Preview"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-auto">
            {previewItem &&
            isImageLike(
              previewItem.contentType,
              previewItem.name || previewItem.url
            ) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewItem.url}
                alt={previewItem.name}
                className="mx-auto max-h-[75vh] w-full bg-muted object-contain"
              />
            ) : previewItem ? (
              <div className="h-[70vh] w-full">
                <iframe
                  src={previewItem.url}
                  title={previewItem.name}
                  className="h-full w-full rounded-md border"
                />
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
