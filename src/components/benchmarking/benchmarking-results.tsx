"use client"

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import axios from "axios"
import { BENCHMARK_CONFIG, getBenchmarkJobStatusUrl } from "@/lib/config"
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

export function BenchmarkingResults({
  jobId,
  onBack,
}: BenchmarkingResultsProps) {
  const [manifest, setManifest] = useState<ResultsManifest | null>(null)
  const [prsSummary, setPrsSummary] = useState<PRSSummaryResponse | null>(null)
  const [evalR2, setEvalR2] = useState<EvalR2Response | null>(null)
  const [evalAUC, setEvalAUC] = useState<EvalR2Response | null>(null)
  const [plots, setPlots] = useState<ManifestPlot[] | null>(null)
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

  // Preview modal state
  const [previewItem, setPreviewItem] = useState<{
    name: string
    url: string
    contentType?: string
  } | null>(null)

  // Ref for raw files slider
  const rawFilesRef = useRef<HTMLDivElement>(null)

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
      evaluations: `${base}/${jobId}/results/evaluations`,
      archive: `${base}/${jobId}/results/archive.zip`,
    }
  }, [jobId])

  // Ensure URLs returned by backend (which may be relative) are resolved against the backend base URL
  const resolveUrl = (u?: string) => {
    if (!u) return ""
    try {
      return new URL(u, BENCHMARK_CONFIG.BASE_URL).toString()
    } catch {
      return u
    }
  }

  const backendOrigin = useMemo(() => {
    try {
      return new URL(BENCHMARK_CONFIG.BASE_URL).origin
    } catch {
      return ""
    }
  }, [])

  const toBackendOrigin = (u?: string) => {
    if (!u) return ""
    try {
      const parsed = new URL(u)
      return `${backendOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`
    } catch {
      // if it's relative, fall back to resolveUrl
      return resolveUrl(u)
    }
  }

  // Build a file URL from the jobId and file path (preferred over trusting provided absolute URLs)
  const fileUrlFromPath = (path: string) => {
    const p = encodeURIComponent(path)
    return `${BENCHMARK_CONFIG.BASE_URL}/${jobId}/results/file?path=${p}`
  }

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
        if (log) console.log("[Benchmark] Status response:", res.data)
        setBackendStatus(status)
      } catch (e: any) {
        if (log)
          console.error(
            "[Benchmark] Status error:",
            e?.response?.data || e?.message || e
          )
        setBackendStatus(null)
      }
    },
    [jobId]
  )

  const fetchAll = async (log?: boolean) => {
    if (!jobId) return
    setLoading({ manifest: true, summary: true, eval: true, evalAuc: true })
    setErrors({})
    fetchStatus(log)
    try {
      const res = await axios.get<ResultsManifest>(endpoints.manifest)
      if (log) console.log("[Benchmark] Manifest response:", res.data)
      setManifest(res.data)
    } catch (e: any) {
      if (log)
        console.error(
          "[Benchmark] Manifest error:",
          e?.response?.data || e?.message || e
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
      if (log) console.log("[Benchmark] Plots response:", res.data)
      setPlots(res.data?.plots ?? null)
    } catch (e: any) {
      if (log)
        console.error(
          "[Benchmark] Plots error:",
          e?.response?.data || e?.message || e
        )
      // no error surfaced; we will rely on manifest.plots if present
    }

    try {
      const res = await axios.get<PRSSummaryResponse>(endpoints.prsSummary)
      if (log) console.log("[Benchmark] PRS summary response:", res.data)
      setPrsSummary(res.data)
    } catch (e: any) {
      if (log)
        console.error(
          "[Benchmark] PRS summary error:",
          e?.response?.data || e?.message || e
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
      if (log) console.log("[Benchmark] R2 tables response:", res.data)
      setEvalR2(res.data)
    } catch (e: any) {
      if (log)
        console.error(
          "[Benchmark] R2 tables error:",
          e?.response?.data || e?.message || e
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
      if (log) console.log("[Benchmark] AUC tables response:", res.data)
      setEvalAUC(res.data)
    } catch (e: any) {
      if (log)
        console.error(
          "[Benchmark] AUC tables error:",
          e?.response?.data || e?.message || e
        )
      setErrors((prev) => ({
        ...prev,
        evalAuc: e?.message || "Failed to load AUC evaluation tables",
      }))
    } finally {
      setLoading((prev) => ({ ...prev, evalAuc: false }))
    }
  }

  useEffect(() => {
    // reset completion refresh guard on job change
    hasRefreshedOnCompletion.current = false
    fetchAll() // silent on initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  // Light polling to keep status fresh until a terminal state
  useEffect(() => {
    if (!jobId) return
    const terminal = new Set(["completed", "failed"]) // backend status values
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
  }, [backendStatus, jobId])

  const allPlots = useMemo(() => {
    const fromManifest = manifest?.plots ?? []
    if (plots && plots.length > 0) return plots
    return fromManifest
  }, [manifest, plots])

  const jobStatus = useMemo<{
    label: string
    className: string
    Icon: React.ElementType
  }>(() => {
    const s = (backendStatus || "").toLowerCase()
    if (!s) {
      if (loading.manifest || loading.summary || loading.eval) {
        return {
          label: "Running",
          className: "bg-amber-100 text-amber-800 border-amber-200",
          Icon: Clock,
        }
      }
      return {
        label: "Unknown",
        className: "bg-gray-100 text-gray-800 border-gray-200",
        Icon: AlertCircle,
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
          label: "Unknown",
          className: "bg-gray-100 text-gray-800 border-gray-200",
          Icon: AlertCircle,
        }
    }
  }, [backendStatus, loading])

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

      {/* Tabs */}
      <Tabs
        defaultValue="overview"
        className="w-full min-w-0 overflow-x-hidden overflow-y-hidden"
      >
        <TabsList className="no-scrollbar grid w-full grid-cols-4 overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="prs">PRS Summary</TabsTrigger>
          <TabsTrigger value="eval">Evaluation</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent
          value="overview"
          className="w-full min-w-0 space-y-4 overflow-x-hidden"
        >
          {prsSummary?.summary && (
            <Card>
              <CardHeader>
                <CardTitle>Summary Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`grid grid-cols-1 gap-4 ${
                    prsSummary.summary.r2 !== undefined &&
                    prsSummary.summary.r2 !== null &&
                    `${prsSummary.summary.r2}` !== "" &&
                    prsSummary.summary.auc !== undefined &&
                    prsSummary.summary.auc !== null &&
                    `${prsSummary.summary.auc}` !== ""
                      ? "sm:grid-cols-3"
                      : (prsSummary.summary.r2 !== undefined &&
                            prsSummary.summary.r2 !== null &&
                            `${prsSummary.summary.r2}` !== "") ||
                          (prsSummary.summary.auc !== undefined &&
                            prsSummary.summary.auc !== null &&
                            `${prsSummary.summary.auc}` !== "")
                        ? "sm:grid-cols-2"
                        : "sm:grid-cols-1"
                  }`}
                >
                  <div className="min-w-0 rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Tool</div>
                    <div className="break-words text-xl font-semibold">
                      {prsSummary.summary.tool || "-"}
                    </div>
                  </div>
                  {prsSummary.summary.r2 !== undefined &&
                    prsSummary.summary.r2 !== null &&
                    `${prsSummary.summary.r2}` !== "" && (
                      <div className="min-w-0 rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">R2</div>
                        <div className="break-words text-xl font-semibold">
                          {prsSummary.summary.r2}
                        </div>
                      </div>
                    )}
                  {prsSummary.summary.auc !== undefined &&
                    prsSummary.summary.auc !== null &&
                    `${prsSummary.summary.auc}` !== "" && (
                      <div className="min-w-0 rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">AUC</div>
                        <div className="break-words text-xl font-semibold">
                          {prsSummary.summary.auc}
                        </div>
                      </div>
                    )}
                </div>
                {prsSummary.links && (
                  <div className="mt-6 overflow-x-hidden">
                    <div className="mb-2 text-sm font-medium">Raw files</div>
                    <div className="flex w-full min-w-0 max-w-full items-center gap-2 overflow-x-hidden">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          rawFilesRef.current?.scrollBy({
                            left: -400,
                            behavior: "smooth",
                          })
                        }
                        aria-label="Scroll left"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <div
                        ref={rawFilesRef}
                        className="no-scrollbar relative w-full min-w-0 max-w-full flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain"
                      >
                        <div className="inline-flex gap-2 whitespace-nowrap pr-4">
                          {Object.entries(prsSummary.links)
                            .flatMap(([tool, files]) =>
                              Object.entries(files).map(([name, url]) => ({
                                tool,
                                name,
                                url,
                              }))
                            )
                            .filter(({ name, url }) => {
                              // hide logs and image-like files (plots are shown below)
                              if (isLogLike(name) || isLogLike(url))
                                return false
                              if (
                                isImageLike(undefined, name) ||
                                isImageLike(undefined, url)
                              )
                                return false
                              return true
                            })
                            .map(({ tool, name, url }) => (
                              <Button
                                key={`${tool}-${name}`}
                                variant="outline"
                                size="sm"
                                className="shrink-0"
                                onClick={() =>
                                  setPreviewItem({
                                    name: `${formatLabel(tool)}: ${formatLabel(name)}`,
                                    url: toBackendOrigin(url),
                                  })
                                }
                              >
                                <LinkIcon className="mr-2 h-4 w-4" />{" "}
                                {formatLabel(tool)}: {formatLabel(name)}
                              </Button>
                            ))}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          rawFilesRef.current?.scrollBy({
                            left: 400,
                            behavior: "smooth",
                          })
                        }
                        aria-label="Scroll right"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Remove incorrect inline useMemo and render when computed plots available */}
          {allPlots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Plots</CardTitle>
              </CardHeader>
              <CardContent className="w-full">
                <div className="max-h-[40rem] w-full overflow-y-auto">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {allPlots.map((p) => {
                      const clickable =
                        isImageLike(p.content_type, p.name) || p.is_previewable
                      const commonHandlers = clickable
                        ? {
                            onClick: () =>
                              setPreviewItem({
                                name: p.name,
                                url: fileUrlFromPath(p.path),
                                contentType: p.content_type || "image/*",
                              }),
                            onKeyDown: (
                              e: React.KeyboardEvent<HTMLDivElement>
                            ) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                setPreviewItem({
                                  name: p.name,
                                  url: fileUrlFromPath(p.path),
                                  contentType: p.content_type || "image/*",
                                })
                              }
                            },
                          }
                        : {}
                      return (
                        <div
                          key={p.path}
                          className={`overflow-hidden rounded-lg border ${
                            clickable
                              ? "cursor-pointer transition focus-within:ring-2 focus-within:ring-ring hover:shadow-sm"
                              : "cursor-not-allowed opacity-60"
                          }`}
                          role={clickable ? "button" : undefined}
                          tabIndex={clickable ? 0 : -1}
                          aria-label={`Open ${p.name}`}
                          aria-disabled={!clickable}
                          {...commonHandlers}
                        >
                          <div className="flex items-center justify-between border-b p-2 text-sm">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <ImageIcon className="h-4 w-4 shrink-0" />
                              <span
                                className="truncate"
                                title={`${p.name}${p.evaluation_type ? ` (${p.evaluation_type})` : ""}`}
                              >
                                {p.name}
                                {p.evaluation_type
                                  ? ` (${p.evaluation_type})`
                                  : ""}
                              </span>
                            </div>
                          </div>
                          {/* Image wrapper with consistent aspect ratio to avoid squished look */}
                          <div className="relative aspect-[4/3] bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={fileUrlFromPath(p.path)}
                              alt={p.name}
                              className="absolute inset-0 h-full w-full object-contain"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PRS Summary */}
        <TabsContent value="prs">
          <Card>
            <CardHeader>
              <CardTitle>PRS Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {loading.summary ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading PRS
                  summary...
                </div>
              ) : prsSummary?.table ? (
                <div className="w-full overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        {prsSummary.table.columns.map((col) => (
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
                      {prsSummary.table.rows.map((row, idx) => (
                        <tr key={idx} className="odd:bg-muted/10">
                          {prsSummary.table!.columns.map((col) => (
                            <td key={col} className="border px-3 py-2">
                              {String(row[col] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No PRS summary available.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evaluation (R2 and AUC together) */}
        <TabsContent value="eval" className="space-y-6">
          {/* R2 Section */}
          {loading.eval ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading R2 tables
                </CardTitle>
              </CardHeader>
            </Card>
          ) : evalR2?.tables && Object.keys(evalR2.tables).length > 0 ? (
            Object.entries(evalR2.tables).map(([tool, table]) => (
              <Card key={`r2-${tool}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {tool}
                    </Badge>
                    <span>R2 Evaluation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-x-auto">
                    <table className="min-w-full border text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          {table.columns.map((col) => (
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
                        {table.rows.map((row, idx) => (
                          <tr key={idx} className="odd:bg-muted/10">
                            {table.columns.map((col) => (
                              <td key={col} className="border px-3 py-2">
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
            ))
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>R2 Evaluation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  No R2 results found.
                </div>
              </CardContent>
            </Card>
          )}

          {/* AUC Section */}
          {loading.evalAuc ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading AUC
                  tables
                </CardTitle>
              </CardHeader>
            </Card>
          ) : evalAUC?.tables && Object.keys(evalAUC.tables).length > 0 ? (
            Object.entries(evalAUC.tables).map(([tool, table]) => (
              <Card key={`auc-${tool}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {tool}
                    </Badge>
                    <span>AUC Evaluation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-x-auto">
                    <table className="min-w-full border text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          {table.columns.map((col) => (
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
                        {table.rows.map((row, idx) => (
                          <tr key={idx} className="odd:bg-muted/10">
                            {table.columns.map((col) => (
                              <td key={col} className="border px-3 py-2">
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
            ))
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>AUC Evaluation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  No AUC results found.
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Files */}
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>Artifacts</CardTitle>
            </CardHeader>
            <CardContent>
              {loading.manifest ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading
                  manifest...
                </div>
              ) : manifest?.artifacts && manifest.artifacts.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="border px-3 py-2 text-left">Name</th>
                        <th className="border px-3 py-2 text-left">Type</th>
                        <th className="border px-3 py-2 text-left">
                          Size (bytes)
                        </th>
                        <th className="border px-3 py-2 text-left">
                          Last modified
                        </th>
                        <th className="border px-3 py-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manifest.artifacts.map((a) => (
                        <tr key={a.path} className="odd:bg-muted/10">
                          <td className="border px-3 py-2">
                            <div className="flex items-center gap-2">
                              {a.content_type?.startsWith("image/") ? (
                                <ImageIcon className="h-4 w-4" />
                              ) : (
                                <FileTextIcon className="h-4 w-4" />
                              )}
                              <span className="truncate" title={a.name}>
                                {a.name}
                              </span>
                            </div>
                          </td>
                          <td className="border px-3 py-2">
                            <Badge variant="outline" className="text-xs">
                              {a.content_type || ""}
                            </Badge>
                          </td>
                          <td className="border px-3 py-2">{a.size}</td>
                          <td className="border px-3 py-2">
                            {a.last_modified
                              ? new Date(a.last_modified).toLocaleString()
                              : ""}
                          </td>
                          <td className="border px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={
                                  !(
                                    a.is_previewable ||
                                    a.content_type?.startsWith("image/")
                                  )
                                }
                                onClick={() => {
                                  if (
                                    a.is_previewable ||
                                    a.content_type?.startsWith("image/")
                                  )
                                    setPreviewItem({
                                      name: a.name,
                                      url: fileUrlFromPath(a.path),
                                      contentType: a.content_type,
                                    })
                                }}
                              >
                                Open
                              </Button>
                              <a
                                href={
                                  fileUrlFromPath(a.path) +
                                  (fileUrlFromPath(a.path).includes("?")
                                    ? "&"
                                    : "?") +
                                  "download=true"
                                }
                                download
                              >
                                <Button size="sm" variant="ghost">
                                  <Download className="mr-2 h-4 w-4" /> Download
                                </Button>
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
