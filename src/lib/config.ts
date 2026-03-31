// Benchmark Backend Configuration
export const BENCHMARK_CONFIG = {
  BASE_URL:
    process.env.NEXT_PUBLIC_BENCHMARK_BASE_URL ||
    "http://localhost:7500/api/v1/benchmarks",
  AUTH_BASE_URL:
    process.env.NEXT_PUBLIC_BENCHMARK_AUTH_URL ||
    "http://localhost:7500/api/v1/auth",
  UPLOAD_ENDPOINT: "/upload",
  JOBS_ENDPOINT: "/jobs",
} as const

// Auth URL helpers
export const getBenchmarkSignupUrl = () => {
  return `${BENCHMARK_CONFIG.AUTH_BASE_URL}/signup`
}

export const getBenchmarkLoginUrl = () => {
  return `${BENCHMARK_CONFIG.AUTH_BASE_URL}/login`
}

export const getBenchmarkRefreshUrl = () => {
  return `${BENCHMARK_CONFIG.AUTH_BASE_URL}/refresh`
}

export const getBenchmarkMyJobsUrl = () => {
  return `${BENCHMARK_CONFIG.BASE_URL}/jobs/mine`
}

// Helper function to get the full upload URL
export const getBenchmarkUploadUrl = (jobId?: string) => {
  const baseUrl = `${BENCHMARK_CONFIG.BASE_URL}${BENCHMARK_CONFIG.UPLOAD_ENDPOINT}`
  return jobId ? `${baseUrl}?job_id=${jobId}` : baseUrl
}

// Helper function to get the presigned upload URL
export const getBenchmarkPresignUrl = (jobId: string) => {
  return `${BENCHMARK_CONFIG.BASE_URL}/${jobId}/upload/presign`
}

// Helper function to get the upload complete URL
export const getBenchmarkUploadCompleteUrl = (jobId: string) => {
  return `${BENCHMARK_CONFIG.BASE_URL}/${jobId}/upload/complete`
}

// Helper function to get the job creation URL
export const getBenchmarkJobsUrl = () => {
  return `${BENCHMARK_CONFIG.BASE_URL}${BENCHMARK_CONFIG.JOBS_ENDPOINT}`
}

// Helper function to get the job status URL
export const getBenchmarkJobStatusUrl = (jobId: string) => {
  return `${BENCHMARK_CONFIG.BASE_URL}/${jobId}`
}

// Helper function to get the SSE events URL
export const getBenchmarkEventsUrl = (jobId: string) => {
  return `${BENCHMARK_CONFIG.BASE_URL}/${jobId}/events`
}

// Helper function to get the preview URL: /benchmark/{job_id}/preview/{file_path}
export const getBenchmarkPreviewUrl = (
  jobId: string,
  filePath: string,
  opts?: { randomPick?: boolean }
) => {
  const encodedPath = encodeURIComponent(filePath)
  const base = `${BENCHMARK_CONFIG.BASE_URL}/${jobId}/preview/${encodedPath}`
  const query = opts?.randomPick ? "?random_pick=true" : ""
  return `${base}${query}`
}

// Helper function to get the config submission URL: /benchmark/{job_id}/config
export const getBenchmarkConfigUrl = (jobId: string) => {
  return `${BENCHMARK_CONFIG.BASE_URL}/${jobId}/config`
}

// Helper function to get per-tool log history
export const getBenchmarkLogsUrl = (
  jobId: string,
  tool: string,
  opts?: { level?: string; offset?: number; limit?: number }
) => {
  const params = new URLSearchParams({ tool })
  if (opts?.level) params.set("level", opts.level)
  if (opts?.offset != null) params.set("offset", String(opts.offset))
  if (opts?.limit != null) params.set("limit", String(opts.limit))
  return `${BENCHMARK_CONFIG.BASE_URL}/${jobId}/logs/tool?${params.toString()}`
}

// Helper function to get job-level log history
export const getBenchmarkJobLogsUrl = (
  jobId: string,
  opts?: { level?: string; offset?: number; limit?: number }
) => {
  const params = new URLSearchParams()
  if (opts?.level) params.set("level", opts.level)
  if (opts?.offset != null) params.set("offset", String(opts.offset))
  if (opts?.limit != null) params.set("limit", String(opts.limit))
  const qs = params.toString()
  return `${BENCHMARK_CONFIG.BASE_URL}/${jobId}/logs${qs ? `?${qs}` : ""}`
}

// Helper function to list shared datasets
export const getBenchmarkSharedDatasetsUrl = () => {
  return `${BENCHMARK_CONFIG.BASE_URL}/datasets/shared`
}

// Helper function to select a shared dataset for a job
export const getBenchmarkUseSharedUrl = (jobId: string) => {
  return `${BENCHMARK_CONFIG.BASE_URL}/${jobId}/dataset/use-shared`
}

// Multipart upload helpers (files >= 5GB)
export const getBenchmarkMultipartInitiateUrl = (jobId: string) => {
  return `${BENCHMARK_CONFIG.BASE_URL}/${jobId}/upload/multipart/initiate`
}

export const getBenchmarkMultipartCompleteUrl = (jobId: string) => {
  return `${BENCHMARK_CONFIG.BASE_URL}/${jobId}/upload/multipart/complete`
}

export const getBenchmarkMultipartAbortUrl = (jobId: string) => {
  return `${BENCHMARK_CONFIG.BASE_URL}/${jobId}/upload/multipart/abort`
}

// Reference data paths — backend handles these via env vars now.
// Values are sent as empty strings so the payload shape is preserved
// but the backend ignores/overrides them.
export const REFERENCE_PATHS = {
  SDPRX_LD_REF: "",
  BRIDGEPRS_LD_REF: "",
  PRSCSX_LD_REF: "",
} as const
