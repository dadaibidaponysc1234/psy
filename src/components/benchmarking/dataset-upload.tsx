"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Upload,
  ChevronDown,
  ChevronRight,
  File,
  Archive,
  FileText as FileTextIcon,
  Loader2,
  Database,
  CheckCircle,
} from "lucide-react"
import {
  getBenchmarkPresignUrl,
  getBenchmarkUploadCompleteUrl,
  getBenchmarkJobStatusUrl,
  getBenchmarkSharedDatasetsUrl,
  getBenchmarkUseSharedUrl,
  getBenchmarkMultipartInitiateUrl,
  getBenchmarkMultipartCompleteUrl,
  getBenchmarkMultipartAbortUrl,
  getBenchmarkChunkedUploadUrl,
  getBenchmarkChunkedStatusUrl,
  getBenchmarkChunkedCancelUrl,
} from "@/lib/config"
import axios from "axios"
import benchmarkApi from "@/lib/benchmark-api"
import {
  useBenchmarkMode,
  resolveBenchmarkMode,
} from "@/hooks/use-benchmark-mode"
import { useBenchmarkAuthStore } from "@/stores/benchmark-auth-store"
import { toast } from "react-hot-toast"
import { toastInfo } from "@/hooks/use-toast"
import {
  useBenchmarkingStore,
  useUploadedFiles,
  useUploadedFileIds,
  useHasServerUploads,
  useIsUploading,
  useUploadProgress,
} from "@/stores/benchmarking-store"
import type {
  PresignResponse,
  UploadCompleteResponse,
  SharedDataset,
  SharedDatasetsResponse,
  UseSharedResponse,
  MultipartInitiateResponse,
} from "@/types/benchmarking"

// Supported file types for benchmark uploads
const SUPPORTED_FILE_TYPES = [
  ".bed",
  ".bim",
  ".fam",
  ".ped",
  ".map",
  ".vcf",
  ".vcf.gz",
  ".tbi",
  ".bgen",
  ".sample",
  ".gen",
  ".txt",
  ".tsv",
  ".csv",
  ".txt.gz",
  ".tsv.gz",
  ".csv.gz",
  ".ldscore",
  ".ldscore.gz",
  ".annot",
  ".annot.gz",
  ".zip",
  ".tar",
  ".tar.gz",
  ".tgz",
]

// Regex pattern for file validation (case insensitive)
const FILE_TYPE_REGEX =
  /^.*\.(bed|bim|fam|ped|map|vcf(?:\.gz)?|tbi|bgen|sample|gen|txt(?:\.gz)?|tsv(?:\.gz)?|csv(?:\.gz)?|ldscore(?:\.gz)?|annot(?:\.gz)?|zip|tar(?:\.gz)?|tgz)$/i

const isValidFileType = (fileName: string): boolean => {
  return FILE_TYPE_REGEX.test(fileName)
}

type DatasetMode = "upload" | "shared"

/**
 * Upload a file/blob directly to S3 via presigned URL using XMLHttpRequest
 * for upload progress tracking. Returns response headers (needed for ETag
 * in multipart uploads).
 */
function uploadToS3WithProgress(
  url: string,
  body: File | Blob,
  contentType: string | null,
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<{ etag: string | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    if (contentType) {
      xhr.setRequestHeader("Content-Type", contentType)
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded, e.total)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ etag: xhr.getResponseHeader("ETag") })
      } else {
        reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`))
      }
    }

    xhr.onerror = () => reject(new Error("Network error during S3 upload"))
    xhr.ontimeout = () => reject(new Error("S3 upload timed out"))

    if (signal) {
      signal.addEventListener("abort", () => {
        xhr.abort()
        reject(new Error("Upload aborted"))
      })
    }

    xhr.send(body)
  })
}

/**
 * Poll job status until it leaves the "extracting" state.
 */
async function waitForExtraction(
  jobId: string,
  signal?: AbortSignal
): Promise<string> {
  const pollInterval = 3000
  while (true) {
    if (signal?.aborted) throw new Error("Upload aborted")
    const res = await benchmarkApi.get(getBenchmarkJobStatusUrl(jobId))
    const status = (res.data.status || "").toLowerCase()
    if (status !== "extracting") return status
    await new Promise((r) => setTimeout(r, pollInterval))
  }
}

const MULTIPART_THRESHOLD = 5 * 1024 * 1024 * 1024 // 5GB

/**
 * Upload a large file (>= 5GB) via S3 multipart upload.
 * Initiates the upload, uploads each part with progress, then completes.
 * On abort, sends a best-effort abort request to clean up.
 */
async function uploadMultipartToS3(
  jobId: string,
  file: File,
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<void> {
  // Step 1: Initiate
  const initRes = await benchmarkApi.post<MultipartInitiateResponse>(
    getBenchmarkMultipartInitiateUrl(jobId),
    { filename: file.name, file_size: file.size },
    { headers: { "Content-Type": "application/json" } }
  )

  const { upload_id, part_size, parts } = initRes.data
  const completedParts: Array<{ PartNumber: number; ETag: string }> = []
  let totalUploaded = 0

  try {
    for (const part of parts) {
      if (signal?.aborted) throw new Error("Upload aborted")

      const start = (part.part_number - 1) * part_size
      const end = Math.min(start + part_size, file.size)
      const blob = file.slice(start, end)

      const { etag } = await uploadToS3WithProgress(
        part.presigned_url,
        blob,
        null, // S3 multipart parts don't need Content-Type
        (loaded) => {
          if (onProgress) {
            onProgress(totalUploaded + loaded, file.size)
          }
        },
        signal
      )

      if (!etag) {
        throw new Error(
          `S3 did not return ETag for part ${part.part_number}`
        )
      }

      completedParts.push({ PartNumber: part.part_number, ETag: etag })
      totalUploaded += end - start
    }

    // Step 2: Complete
    await benchmarkApi.post(
      getBenchmarkMultipartCompleteUrl(jobId),
      { upload_id, filename: file.name, parts: completedParts },
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    // Best-effort abort to clean up incomplete multipart upload on S3
    benchmarkApi
      .post(
        getBenchmarkMultipartAbortUrl(jobId),
        { upload_id, filename: file.name },
        { headers: { "Content-Type": "application/json" } }
      )
      .catch(() => {}) // fire-and-forget

    throw err
  }
}

// Chunk size for full-mode chunked upload. Backend recommends 50–100 MB —
// large enough to keep request overhead low, small enough that a retry is cheap.
const CHUNK_UPLOAD_SIZE = 75 * 1024 * 1024 // 75 MB

/**
 * Full-mode upload: send a file to POST /upload-chunked one chunk per request,
 * resuming across sessions via GET /upload-chunked/status. Auth + 401-refresh are
 * handled by benchmarkApi; the browser sets the multipart boundary for FormData.
 * Assembly is automatic server-side once every chunk has arrived.
 */
async function uploadChunkedWithResume(
  jobId: string,
  file: File,
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<void> {
  const chunkSize = CHUNK_UPLOAD_SIZE
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize))

  // Resume: ask which chunks the server already has. Branch on `status`, not just
  // received_parts — after assembly the server deletes the chunks, so empty parts
  // can mean either "upload everything" (status created) or "already done".
  let have = new Set<number>()
  try {
    const statusRes = await benchmarkApi.get(
      getBenchmarkChunkedStatusUrl(jobId, file.name)
    )
    const status = String(statusRes.data?.status || "").toLowerCase()
    if ((status && status !== "created") || statusRes.data?.assembling) {
      // Already assembled / extracting / uploaded — nothing to send for this file.
      if (onProgress) onProgress(file.size, file.size)
      return
    }
    if (Array.isArray(statusRes.data?.received_parts)) {
      have = new Set<number>(statusRes.data.received_parts as number[])
    }
  } catch {
    // No prior status (fresh upload) — send everything.
  }

  let uploaded = 0
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, file.size)

    if (have.has(i)) {
      uploaded += end - start
      if (onProgress) onProgress(uploaded, file.size)
      continue
    }
    if (signal?.aborted) throw new Error("Upload aborted")

    const form = new FormData()
    form.append("job_id", jobId)
    form.append("chunk_index", String(i))
    form.append("total_chunks", String(totalChunks))
    form.append("filename", file.name)
    form.append("chunk", file.slice(start, end), `${file.name}.part${i}`)

    const maxRetries = 3
    let attempt = 0
    while (true) {
      try {
        // Use fetch, NOT benchmarkApi: the axios instance's default
        // `Content-Type: application/json` sticks to a FormData body and the
        // backend rejects the multipart upload (422). With fetch + no explicit
        // Content-Type, the browser sets `multipart/form-data` with the boundary.
        // Token is attached manually (mirrors the SSE hook).
        const token = useBenchmarkAuthStore.getState().accessToken
        const res = await fetch(getBenchmarkChunkedUploadUrl(), {
          method: "POST",
          body: form,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal,
        })
        if (!res.ok) {
          const detail = await res.text().catch(() => "")
          throw new Error(`chunk ${i} → HTTP ${res.status} ${detail.slice(0, 200)}`)
        }
        break
      } catch (err) {
        if (signal?.aborted) throw new Error("Upload aborted")
        attempt += 1
        if (attempt > maxRetries) throw err
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt - 1)))
      }
    }

    uploaded += end - start
    if (onProgress) onProgress(uploaded, file.size)
  }
}

/**
 * After full-mode chunks land, the server assembles automatically and moves the job
 * out of "created". Poll until it does (or briefly into "extracting"), so the caller
 * can then reuse waitForExtraction. Bounded so a stuck assembly can't hang the UI.
 */
async function waitForAssembly(
  jobId: string,
  signal?: AbortSignal
): Promise<string> {
  const pollInterval = 2000
  const maxWaitMs = 120000
  let waited = 0
  while (true) {
    if (signal?.aborted) throw new Error("Upload aborted")
    const res = await benchmarkApi.get(getBenchmarkJobStatusUrl(jobId))
    const status = String(res.data?.status || "").toLowerCase()
    if (status !== "created") return status
    if (waited >= maxWaitMs) return status
    await new Promise((r) => setTimeout(r, pollInterval))
    waited += pollInterval
  }
}

interface DatasetUploadProps {
  onNext: (data: any) => void
  onPrevious?: () => void
  data?: any
}

export function DatasetUpload({
  onNext,
  onPrevious,
  data,
}: DatasetUploadProps) {
  const [mode, setMode] = useState<DatasetMode>("upload")
  const [showSupportedTypes, setShowSupportedTypes] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Backend deployment mode. Full mode uploads via resumable chunks and has no
  // shared-dataset feature; split mode uploads direct to S3 via presigned URLs.
  const { mode: backendMode } = useBenchmarkMode()
  const isFullMode = backendMode === "full"

  // Shared dataset state
  const [sharedDatasets, setSharedDatasets] = useState<SharedDataset[]>([])
  const [sharedLoading, setSharedLoading] = useState(false)
  const [sharedError, setSharedError] = useState<string | null>(null)
  const [selectedShared, setSelectedShared] = useState<string | null>(null)
  const [isSelectingShared, setIsSelectingShared] = useState(false)
  const [sharedFetched, setSharedFetched] = useState(false)

  const {
    jobId,
    uploadedFiles,
    uploadedFileIds,
    hasServerUploads,
    isUploading,
    uploadProgress,
    setUploadedFiles,
    setUploadedFileIds,
    setHasServerUploads,
    setIsUploading,
    setUploadProgress,
    addUploadedFile,
    removeUploadedFile,
    setJobId,
  } = useBenchmarkingStore()

  // Full mode has no shared datasets — never leave the user stranded on that tab.
  useEffect(() => {
    if (isFullMode && mode === "shared") setMode("upload")
  }, [isFullMode, mode])

  // Check if there's already an active job and restore uploaded state
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when jobId changes
  useEffect(() => {
    const checkExistingJob = async () => {
      if (!jobId) return

      try {
        const response = await benchmarkApi.get(getBenchmarkJobStatusUrl(jobId))
        const status = (response.data.status || "").toLowerCase()

        if (status === "extracting") {
          setIsExtracting(true)
          toast("Files are being extracted...", { icon: "📦" })
          try {
            await waitForExtraction(jobId)
            setIsExtracting(false)
            toast.success("File extraction complete")
          } catch {
            setIsExtracting(false)
          }
          const updated = await benchmarkApi.get(getBenchmarkJobStatusUrl(jobId))
          restoreUploadedState(updated.data)
        } else if (status !== "created") {
          restoreUploadedState(response.data)
        } else {
          if (isUploading) {
            setIsUploading(false)
            setUploadProgress(0)
            toastInfo("Upload was interrupted. Please try uploading again.")
          }
        }
      } catch (error) {
        console.error("Failed to check existing job:", error)
        if (isUploading) {
          setIsUploading(false)
          setUploadProgress(0)
          toast.error("Cannot reach server. Upload may have been interrupted.")
        }
      }
    }

    checkExistingJob()
  }, [jobId])

  const restoreUploadedState = useCallback(
    (data: any) => {
      const mockFiles =
        data.processing_details?.uploaded_files?.map((filename: string) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: filename,
          size: 0,
          type: "application/octet-stream",
          file: undefined,
        })) || []

      setUploadedFiles(mockFiles)
      setUploadedFileIds(mockFiles.map((f: any) => f.id))
      setHasServerUploads(mockFiles.length > 0)
      setIsUploading(false)
      setUploadProgress(0)
      toast.success("Uploaded files restored from existing job")
    },
    [setUploadedFiles, setUploadedFileIds, setHasServerUploads, setIsUploading, setUploadProgress]
  )

  // ---------------------------------------------------------------------------
  // Shared datasets
  // ---------------------------------------------------------------------------

  const fetchSharedDatasets = useCallback(async () => {
    if (sharedFetched && sharedDatasets.length > 0) return
    setSharedLoading(true)
    setSharedError(null)
    try {
      const res = await benchmarkApi.get<SharedDatasetsResponse>(
        getBenchmarkSharedDatasetsUrl()
      )
      setSharedDatasets(res.data.datasets || [])
      setSharedFetched(true)
    } catch (err) {
      setSharedError("Failed to load shared datasets")
      console.error("Failed to fetch shared datasets:", err)
    } finally {
      setSharedLoading(false)
    }
  }, [sharedFetched, sharedDatasets.length])

  // Fetch shared datasets when user switches to shared mode
  useEffect(() => {
    if (mode === "shared") {
      fetchSharedDatasets()
    }
  }, [mode, fetchSharedDatasets])

  const handleUseSharedDataset = async () => {
    if (!jobId || !selectedShared) return

    setIsSelectingShared(true)
    try {
      const res = await benchmarkApi.post<UseSharedResponse>(
        getBenchmarkUseSharedUrl(jobId),
        { dataset: selectedShared },
        { headers: { "Content-Type": "application/json" } }
      )

      // The job is now "uploaded" — create mock files to show in the UI
      const dataset = sharedDatasets.find((d) => d.name === selectedShared)
      const mockFiles = [
        {
          id: Math.random().toString(36).substr(2, 9),
          name: `${selectedShared} (${dataset?.file_count ?? res.data.file_count} files)`,
          size: dataset?.total_size ?? 0,
          type: "shared-dataset",
          file: undefined,
        },
      ]
      setUploadedFiles(mockFiles)
      setUploadedFileIds(mockFiles.map((f) => f.id))
      setHasServerUploads(true)

      toast.success(res.data.message || "Shared dataset selected")
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(
          `Failed to select dataset: ${err.response?.data?.detail || err.message}`
        )
      } else {
        toast.error("Failed to select shared dataset")
      }
    } finally {
      setIsSelectingShared(false)
    }
  }

  // ---------------------------------------------------------------------------
  // File upload (own dataset)
  // ---------------------------------------------------------------------------

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles: Array<{
      id: string
      name: string
      size: number
      type: string
      file: File
    }> = []
    const invalidFiles: string[] = []

    files.forEach((file) => {
      if (isValidFileType(file.name)) {
        validFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          file: file,
        })
      } else {
        invalidFiles.push(file.name)
      }
    })

    if (invalidFiles.length > 0) {
      toast.error(
        `Invalid file type(s): ${invalidFiles.join(", ")}. Please check the supported file types.`,
        { duration: 5000 }
      )
    }

    if (validFiles.length > 0) {
      validFiles.forEach((file) => addUploadedFile(file))
      toast.success(`Added ${validFiles.length} file(s) successfully.`)
    }
  }

  const handleUpload = async () => {
    const validFiles = uploadedFiles.filter((f: any) => f.file instanceof Blob)
    if (validFiles.length === 0) {
      toast.error("No valid files to upload")
      return
    }

    if (!jobId) {
      toast.error("No job ID found. Please select tools first.")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    try {
      const totalBytes = validFiles.reduce(
        (sum: number, f: any) => sum + (f.file?.size || 0),
        0
      )
      const fileProgress: Record<string, number> = {}
      const reportProgress = (name: string, loaded: number) => {
        fileProgress[name] = loaded
        const totalLoaded = Object.values(fileProgress).reduce((a, b) => a + b, 0)
        setUploadProgress(Math.round((totalLoaded * 100) / totalBytes))
      }

      // Resolve the deployment mode before branching. Awaiting guarantees the
      // right path even if the initial /health probe hasn't landed yet.
      const resolvedMode = await resolveBenchmarkMode()

      if (resolvedMode === "full") {
        // Full mode: resumable chunked upload straight to the backend.
        for (const f of validFiles) {
          const fileObj: File = f.file as File
          fileProgress[fileObj.name] = 0
          await uploadChunkedWithResume(
            jobId,
            fileObj,
            (loaded) => reportProgress(fileObj.name, loaded),
            signal
          )
        }

        setUploadedFileIds(validFiles.map((f: any) => f.id))

        // Assembly is automatic — wait for the job to leave "created", then handle
        // any archive extraction the same way split mode does.
        const assembledStatus = await waitForAssembly(jobId, signal)
        if (assembledStatus === "extracting") {
          setIsExtracting(true)
          toast("Extracting uploaded archives...", { icon: "📦" })
          await waitForExtraction(jobId, signal)
          setIsExtracting(false)
        }
      } else {
        // Split mode: direct-to-S3 via presigned URLs (multipart for >= 5GB).
        const smallFiles = validFiles.filter(
          (f: any) => (f.file?.size || 0) < MULTIPART_THRESHOLD
        )
        const largeFiles = validFiles.filter(
          (f: any) => (f.file?.size || 0) >= MULTIPART_THRESHOLD
        )

        // Upload small files via presigned PUT
        if (smallFiles.length > 0) {
          const filenames = smallFiles.map((f: any) => f.name)
          const presignRes = await benchmarkApi.post<PresignResponse>(
            getBenchmarkPresignUrl(jobId),
            { filenames },
            { headers: { "Content-Type": "application/json" } }
          )
          const { urls } = presignRes.data

          for (const f of smallFiles) {
            const fileObj: File = f.file as File
            const presigned = urls[fileObj.name]
            if (!presigned) {
              throw new Error(`No presigned URL returned for ${fileObj.name}`)
            }

            fileProgress[fileObj.name] = 0

            await uploadToS3WithProgress(
              presigned.url,
              fileObj,
              presigned.content_type,
              (loaded) => reportProgress(fileObj.name, loaded),
              signal
            )
          }
        }

        // Upload large files via multipart
        for (const f of largeFiles) {
          const fileObj: File = f.file as File
          fileProgress[fileObj.name] = 0

          await uploadMultipartToS3(
            jobId,
            fileObj,
            (loaded) => reportProgress(fileObj.name, loaded),
            signal
          )
        }

        // Confirm upload; backend may return extracting.
        const completeRes = await benchmarkApi.post<UploadCompleteResponse>(
          getBenchmarkUploadCompleteUrl(jobId)
        )

        setUploadedFileIds(validFiles.map((f: any) => f.id))

        if (completeRes.data.status === "extracting") {
          setIsExtracting(true)
          toast("Extracting uploaded archives...", { icon: "📦" })
          await waitForExtraction(jobId, signal)
          setIsExtracting(false)
        }
      }

      toast.success("Files uploaded successfully!")
    } catch (error) {
      if (error instanceof Error && error.message === "Upload aborted") {
        toast("Upload cancelled", { icon: "🚫" })
      } else if (axios.isAxiosError(error)) {
        toast.error(
          `Upload failed: ${error.response?.data?.detail || error.message}`
        )
      } else {
        toast.error(
          `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      }
    } finally {
      setIsUploading(false)
      setIsExtracting(false)
      setUploadProgress(0)
      abortControllerRef.current = null
    }
  }

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    // Full mode keeps partial chunks server-side; ask the backend to clean them up.
    // (Split mode's multipart abort is handled inside uploadMultipartToS3 on abort.)
    if (isFullMode && jobId) {
      uploadedFiles.forEach((f) => {
        if (f.file) {
          benchmarkApi
            .post(getBenchmarkChunkedCancelUrl(), {
              job_id: jobId,
              filename: f.name,
            })
            .catch(() => {})
        }
      })
    }
  }

  const removeFile = (fileId: string) => {
    removeUploadedFile(fileId)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    if (extension === "zip") return Archive
    if (["txt", "csv", "tsv"].includes(extension || "")) return FileTextIcon
    if (
      ["bed", "bim", "fam", "vcf", "pgen", "pvar", "psam"].includes(
        extension || ""
      )
    )
      return File
    return File
  }

  const canProceed =
    (uploadedFiles.length > 0 || hasServerUploads) &&
    !isUploading &&
    !isExtracting &&
    !isSelectingShared

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xl font-semibold">Dataset</h3>
        <p className="text-muted-foreground">
          Upload your own benchmark dataset or use a shared dataset from our
          collection.
        </p>
      </div>

      {/* Mode selector — shared datasets only exist in split mode */}
      {!isFullMode && (
        <div className="flex gap-3">
          <Button
            variant={mode === "upload" ? "default" : "outline"}
            onClick={() => setMode("upload")}
            className="flex-1"
            disabled={isUploading || isSelectingShared}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload my own dataset
          </Button>
          <Button
            variant={mode === "shared" ? "default" : "outline"}
            onClick={() => setMode("shared")}
            className="flex-1"
            disabled={isUploading || isSelectingShared}
          >
            <Database className="mr-2 h-4 w-4" />
            Use shared dataset
          </Button>
        </div>
      )}

      {/* Upload Status Indicator */}
      {isUploading && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              {isExtracting
                ? "Extracting uploaded archives..."
                : `Uploading${isFullMode ? "" : " to cloud"}... ${uploadProgress}%`}
            </span>
            {!isExtracting && (
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={cancelUpload}
              >
                Cancel
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-blue-600">
            {isExtracting
              ? "Please wait while your archives are being extracted on the server."
              : isFullMode
                ? "Uploading files to the server in resumable chunks."
                : "Uploading files directly to cloud storage."}
          </p>
        </div>
      )}

      {/* Extracting indicator (when not actively uploading but extraction is happening) */}
      {isExtracting && !isUploading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Extracting files on server...
            </span>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODE: Upload own dataset                                            */}
      {/* ================================================================== */}
      {mode === "upload" && (
        <>
          <p className="text-sm text-muted-foreground">
            We support a wide variety of genetic data formats. If you have
            multiple files or need to preserve directory structures, consider
            uploading a ZIP file.
          </p>

          {/* Supported File Types Collapsible Section */}
          <div>
            <button
              onClick={() => setShowSupportedTypes(!showSupportedTypes)}
              className="flex items-center gap-2 text-sm text-primary transition-colors hover:text-primary/80"
            >
              {showSupportedTypes ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-medium">
                {showSupportedTypes ? "Hide" : "Show"} Supported File Types
              </span>
            </button>

            {showSupportedTypes && (
              <div className="mt-3 rounded-lg bg-muted/50 p-4">
                <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3 lg:grid-cols-4">
                  {SUPPORTED_FILE_TYPES.map((fileType) => (
                    <div
                      key={fileType}
                      className="font-mono text-muted-foreground"
                    >
                      {fileType}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>File Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-muted-foreground/50">
                <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <div className="space-y-2">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-lg font-medium">
                      Click to upload files
                    </span>
                    <p className="text-sm text-muted-foreground">
                      or drag and drop multiple files
                    </p>
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    accept={SUPPORTED_FILE_TYPES.join(",")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {uploadedFiles.length > 0 && (
            <>
              {hasServerUploads && (
                <Card>
                  <CardHeader>
                    <CardTitle>Files Restored from Server</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      These files were already uploaded to the server. You can
                      upload additional files below.
                    </p>
                  </CardHeader>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Selected Files</CardTitle>
                  {hasServerUploads && (
                    <p className="text-sm text-muted-foreground">
                      Files restored from server - you can upload additional
                      files
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {uploadedFiles.map((file) => {
                      const FileIcon = getFileIcon(file.name)
                      return (
                        <div
                          key={file.id}
                          className={`relative rounded-lg border p-4 transition-all ${
                            uploadedFileIds.includes(file.id)
                              ? "border-green-200 bg-green-50 dark:bg-green-950/20"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <FileIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex min-w-0 items-center gap-2">
                                <p
                                  className="truncate text-sm font-medium"
                                  title={file.name}
                                >
                                  {file.name}
                                </p>
                                {uploadedFileIds.includes(file.id) && (
                                  <Badge variant="outline" className="text-xs">
                                    Uploaded
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file.id)}
                              disabled={uploadedFileIds.includes(file.id)}
                              className="h-6 w-6 flex-shrink-0 p-0"
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="mt-4">
                    <Button
                      onClick={handleUpload}
                      disabled={
                        isUploading ||
                        isExtracting ||
                        uploadedFileIds.length === uploadedFiles.length ||
                        uploadedFiles.length === 0
                      }
                      className="w-full"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isExtracting ? "Extracting..." : "Uploading..."}
                        </>
                      ) : uploadedFileIds.length === uploadedFiles.length ? (
                        "All Files Uploaded"
                      ) : uploadedFiles.length === 0 ? (
                        "No Files Selected"
                      ) : (
                        "Upload Files"
                      )}
                    </Button>
                    {isUploading && !isExtracting && (
                      <Progress value={uploadProgress} className="mt-2" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* ================================================================== */}
      {/* MODE: Shared dataset (split mode only)                              */}
      {/* ================================================================== */}
      {mode === "shared" && !isFullMode && (
        <Card>
          <CardHeader>
            <CardTitle>Shared Datasets</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select a pre-existing dataset from our shared collection. No
              upload needed — the dataset will be linked to your job instantly.
            </p>
          </CardHeader>
          <CardContent>
            {sharedLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Loading shared datasets...
                </span>
              </div>
            )}

            {sharedError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {sharedError}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-3"
                  onClick={() => {
                    setSharedFetched(false)
                    fetchSharedDatasets()
                  }}
                >
                  Retry
                </Button>
              </div>
            )}

            {!sharedLoading && !sharedError && sharedDatasets.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No shared datasets available.
              </div>
            )}

            {!sharedLoading && sharedDatasets.length > 0 && (
              <div className="space-y-3">
                {sharedDatasets.map((dataset) => {
                  const isSelected = selectedShared === dataset.name
                  return (
                    <button
                      key={dataset.name}
                      type="button"
                      onClick={() => setSelectedShared(dataset.name)}
                      disabled={isSelectingShared || hasServerUploads}
                      className={`w-full rounded-lg border p-4 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50"
                      } ${isSelectingShared || hasServerUploads ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <Database
                          className={`h-8 w-8 shrink-0 ${
                            isSelected
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{dataset.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {dataset.file_count} files
                            {dataset.total_size_formatted &&
                              ` — ${dataset.total_size_formatted}`}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                        )}
                      </div>
                    </button>
                  )
                })}

                {!hasServerUploads && (
                  <Button
                    onClick={handleUseSharedDataset}
                    disabled={!selectedShared || isSelectingShared || !jobId}
                    className="w-full"
                  >
                    {isSelectingShared ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Selecting dataset...
                      </>
                    ) : (
                      "Use Selected Dataset"
                    )}
                  </Button>
                )}

                {hasServerUploads && (
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Dataset ready — proceed to the next step.
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="mt-4 flex gap-2">
        {onPrevious && (
          <Button variant="secondary" onClick={onPrevious}>
            Back
          </Button>
        )}
        <Button onClick={() => onNext({ uploadedFiles, uploadedFileIds })} disabled={!canProceed}>
          Next
        </Button>
      </div>
    </div>
  )
}
