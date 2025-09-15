"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react"
import axios from "axios"
import { BENCHMARK_CONFIG } from "@/lib/config"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Image as ImageIcon, FileText as FileTextIcon, Download, RefreshCw, Link as LinkIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
}

interface ManifestPlot {
  name: string
  path: string
  url: string
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
  tables?: Record<string, { columns: string[]; rows: Array<Record<string, string | number>> }>
}

export function BenchmarkingResults({
  jobId,
  onBack,
}: BenchmarkingResultsProps) {
  const [manifest, setManifest] = useState<ResultsManifest | null>(null)
  const [prsSummary, setPrsSummary] = useState<PRSSummaryResponse | null>(null)
  const [evalR2, setEvalR2] = useState<EvalR2Response | null>(null)

  const [loading, setLoading] = useState({ manifest: true, summary: true, eval: true })
  const [errors, setErrors] = useState<{ manifest?: string; summary?: string; eval?: string }>({})

  // Preview modal state
  const [previewItem, setPreviewItem] = useState<{ name: string; url: string; contentType?: string } | null>(null)

  const endpoints = useMemo(() => {
    const base = BENCHMARK_CONFIG.BASE_URL
    return {
      manifest: `${base}/${jobId}/results/manifest`,
      prsSummary: `${base}/${jobId}/results/prs-summary`,
      evalR2: `${base}/${jobId}/results/eval-r2`,
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
    return [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp"].some((ext) => lower.endsWith(ext))
  }

  const fetchAll = async () => {
    if (!jobId) return
    setLoading({ manifest: true, summary: true, eval: true })
    setErrors({})
    try {
      const res = await axios.get<ResultsManifest>(endpoints.manifest)
      setManifest(res.data)
    } catch (e: any) {
      setErrors((prev) => ({ ...prev, manifest: e?.message || "Failed to load manifest" }))
    } finally {
      setLoading((prev) => ({ ...prev, manifest: false }))
    }

    try {
      const res = await axios.get<PRSSummaryResponse>(endpoints.prsSummary)
      setPrsSummary(res.data)
    } catch (e: any) {
      setErrors((prev) => ({ ...prev, summary: e?.message || "Failed to load PRS summary" }))
    } finally {
      setLoading((prev) => ({ ...prev, summary: false }))
    }

    try {
      const res = await axios.get<EvalR2Response>(endpoints.evalR2)
      setEvalR2(res.data)
    } catch (e: any) {
      setErrors((prev) => ({ ...prev, eval: e?.message || "Failed to load evaluation tables" }))
    } finally {
      setLoading((prev) => ({ ...prev, eval: false }))
    }
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  return (
    <div className="space-y-6">
      {/* Top summary status for loading/errors */}
      {(loading.manifest || loading.summary || loading.eval) && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Fetching results (manifest, PRS summary, evaluation)...
        </div>
      )}
      {Object.values(errors).some(Boolean) && (
        <div className="text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> Some sections failed to load. Try Refresh. We will polish messages later.
        </div>
      )}

      {/* Header / Action bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="mb-1 text-xl font-semibold">PRS Benchmarking Results</h3>
          <p className="text-sm text-muted-foreground">Job ID: <span className="font-mono">{jobId || "-"}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <a href={resolveUrl(endpoints.archive)} download>
            <Button variant="default">
              <Download className="mr-2 h-4 w-4" /> Export all (zip)
            </Button>
          </a>
          <Button variant="outline" onClick={fetchAll}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          {onBack && (
            <Button variant="ghost" onClick={onBack}>Back</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="prs">PRS Summary</TabsTrigger>
          <TabsTrigger value="eval">Evaluation R2</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          {prsSummary?.summary && (
            <Card>
              <CardHeader>
                <CardTitle>Summary Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Tool</div>
                    <div className="text-xl font-semibold">{prsSummary.summary.tool || "-"}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">R2</div>
                    <div className="text-xl font-semibold">{prsSummary.summary.r2 ?? ""}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">AUC</div>
                    <div className="text-xl font-semibold">{prsSummary.summary.auc ?? ""}</div>
                  </div>
                </div>
                {prsSummary.links && (
                  <div className="mt-6">
                    <div className="mb-2 text-sm font-medium">Raw files</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(prsSummary.links).flatMap(([tool, files]) =>
                        Object.entries(files).map(([name, url]) => (
                          <Button
                            key={`${tool}-${name}`}
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewItem({ name: `${tool}: ${name}`, url: toBackendOrigin(url) })}
                          >
                            <LinkIcon className="mr-2 h-4 w-4" /> {tool}: {name}
                          </Button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {manifest?.plots && manifest.plots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Plots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {manifest.plots.map((p) => (
                    <div
                      key={p.path}
                      className="overflow-hidden rounded-lg border cursor-pointer transition hover:shadow-sm focus-within:ring-2 focus-within:ring-ring"
                      role="button"
                      tabIndex={0}
                      aria-label={`Open ${p.name}`}
                      onClick={() => setPreviewItem({ name: p.name, url: fileUrlFromPath(p.path), contentType: "image/*" })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setPreviewItem({ name: p.name, url: fileUrlFromPath(p.path), contentType: "image/*" })
                        }
                      }}
                    >
                      <div className="flex items-center justify-between border-b p-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <ImageIcon className="h-4 w-4 shrink-0" />
                          <span className="truncate" title={p.name}>{p.name}</span>
                        </div>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fileUrlFromPath(p.path)} alt={p.name} className="h-64 w-full object-contain bg-muted" />
                    </div>
                  ))}
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading PRS summary...
                </div>
              ) : prsSummary?.table ? (
                <div className="w-full overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        {prsSummary.table.columns.map((col) => (
                          <th key={col} className="border px-3 py-2 text-left font-medium">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {prsSummary.table.rows.map((row, idx) => (
                        <tr key={idx} className="odd:bg-muted/10">
                          {prsSummary.table!.columns.map((col) => (
                            <td key={col} className="border px-3 py-2">{String(row[col] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No PRS summary available.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evaluation R2 */}
        <TabsContent value="eval" className="space-y-4">
          {loading.eval ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading evaluation tables
                </CardTitle>
              </CardHeader>
            </Card>
          ) : evalR2?.tables && Object.keys(evalR2.tables).length > 0 ? (
            Object.entries(evalR2.tables).map(([tool, table]) => (
              <Card key={tool}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{tool}</Badge>
                    <span>Evaluation R2</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-x-auto">
                    <table className="min-w-full border text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          {table.columns.map((col) => (
                            <th key={col} className="border px-3 py-2 text-left font-medium">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row, idx) => (
                          <tr key={idx} className="odd:bg-muted/10">
                            {table.columns.map((col) => (
                              <td key={col} className="border px-3 py-2">{String(row[col] ?? "")}</td>
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
                <CardTitle>Evaluation R2</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">No evaluation results found.</div>
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading manifest...
                </div>
              ) : manifest?.artifacts && manifest.artifacts.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="border px-3 py-2 text-left">Name</th>
                        <th className="border px-3 py-2 text-left">Type</th>
                        <th className="border px-3 py-2 text-left">Size (bytes)</th>
                        <th className="border px-3 py-2 text-left">Last modified</th>
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
                              <span className="truncate" title={a.name}>{a.name}</span>
                            </div>
                          </td>
                          <td className="border px-3 py-2">
                            <Badge variant="outline" className="text-xs">{a.content_type || ""}</Badge>
                          </td>
                          <td className="border px-3 py-2">{a.size}</td>
                          <td className="border px-3 py-2">{a.last_modified ? new Date(a.last_modified).toLocaleString() : ""}</td>
                          <td className="border px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => setPreviewItem({ name: a.name, url: fileUrlFromPath(a.path), contentType: a.content_type })}>Open</Button>
                              <a href={fileUrlFromPath(a.path) + (fileUrlFromPath(a.path).includes("?") ? "&" : "?") + "download=true"} download>
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
                <div className="text-sm text-muted-foreground">No artifacts found.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="truncate">{previewItem?.name || "Preview"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-auto">
            {previewItem && isImageLike(previewItem.contentType, previewItem.name || previewItem.url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewItem.url}
                alt={previewItem.name}
                className="mx-auto max-h-[75vh] w-full object-contain bg-muted"
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
