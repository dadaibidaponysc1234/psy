"use client"

import React, { useState, useEffect, useRef } from "react"
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
} from "lucide-react"
import {
  getBenchmarkUploadUrl,
  BENCHMARK_CONFIG,
  getBenchmarkChunkedUploadUrl,
  getBenchmarkChunkedCancelUrl,
} from "@/lib/config"
import axios from "axios"
import { toast, Toaster } from "react-hot-toast"
import { toastInfo } from "@/hooks/use-toast"
import {
  useBenchmarkingStore,
  useUploadedFiles,
  useUploadedFileIds,
  useHasServerUploads,
  useIsUploading,
  useUploadProgress,
} from "@/stores/benchmarking-store"

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

// Function to validate file type
const isValidFileType = (fileName: string): boolean => {
  return FILE_TYPE_REGEX.test(fileName)
}

type UploadOptions = {
  chunkSize?: number
  maxRetries?: number
  backoffBaseMs?: number
  combineTimeoutSecs?: number
}

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

type ChunkedResult = {
  jobId: string
  lastStatus: number
  lastStatusText: string
  lastHeaders: Record<string, string>
  lastData: any
}

async function uploadChunkedWithRetry(
  apiBase: string,
  file: File,
  jobId?: string,
  opts: UploadOptions = {},
  onChunk?: (chunkBytes: number, uploadedSoFarFile: number, totalBytesFile: number) => void,
  signal?: AbortSignal
): Promise<ChunkedResult> {
  const chunkSize = opts.chunkSize ?? 5 * 1024 * 1024
  const maxRetries = opts.maxRetries ?? 3
  const backoffBaseMs = opts.backoffBaseMs ?? 500
  const totalChunks = Math.ceil(file.size / chunkSize)
  let currentJobId = jobId ?? ""
  let lastStatus = 0
  let lastStatusText = ""
  let lastHeaders: Record<string, string> = {}
  let lastData: any = null

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const blob = file.slice(start, end)

    let attempt = 0
    while (true) {
      const form = new FormData()
      if (i === 0 && !currentJobId) {
      } else {
        form.append("job_id", currentJobId)
      }
      form.append("chunk_index", String(i))
      form.append("total_chunks", String(totalChunks))
      form.append("filename", file.name)
      form.append("chunk", blob, `${file.name}.part${i}`)
      if (i === totalChunks - 1 && opts.combineTimeoutSecs !== undefined) {
        form.append("combine_timeout_secs", String(opts.combineTimeoutSecs))
      }

      let res: Response | null = null
      try {
        res = await fetch(getBenchmarkChunkedUploadUrl(), {
          method: "POST",
          body: form,
          credentials: "include",
          signal,
        })
      } catch {
        res = null
      }

      if (res && res.ok) {
        const json = await res.json()
        if (!currentJobId) currentJobId = json.job_id
        lastStatus = res.status
        lastStatusText = res.statusText
        const hdrs: Record<string, string> = {}
        res.headers.forEach((v, k) => {
          hdrs[k] = v
        })
        lastHeaders = hdrs
        lastData = json
        if (typeof onChunk === "function") {
          onChunk(blob.size, end, file.size)
        }
        break
      }

      attempt += 1
      if (attempt > maxRetries) {
        throw new Error(
          `Chunk ${i + 1}/${totalChunks} failed after ${maxRetries} retries`
        )
      }
      const backoff = backoffBaseMs * Math.pow(2, attempt - 1)
      await sleep(backoff)
    }
  }

  return {
    jobId: currentJobId,
    lastStatus,
    lastStatusText,
    lastHeaders,
    lastData,
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
  const [showSupportedTypes, setShowSupportedTypes] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentFileNameRef = useRef<string | null>(null)
  const currentJobIdRef = useRef<string | null>(null)

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

  // Check if there's already an active job and restore uploaded state
  // This also handles tab switching during upload - when you return to this tab,
  // it will check the server status and restore the correct state
  useEffect(() => {
    const checkExistingJob = async () => {
      console.log("🔍 Checking existing job:", jobId)

      if (jobId) {
        try {
          // Check job status to see if files are already uploaded
          const response = await axios.get(
            `${getBenchmarkUploadUrl().replace("/upload", "")}/${jobId}`
          )

          console.log("📊 Job status response:", response.data)

          if (
            response.data.status &&
            response.data.status.toLowerCase() !== "created"
          ) {
            // Files are already uploaded (includes 'uploaded', 'processing', etc.)
            // Any status other than 'created' means files have been handled successfully
            console.log("📁 Files already uploaded/processed, restoring state")
            console.log(
              "📁 Processing details:",
              response.data.processing_details
            )

            // Create mock file entries for the uploaded files
            const mockFiles =
              response.data.processing_details?.uploaded_files?.map(
                (filename: string) => ({
                  id: Math.random().toString(36).substr(2, 9),
                  name: filename,
                  size: 0, // We don't have the actual size
                  type: "application/octet-stream",
                  file: undefined, // No file object for server-uploaded files
                })
              ) || []

            console.log("📁 Mock files created:", mockFiles)

            setUploadedFiles(mockFiles)
            setUploadedFileIds(mockFiles.map((f: any) => f.id))
            setHasServerUploads(mockFiles.length > 0)

            // Reset upload state since files are already on server
            setIsUploading(false)
            setUploadProgress(0)

            toast.success("Uploaded files restored from existing job")
          } else {
            console.log("📁 Job status is 'created', no files uploaded yet")

            // If we were uploading and job is still 'created',
            // the upload might have been interrupted
            if (isUploading) {
              console.log("⚠️ Upload was interrupted, resetting upload state")
              setIsUploading(false)
              setUploadProgress(0)
              toastInfo("Upload was interrupted. Please try uploading again.")
            }
          }
        } catch (error) {
          console.error("Failed to check existing job:", error)

          // If we can't reach the server and were uploading, reset state
          if (isUploading) {
            console.log("⚠️ Server unreachable, resetting upload state")
            setIsUploading(false)
            setUploadProgress(0)
            toast.error(
              "Cannot reach server. Upload may have been interrupted."
            )
          }
        }
      } else {
        console.log("🔍 No job ID found in Zustand store")
      }
    }

    checkExistingJob()
  }, [jobId])

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
      // Add each file to the store
      validFiles.forEach((file) => addUploadedFile(file))
      toast.success(`Added ${validFiles.length} file(s) successfully.`)
    }
  }

  const cancelUpload = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const payload: any = {
      job_id: currentJobIdRef.current || jobId || "",
    }
    if (currentFileNameRef.current) {
      payload.filename = currentFileNameRef.current
    }
    try {
      await axios.post(getBenchmarkChunkedCancelUrl(), payload, {
        headers: { "Content-Type": "application/json" },
      })
      toast.success("Upload cancelled")
    } catch (e: any) {
      console.error("Cancel upload failed:", e?.response?.data || e?.message || e)
      toast.error("Failed to cancel upload")
    }
  }

  const handleUpload = async () => {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const validFiles = uploadedFiles.filter((f: any) => f.file instanceof Blob)
      if (validFiles.length === 0) {
        toast.error("No valid files to upload")
        return
      }
      const totalBytes = validFiles.reduce(
        (sum: number, f: any) => sum + (f.file?.size || 0),
        0
      )
      let uploadedBytes = 0
      let currentJobId = jobId || ""
      currentJobIdRef.current = currentJobId
      const chunkedUrl = getBenchmarkChunkedUploadUrl()
      console.log("📤 Request details:")
      console.log("  URL:", chunkedUrl)
      console.log("  Method: POST")
      console.log("  Content-Type: multipart/form-data")
      console.log("  Files count:", validFiles.length)
      let lastResult: ChunkedResult | null = null
      abortControllerRef.current = new AbortController()
      for (const f of validFiles) {
        const fileObj: File = f.file as File
        currentFileNameRef.current = fileObj.name
        const res = await uploadChunkedWithRetry(
          BENCHMARK_CONFIG.BASE_URL,
          fileObj,
          currentJobId,
          { chunkSize: 5 * 1024 * 1024, maxRetries: 3, backoffBaseMs: 500 },
          (chunkBytes, uploadedSoFarFile, totalBytesFile) => {
            uploadedBytes += chunkBytes
            const pct = Math.round((uploadedBytes * 100) / totalBytes)
            setUploadProgress(pct)
          },
          abortControllerRef.current.signal
        )
        currentJobId = res.jobId
        currentJobIdRef.current = currentJobId
        lastResult = res
      }
      if (currentJobId && currentJobId !== jobId) {
        setJobId(currentJobId)
      }
      setUploadedFileIds(validFiles.map((f: any) => f.id))
      if (lastResult) {
        console.log("📡 Response details:")
        console.log("  Status:", lastResult.lastStatus)
        console.log("  Status Text:", lastResult.lastStatusText)
        console.log("  Headers:", lastResult.lastHeaders)
        console.log("  Data:", lastResult.lastData)
      }
      toast.success("Files uploaded successfully!")
    } catch (error) {
      console.error("❌ Upload failed:", error)
      if (axios.isAxiosError(error)) {
        console.error("  Response status:", error.response?.status)
        console.error("  Response data:", error.response?.data)
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
      setUploadProgress(0)
      abortControllerRef.current = null
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xl font-semibold">Upload Datasets</h3>
        <p className="text-muted-foreground">
          Upload your benchmark datasets. We support a wide variety of genetic
          data formats.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          💡 <strong>Tip:</strong> If you have multiple files or need to
          preserve directory structures, consider uploading a ZIP file
          containing all your data files.
        </p>

        {/* Upload Status Indicator */}
        {isUploading && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Upload in progress... {uploadProgress}%
              </span>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={cancelUpload}
              >
                Cancel
              </Button>
            </div>
            <p className="mt-1 text-xs text-blue-600">
              You can safely navigate to other tabs. Upload will continue in the
              background.
            </p>
          </div>
        )}

        {/* Supported File Types Collapsible Section */}
        <div className="mt-4">
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
                <CardTitle>📁 Files Restored from Server</CardTitle>
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
                  📁 Files restored from server - you can upload additional
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
                          <div className="mb-1 flex items-center gap-2">
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

          {uploadedFiles.length > 0 && (
            <Card>
              <CardContent>
                <div className="mt-4">
                  <Button
                    onClick={handleUpload}
                    disabled={
                      isUploading ||
                      uploadedFileIds.length === uploadedFiles.length ||
                      uploadedFiles.length === 0
                    }
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : uploadedFileIds.length === uploadedFiles.length ? (
                      "All Files Uploaded"
                    ) : uploadedFiles.length === 0 ? (
                      "No Files Selected"
                    ) : (
                      "Upload Files"
                    )}
                  </Button>
                  {isUploading && (
                    <Progress value={uploadProgress} className="mt-2" />
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
      {/* The JobTracker component is removed as per the edit hint */}
      <div className="mt-4 flex gap-2">
        {onPrevious && (
          <Button variant="secondary" onClick={onPrevious}>
            Back
          </Button>
        )}
        <Button
          onClick={() => onNext({ uploadedFiles, uploadedFileIds })}
          disabled={uploadedFiles.length === 0 && !hasServerUploads}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
