"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  ChevronLeft,
} from "lucide-react"
import { toast } from "react-hot-toast"
import benchmarkApi from "@/lib/benchmark-api"
import { getBenchmarkMyJobsUrl } from "@/lib/config"
import { useBenchmarkAuthStore } from "@/stores/benchmark-auth-store"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"
import { BenchmarkingResults } from "@/components/benchmarking/benchmarking-results"
import type { JobSummary } from "@/types/benchmarking"

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusBadge(status: string) {
  const s = status.toLowerCase()
  if (s === "completed")
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle className="mr-1 h-3 w-3" />
        Completed
      </Badge>
    )
  if (s === "failed")
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        <XCircle className="mr-1 h-3 w-3" />
        Failed
      </Badge>
    )
  if (s === "processing" || s === "running")
    return (
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        Processing
      </Badge>
    )
  if (s === "extracting")
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        Extracting
      </Badge>
    )
  if (s === "configured")
    return (
      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
        <Clock className="mr-1 h-3 w-3" />
        Configured
      </Badge>
    )
  if (s === "uploaded")
    return (
      <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400">
        <Clock className="mr-1 h-3 w-3" />
        Uploaded
      </Badge>
    )
  return (
    <Badge variant="outline">
      <Clock className="mr-1 h-3 w-3" />
      {status}
    </Badge>
  )
}

/** Whether this job has results to view inline */
function hasResults(status: string): boolean {
  const s = status.toLowerCase()
  return s === "completed" || s === "failed"
}

/** Map a backend status to the appropriate workflow step for in-progress jobs */
function stepForStatus(status: string): string {
  const s = status.toLowerCase()
  if (s === "processing" || s === "running" || s === "extracting" || s === "configured")
    return "job-status"
  if (s === "uploaded") return "populations"
  return "datasets"
}

// ─── Component ────────────────────────────────────────────────────────────

export function MyJobs() {
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedJob, setExpandedJob] = useState<JobSummary | null>(null)

  const isAuthenticated = useBenchmarkAuthStore((s) => s.isAuthenticated)
  const { setJobId, setActiveStep, setJobStatus, addCompletedStep } =
    useBenchmarkingStore()

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await benchmarkApi.get<JobSummary[]>(getBenchmarkMyJobsUrl())
      setJobs(res.data)
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to fetch jobs"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchJobs()
    }
  }, [isAuthenticated, fetchJobs])

  const handleOpenJob = (job: JobSummary) => {
    if (hasResults(job.status)) {
      // Show results inline within My Jobs
      setExpandedJob(job)
    } else {
      // In-progress job — load into workflow and navigate
      setJobId(job.job_id)
      setJobStatus(job.status)

      const s = job.status.toLowerCase()
      addCompletedStep("tools")
      if (s !== "created") addCompletedStep("datasets")
      if (["configured", "processing", "running", "extracting"].includes(s)) {
        addCompletedStep("populations")
        addCompletedStep("configure")
      }

      setActiveStep(stepForStatus(job.status))
    }
  }

  // ─── Expanded: show results for a specific job ──────────────────────

  if (expandedJob) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedJob(null)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to My Jobs
          </Button>
          <span className="text-sm text-muted-foreground">
            {expandedJob.dataset_filename || "Job"} &middot;{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {expandedJob.job_id.slice(0, 8)}
            </code>
          </span>
        </div>
        <BenchmarkingResults
          jobId={expandedJob.job_id}
          onBack={() => setExpandedJob(null)}
        />
      </div>
    )
  }

  // ─── Job list ───────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            Sign in to view your jobs.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">My Jobs</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchJobs}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && !loading && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <AlertCircle className="mb-2 h-6 w-6" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!error && !loading && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <p className="text-sm">No jobs yet. Start a new benchmarking run!</p>
          </div>
        )}

        {(jobs.length > 0 || loading) && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Dataset</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3 pr-4">Started</th>
                  <th className="pb-3 pr-4">Completed</th>
                  <th className="pb-3 pr-4">Job ID</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {jobs.map((job) => (
                  <tr
                    key={job.job_id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => handleOpenJob(job)}
                  >
                    <td className="py-3 pr-4">{statusBadge(job.status)}</td>
                    <td className="py-3 pr-4 font-medium">
                      {job.dataset_filename || "—"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(job.started_at)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(job.completed_at)}
                    </td>
                    <td className="py-3 pr-4">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {job.job_id.slice(0, 8)}
                      </code>
                    </td>
                    <td className="py-3">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}

        {jobs.length > 0 && !loading && (
          <p className="mt-3 text-xs text-muted-foreground">
            {jobs.length} job{jobs.length !== 1 ? "s" : ""} total
          </p>
        )}
      </CardContent>
    </Card>
  )
}
