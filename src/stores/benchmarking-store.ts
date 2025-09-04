import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

// Types for the benchmarking workflow
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
  activeStep: "tools",
  completedSteps: [],
  stepData: {},
  uploadedFiles: [],
  uploadedFileIds: [],
  hasServerUploads: false,
  isUploading: false,
  uploadProgress: 0,
  isSidebarCollapsed: false,
}

export const useBenchmarkingStore = create<BenchmarkingState>()(
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
          if (typeof state.stepData !== "object" || state.stepData === null) {
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
        }
      },
    }
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
