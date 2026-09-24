import { create } from "zustand"
import {
  persist,
  createJSONStorage,
  devtools,
  subscribeWithSelector,
} from "zustand/middleware"
import type {
  ToolStatusEvent,
  LogLine,
  AggregateProgress,
} from "@/types/benchmarking"
import {
  emptyJobDraft,
  syncJobDraft,
  updateToolInJob,
  withEvaluationType,
} from "@/components/benchmarking/job-config"
import type {
  EvaluationType,
  JobDraft,
  ToolDraft,
  ToolId,
} from "@/components/benchmarking/job-config"

export interface BenchmarkingState {
  // Job management
  jobId: string | null
  jobStatus: string | null

  // Workflow state
  activeStep: string
  completedSteps: string[]
  stepData: Record<string, any>

  // Upload state
  uploadedFiles: Array<{
    id: string
    name: string
    size: number
    type: string
    file?: File
  }>
  uploadedFileIds: string[]
  hasServerUploads: boolean
  isUploading: boolean
  uploadProgress: number

  // UI state
  isSidebarCollapsed: boolean

  /** Every tool's draft config, by job id. What the mapping and configure pages edit. */
  jobDrafts: Record<string, JobDraft>

  // SSE-driven state (not persisted)
  sseConnected: boolean
  sseStatus: string
  toolStates: Record<string, ToolStatusEvent>
  toolLogs: Record<string, LogLine[]>
  jobLogs: LogLine[]
  aggregateProgress: AggregateProgress | null
  extractionProgress: { current: number; total: number } | null

  // Actions
  setJobId: (jobId: string | null) => void
  setJobStatus: (status: string | null) => void
  setActiveStep: (step: string) => void
  addCompletedStep: (step: string) => void
  removeCompletedStep: (step: string) => void
  setStepData: (stepId: string, data: any) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  resetWorkflow: () => void
  clearJob: () => void

  // Job draft actions
  /** Keeps the job's drafts in step with the selected tools. */
  syncJobTools: (jobId: string, tools: string[]) => void
  setJobEvaluationType: (jobId: string, evaluationType: EvaluationType) => void
  updateToolDraft: (
    jobId: string,
    tool: ToolId,
    update: (draft: ToolDraft) => ToolDraft
  ) => void
  /** Replaces a job's drafts wholesale; the dev drawer loads dumps with it. */
  replaceJobDraft: (jobId: string, job: JobDraft) => void

  // SSE actions
  setSseConnected: (connected: boolean) => void
  setSseStatus: (status: string) => void
  setToolStates: (states: Record<string, ToolStatusEvent>) => void
  updateToolState: (tool: string, state: ToolStatusEvent) => void
  appendToolLogs: (tool: string, lines: LogLine[]) => void
  setToolLogs: (tool: string, lines: LogLine[]) => void
  appendJobLogs: (lines: LogLine[]) => void
  setJobLogs: (lines: LogLine[]) => void
  setAggregateProgress: (progress: AggregateProgress | null) => void
  setExtractionProgress: (
    progress: { current: number; total: number } | null
  ) => void
  clearSseState: () => void

  // Upload actions
  setUploadedFiles: (
    files: Array<{
      id: string
      name: string
      size: number
      type: string
      file?: File
    }>
  ) => void
  setUploadedFileIds: (ids: string[]) => void
  setHasServerUploads: (hasUploads: boolean) => void
  addUploadedFile: (file: {
    id: string
    name: string
    size: number
    type: string
    file?: File
  }) => void
  removeUploadedFile: (fileId: string) => void
  clearUploadState: () => void
  setIsUploading: (uploading: boolean) => void
  setUploadProgress: (progress: number) => void
}

// Initial state
const initialState = {
  jobId: null,
  jobStatus: null,
  activeStep: "home",
  completedSteps: ["home"],
  stepData: {},
  uploadedFiles: [],
  uploadedFileIds: [],
  hasServerUploads: false,
  isUploading: false,
  uploadProgress: 0,
  isSidebarCollapsed: false,
  jobDrafts: {},
  sseConnected: false,
  sseStatus: "",
  toolStates: {},
  toolLogs: {},
  jobLogs: [],
  aggregateProgress: null,
  extractionProgress: null,
}

export const BENCHMARKING_STORAGE_VERSION = 2

/**
 * Version 1 moved tool configs into `jobDrafts`: drafts saved in the old per-tool shapes
 * (pop1/pop2, scoring selectors, n1/n2, ...) are dropped rather than converted.
 * Version 2 dropped the old mapping page's state. The job, its uploads, tool selection and
 * submission record are kept.
 */
export function migrateBenchmarkingState(
  persisted: unknown,
  version: number
): Partial<BenchmarkingState> {
  const state = { ...((persisted ?? {}) as Record<string, unknown>) }
  if (version < 2) {
    delete state.mappingState
    delete state.configActiveTab
  }
  if (version < 1) {
    const stepData = { ...((state.stepData ?? {}) as Record<string, unknown>) }
    for (const key of Object.keys(stepData)) {
      if (
        key === "populations" ||
        key.startsWith("tool_config_") ||
        key.startsWith("tool_processing_config_")
      ) {
        delete stepData[key]
      }
    }
    state.stepData = stepData
  }
  return state as Partial<BenchmarkingState>
}

export const useBenchmarkingStore = create<BenchmarkingState>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          ...initialState,

          // Job management actions
          setJobId: (jobId: string | null) => set({ jobId }),
          setJobStatus: (status: string | null) => set({ jobStatus: status }),

          // Workflow actions
          setActiveStep: (activeStep: string) => set({ activeStep }),

          addCompletedStep: (step: string) => {
            const { completedSteps } = get()
            if (!completedSteps.includes(step)) {
              set({ completedSteps: [...completedSteps, step] })
            }
          },

          removeCompletedStep: (step: string) => {
            const { completedSteps } = get()
            set({ completedSteps: completedSteps.filter((s) => s !== step) })
          },

          setStepData: (stepId: string, data: any) => {
            const { stepData } = get()
            set({ stepData: { ...stepData, [stepId]: data } })
          },

          setSidebarCollapsed: (isSidebarCollapsed: boolean) =>
            set({ isSidebarCollapsed }),

          // SSE actions
          setSseConnected: (sseConnected) => set({ sseConnected }),
          setSseStatus: (sseStatus) => set({ sseStatus }),
          setToolStates: (toolStates) => set({ toolStates }),
          updateToolState: (tool, state) =>
            set((s) => ({
              toolStates: { ...s.toolStates, [tool]: state },
            })),
          appendToolLogs: (tool, lines) =>
            set((s) => {
              const existing = s.toolLogs[tool] || []
              const combined = [...existing, ...lines]
              const maxLines = 1500
              return {
                toolLogs: {
                  ...s.toolLogs,
                  [tool]:
                    combined.length > maxLines
                      ? combined.slice(-maxLines)
                      : combined,
                },
              }
            }),
          setToolLogs: (tool, lines) =>
            set((s) => ({ toolLogs: { ...s.toolLogs, [tool]: lines } })),
          appendJobLogs: (lines) =>
            set((s) => {
              const combined = [...s.jobLogs, ...lines]
              const maxLines = 1500
              return {
                jobLogs:
                  combined.length > maxLines
                    ? combined.slice(-maxLines)
                    : combined,
              }
            }),
          setJobLogs: (lines) => set({ jobLogs: lines }),
          setAggregateProgress: (aggregateProgress) =>
            set({ aggregateProgress }),
          setExtractionProgress: (extractionProgress) =>
            set({ extractionProgress }),
          clearSseState: () =>
            set({
              sseConnected: false,
              sseStatus: "",
              toolStates: {},
              toolLogs: {},
              jobLogs: [],
              aggregateProgress: null,
              extractionProgress: null,
            }),

          // Reset actions
          resetWorkflow: () => set(initialState),

          clearJob: () =>
            set({
              jobId: null,
              jobStatus: null,
              uploadedFiles: [],
              uploadedFileIds: [],
              hasServerUploads: false,
              isUploading: false,
              uploadProgress: 0,
              jobDrafts: {},
              sseConnected: false,
              sseStatus: "",
              toolStates: {},
              toolLogs: {},
              jobLogs: [],
              aggregateProgress: null,
              extractionProgress: null,
            }),

          // Job draft actions
          syncJobTools: (jobId, tools) =>
            set((state) => ({
              jobDrafts: {
                ...state.jobDrafts,
                [jobId]: syncJobDraft(state.jobDrafts[jobId], tools),
              },
            })),

          setJobEvaluationType: (jobId, evaluationType) =>
            set((state) => ({
              jobDrafts: {
                ...state.jobDrafts,
                [jobId]: withEvaluationType(
                  state.jobDrafts[jobId] ?? emptyJobDraft(),
                  evaluationType
                ),
              },
            })),

          replaceJobDraft: (jobId, job) =>
            set((state) => ({
              jobDrafts: { ...state.jobDrafts, [jobId]: job },
            })),

          updateToolDraft: (jobId, tool, update) =>
            set((state) => {
              const job = state.jobDrafts[jobId]
              if (!job) return {}
              return {
                jobDrafts: {
                  ...state.jobDrafts,
                  [jobId]: updateToolInJob(job, tool, update),
                },
              }
            }),

          // Upload actions
          setUploadedFiles: (uploadedFiles) => set({ uploadedFiles }),
          setUploadedFileIds: (uploadedFileIds) => set({ uploadedFileIds }),
          setHasServerUploads: (hasServerUploads) => set({ hasServerUploads }),
          addUploadedFile: (file) => {
            const { uploadedFiles } = get()
            set({ uploadedFiles: [...uploadedFiles, file] })
          },
          removeUploadedFile: (fileId) => {
            const { uploadedFiles, uploadedFileIds } = get()
            set({
              uploadedFiles: uploadedFiles.filter((f) => f.id !== fileId),
              uploadedFileIds: uploadedFileIds.filter((id) => id !== fileId),
            })
          },
          clearUploadState: () =>
            set({
              uploadedFiles: [],
              uploadedFileIds: [],
              hasServerUploads: false,
              isUploading: false,
              uploadProgress: 0,
            }),
          setIsUploading: (isUploading) => set({ isUploading }),
          setUploadProgress: (uploadProgress) => set({ uploadProgress }),
        }),
        {
          name: "benchmarking-storage",
          storage: createJSONStorage(() => localStorage),
          version: BENCHMARKING_STORAGE_VERSION,
          migrate: migrateBenchmarkingState,
          // Only persist certain fields, exclude sensitive data
          partialize: (state) => ({
            jobId: state.jobId,
            jobStatus: state.jobStatus,
            activeStep: state.activeStep,
            completedSteps: state.completedSteps,
            stepData: state.stepData,
            uploadedFiles: state.uploadedFiles,
            uploadedFileIds: state.uploadedFileIds,
            hasServerUploads: state.hasServerUploads,
            isUploading: state.isUploading,
            uploadProgress: state.uploadProgress,
            isSidebarCollapsed: state.isSidebarCollapsed,
            jobDrafts: state.jobDrafts,
          }),
          // Validate data on load
          onRehydrateStorage: () => (state) => {
            if (state) {
              // Validate and sanitize loaded data
              if (!state.activeStep || typeof state.activeStep !== "string") {
                state.activeStep = "tools"
              }
              if (!Array.isArray(state.completedSteps)) {
                state.completedSteps = []
              }
              if (
                typeof state.stepData !== "object" ||
                state.stepData === null
              ) {
                state.stepData = {}
              }
              if (!Array.isArray(state.uploadedFiles)) {
                state.uploadedFiles = []
              }
              if (!Array.isArray(state.uploadedFileIds)) {
                state.uploadedFileIds = []
              }
              if (typeof state.hasServerUploads !== "boolean") {
                state.hasServerUploads = false
              }
              if (typeof state.isUploading !== "boolean") {
                state.isUploading = false
              }
              if (typeof state.uploadProgress !== "number") {
                state.uploadProgress = 0
              }
              if (typeof state.isSidebarCollapsed !== "boolean") {
                state.isSidebarCollapsed = false
              }
              if (
                typeof state.jobDrafts !== "object" ||
                state.jobDrafts === null
              ) {
                state.jobDrafts = {}
              }
            }
          },
        }
      )
    ),
    { name: "benchmarking-store" }
  )
)

// Selector hooks for better performance
export const useJobId = () => useBenchmarkingStore((state) => state.jobId)
export const useJobStatus = () =>
  useBenchmarkingStore((state) => state.jobStatus)
export const useActiveStep = () =>
  useBenchmarkingStore((state) => state.activeStep)
export const useCompletedSteps = () =>
  useBenchmarkingStore((state) => state.completedSteps)
export const useStepData = () => useBenchmarkingStore((state) => state.stepData)
export const useSidebarCollapsed = () =>
  useBenchmarkingStore((state) => state.isSidebarCollapsed)

// Upload state selectors
export const useUploadedFiles = () =>
  useBenchmarkingStore((state) => state.uploadedFiles)
export const useUploadedFileIds = () =>
  useBenchmarkingStore((state) => state.uploadedFileIds)
export const useHasServerUploads = () =>
  useBenchmarkingStore((state) => state.hasServerUploads)
export const useIsUploading = () =>
  useBenchmarkingStore((state) => state.isUploading)
export const useUploadProgress = () =>
  useBenchmarkingStore((state) => state.uploadProgress)

// Combined upload state selector for sidebar
export const useUploadState = () =>
  useBenchmarkingStore((state) => ({
    isUploading: state.isUploading,
    uploadProgress: state.uploadProgress,
  }))

// Job draft selectors
export const useJobDraft = (jobId: string | null) =>
  useBenchmarkingStore((state) => (jobId ? state.jobDrafts[jobId] : undefined))
export const useToolDraft = (jobId: string | null, tool: ToolId) =>
  useBenchmarkingStore((state) =>
    jobId
      ? state.jobDrafts[jobId]?.tools.find((draft) => draft.tool === tool)
      : undefined
  )
