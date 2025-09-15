// Benchmark Backend Configuration
export const BENCHMARK_CONFIG = {
  BASE_URL:
    process.env.NEXT_PUBLIC_BENCHMARK_BASE_URL ||
    "http://localhost:8000/api/v1/benchmarks",
  UPLOAD_ENDPOINT: "/upload",
  JOBS_ENDPOINT: "/jobs",
} as const

// Helper function to get the full upload URL
export const getBenchmarkUploadUrl = (jobId?: string) => {
  const baseUrl = `${BENCHMARK_CONFIG.BASE_URL}${BENCHMARK_CONFIG.UPLOAD_ENDPOINT}`
  return jobId ? `${baseUrl}?job_id=${jobId}` : baseUrl
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
export const getBenchmarkPreviewUrl = (jobId: string, filePath: string) => {
  const encodedPath = encodeURIComponent(filePath)
  return `${BENCHMARK_CONFIG.BASE_URL}/${jobId}/preview/${encodedPath}`
}

// Helper function to get the config submission URL: /benchmark/{job_id}/config
export const getBenchmarkConfigUrl = (jobId: string) => {
  return `${BENCHMARK_CONFIG.BASE_URL}/${jobId}/config`
}
