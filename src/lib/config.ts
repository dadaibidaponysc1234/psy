// Benchmark Backend Configuration
export const BENCHMARK_CONFIG = {
  BASE_URL:
    process.env.NEXT_PUBLIC_BENCHMARK_BASE_URL ||
    "http://localhost:8000/api/v1/benchmarks",
  UPLOAD_ENDPOINT: "/upload",
  CHUNKED_UPLOAD_ENDPOINT: "/upload-chunked",
  CHUNKED_CANCEL_ENDPOINT: "/upload-chunked/cancel",
  JOBS_ENDPOINT: "/jobs",
} as const

// Helper function to get the full upload URL
export const getBenchmarkUploadUrl = (jobId?: string) => {
  const baseUrl = `${BENCHMARK_CONFIG.BASE_URL}${BENCHMARK_CONFIG.UPLOAD_ENDPOINT}`
  return jobId ? `${baseUrl}?job_id=${jobId}` : baseUrl
}

// Helper function to get the chunked upload URL
export const getBenchmarkChunkedUploadUrl = () => {
  return `${BENCHMARK_CONFIG.BASE_URL}${BENCHMARK_CONFIG.CHUNKED_UPLOAD_ENDPOINT}`
}

// Helper function to get the chunked cancel URL
export const getBenchmarkChunkedCancelUrl = () => {
  return `${BENCHMARK_CONFIG.BASE_URL}${BENCHMARK_CONFIG.CHUNKED_CANCEL_ENDPOINT}`
}

// Helper function to get the job creation URL
export const getBenchmarkJobsUrl = () => {
  return `${BENCHMARK_CONFIG.BASE_URL}${BENCHMARK_CONFIG.JOBS_ENDPOINT}`
}

// Helper function to get the job status URL
export const getBenchmarkJobStatusUrl = (jobId: string) => {
  return `${BENCHMARK_CONFIG.BASE_URL}/${jobId}`
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

// Reference data paths - centrally managed for easy environment switching
export const REFERENCE_PATHS = {
  SDPRX_LD_REF: "/Users/cable/Downloads/Work/prs-backend/dataset/chr_22.gz",
  BRIDGEPRS_LD_REF:
    "/Users/cable/Downloads/Work/prs-backend/dataset/h3gwas_data/1000G_5P",
  PRSCSX_LD_REF: "ld_ref",
} as const
