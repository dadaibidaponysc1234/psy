import { create } from "zustand"
import benchmarkApi from "@/lib/benchmark-api"
import { getBenchmarkPreviewUrl } from "@/lib/config"
import { splitLine } from "@/components/benchmarking/configure-step/preview"

export interface FilePreview {
  /** What the backend previewed; with `random_pick` it's one file in the folder. */
  filename: string
  lines: string[]
  headers: string[]
}

export type PreviewEntry =
  | { status: "loading" }
  | { status: "ready"; preview: FilePreview }
  | { status: "error" }

interface PreviewState {
  /** Keyed by `previewKey(jobId, path)`. */
  entries: Record<string, PreviewEntry>
  /** Which of a folder's files is being shown, keyed by the folder's `previewKey`. */
  cursors: Record<string, number>
  load: (
    jobId: string,
    path: string,
    options?: { randomPick?: boolean }
  ) => Promise<FilePreview | null>
  setCursor: (key: string, index: number) => void
}

export const previewKey = (jobId: string, path: string) => `${jobId}::${path}`

/**
 * File previews for the session. They live outside the forms so switching tabs, or leaving
 * the page and coming back, doesn't lose them. Not persisted: a reload fetches again.
 */
export const usePreviews = create<PreviewState>((set) => ({
  entries: {},
  cursors: {},
  load: async (jobId, path, options) => {
    const key = previewKey(jobId, path)
    set((state) => ({
      entries: { ...state.entries, [key]: { status: "loading" } },
    }))
    try {
      const response = await benchmarkApi.get<{
        filename?: string
        preview_lines?: string[]
      }>(getBenchmarkPreviewUrl(jobId, path, options))
      const lines = response.data.preview_lines ?? []
      const preview: FilePreview = {
        filename: response.data.filename || path.split("/").pop() || path,
        lines,
        headers: splitLine(lines[0] ?? ""),
      }
      set((state) => ({
        entries: { ...state.entries, [key]: { status: "ready", preview } },
      }))
      return preview
    } catch (error) {
      console.error("[Configure] Preview failed", { path, error })
      set((state) => ({
        entries: { ...state.entries, [key]: { status: "error" } },
      }))
      return null
    }
  },
  setCursor: (key, index) =>
    set((state) => ({ cursors: { ...state.cursors, [key]: index } })),
}))
