/**
 * useMappingDataLoader
 *
 * Hook for loading dataset structure during the mapping step.
 * Fetches and caches the file/directory structure for drag-and-drop.
 */

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { getBenchmarkUploadUrl } from "@/lib/config"

export interface DirectoryItem {
  name: string
  path: string
  file_count: number
  total_size: number
  total_size_formatted: string
}

export interface FileInfo {
  name: string
  path: string
  size: number
  size_formatted: string
  file_type: string
  is_previewable: boolean
  last_modified: string
}

export interface DatasetStructure {
  directories: DirectoryItem[]
  files: FileInfo[]
  total_files: number
  total_directories: number
  extracted_size: string
  root_path: string
}

export interface ExploreResponse {
  job_id: string
  status: string
  dataset_structure: DatasetStructure
}

export interface UseMappingDataLoaderOptions {
  /** Job ID to load data for */
  jobId: string | null
  /** Whether to enable loading (default: true) */
  enabled?: boolean
  /** Callback when data is loaded */
  onDataLoaded?: (data: DatasetStructure) => void
}

export interface UseMappingDataLoaderReturn {
  /** Loaded dataset structure */
  datasetStructure: DatasetStructure | null
  /** Whether data is currently loading */
  isLoading: boolean
  /** Any error that occurred */
  error: string | null
  /** Manually reload the data */
  reload: () => Promise<void>
}

/**
 * Hook for loading dataset structure for mapping
 *
 * @example
 * const { datasetStructure, isLoading, error, reload } = useMappingDataLoader({
 *   jobId,
 *   onDataLoaded: (data) => console.log('Loaded', data.total_files, 'files'),
 * })
 */
export function useMappingDataLoader({
  jobId,
  enabled = true,
  onDataLoaded,
}: UseMappingDataLoaderOptions): UseMappingDataLoaderReturn {
  const [datasetStructure, setDatasetStructure] =
    useState<DatasetStructure | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!jobId) return

    setIsLoading(true)
    setError(null)

    try {
      const exploreUrl = `${getBenchmarkUploadUrl()}/${jobId}/explore`
      const res = await axios.get<ExploreResponse>(exploreUrl)
      const structure = res.data?.dataset_structure

      if (structure) {
        setDatasetStructure(structure)
        onDataLoaded?.(structure)
      } else {
        setError("No dataset structure in response")
      }
    } catch (e: any) {
      const message =
        e?.response?.data?.message || e?.message || "Failed to load dataset"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [jobId, onDataLoaded])

  // Load on mount or when jobId changes
  useEffect(() => {
    if (enabled && jobId) {
      loadData()
    }
  }, [enabled, jobId, loadData])

  return {
    datasetStructure,
    isLoading,
    error,
    reload: loadData,
  }
}

export default useMappingDataLoader
