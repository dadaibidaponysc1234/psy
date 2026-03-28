/**
 * Types for the benchmarking backend migration (split mode).
 *
 * Covers presigned uploads, SSE events, per-tool logs, and results.
 */

// ---------------------------------------------------------------------------
// Presigned Upload
// ---------------------------------------------------------------------------

export interface PresignResponse {
  job_id: string
  urls: Record<string, { url: string; content_type: string }>
  endpoint: string | null
  bucket: string
}

export interface UploadCompleteResponse {
  job_id: string
  status: "uploaded" | "extracting"
  files: string[]
  message: string
}

// ---------------------------------------------------------------------------
// SSE: Aggregate progress
// ---------------------------------------------------------------------------

export interface AggregateProgress {
  stage: string
  message: string
  percent: number
  timestamp: string
}

// ---------------------------------------------------------------------------
// SSE: Per-tool progress (inside status.tools[])
// ---------------------------------------------------------------------------

export interface ToolProgress {
  tool_name: string
  preprocessing_status: string
  processing_status: string
  progress_percent: number
  progress_message: string
  progress_stage: string
  last_error: string | null
}

// ---------------------------------------------------------------------------
// SSE: tool_status event
// ---------------------------------------------------------------------------

export interface ToolStatusEvent {
  tool: string
  stage: "preprocessing" | "processing" | "evaluating"
  status: "pending" | "running" | "completed" | "failed" | "skipped"
  progress_percent: number
  message: string
  last_error: string | null
  timestamp: string
}

// ---------------------------------------------------------------------------
// SSE: log event
// ---------------------------------------------------------------------------

export type LogLevel = "debug" | "info" | "warning" | "error"

export interface LogEvent {
  tool: string
  stage: string
  level: LogLevel
  line: string
  timestamp: string
}

/** A stored log line (from SSE or REST history) */
export interface LogLine {
  level: LogLevel
  line: string
  timestamp: string | null
  source?: string
}

// ---------------------------------------------------------------------------
// REST: GET /{jobId}/logs/tool
// ---------------------------------------------------------------------------

export interface ToolLogsResponse {
  job_id: string
  tool: string
  total_lines: number
  offset: number
  lines: Array<{
    level: LogLevel
    line: string
    source: string
    timestamp: string | null
  }>
}

// ---------------------------------------------------------------------------
// Shared Datasets
// ---------------------------------------------------------------------------

export interface SharedDataset {
  name: string
  file_count: number
  total_size: number
  total_size_formatted: string
}

export interface SharedDatasetsResponse {
  datasets: SharedDataset[]
}

export interface UseSharedResponse {
  job_id: string
  status: "uploaded"
  dataset: string
  file_count: number
  message: string
}

// ---------------------------------------------------------------------------
// Results: presigned file response
// ---------------------------------------------------------------------------

export interface ResultFileResponse {
  url: string
  filename: string
}
