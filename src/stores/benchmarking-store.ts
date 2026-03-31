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

// Types for the benchmarking workflow
export interface ToolPopulationState {
  targetPopulation: string
  sourcePopulation: string
}

export interface PrscsxTargetPopulation {
  id: string
  name: string
  sumstatsPath: string
  genotypePath: string
  phenotypePath: string
  covariatePath?: string
  includeCovariate: boolean
}

export interface PrscsxBasePopulation {
  id: string
  name: string
  sumstatsPath: string
  genotypePath?: string
  phenotypePath?: string
  covariatePath?: string
  includeGenotype: boolean
  includePhenotype: boolean
  includeCovariate: boolean
}

export interface PrscsxPopulationState {
  target: PrscsxTargetPopulation
  bases: PrscsxBasePopulation[]
}

export interface MappingToolState {
  populations: ToolPopulationState
  prscsx?: PrscsxPopulationState
  fields: Record<string, unknown>
}

export interface MappingJobState {
  activeTool: string | null
  toolConfigs: Record<string, MappingToolState>
}

const createEmptyToolState = (): MappingToolState => ({
  populations: { targetPopulation: "", sourcePopulation: "" },
  prscsx: createDefaultPrscsxState(),
  fields: {},
})

const createEmptyMappingJobState = (): MappingJobState => ({
  activeTool: null,
  toolConfigs: {},
})

const generateId = () => Math.random().toString(36).slice(2, 10)

const createDefaultPrscsxTarget = (): PrscsxTargetPopulation => ({
  id: "target",
  name: "",
  sumstatsPath: "",
  genotypePath: "",
  phenotypePath: "",
  covariatePath: "",
  includeCovariate: false,
})

const createDefaultPrscsxBase = (): PrscsxBasePopulation => ({
  id: generateId(),
  name: "",
  sumstatsPath: "",
  genotypePath: "",
  phenotypePath: "",
  covariatePath: "",
  includeGenotype: false,
  includePhenotype: false,
  includeCovariate: false,
})

const createDefaultPrscsxState = (): PrscsxPopulationState => ({
  target: createDefaultPrscsxTarget(),
  bases: [createDefaultPrscsxBase()],
})

const shallowEqual = <T extends object>(a: T, b: T) => {
  const aKeys = Object.keys(a as Record<string, unknown>)
  const bKeys = Object.keys(b as Record<string, unknown>)

  if (aKeys.length !== bKeys.length) {
    return false
  }

  for (const key of aKeys) {
    // eslint-disable-next-line
    const aRec = a as any
    // eslint-disable-next-line
    const bRec = b as any
    if (aRec[key] !== bRec[key]) {
      return false
    }
  }

  return true
}

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
  configActiveTab: string | null

  // Mapping state
  mappingState: Record<string, MappingJobState>

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
  setConfigActiveTab: (tab: string | null) => void
  resetWorkflow: () => void
  clearJob: () => void

  // Mapping actions
  setMappingActiveTool: (toolId: string | null) => void
  setToolPopulation: (toolId: string, population: ToolPopulationState) => void
  setToolMappings: (toolId: string, mappings: Record<string, unknown>) => void
  setToolFieldValue: (toolId: string, fieldId: string, value: unknown) => void
  ensureToolFields: (toolId: string, fieldIds: string[]) => void
  setPrscsxTargetPopulation: (
    updates: Partial<Omit<PrscsxTargetPopulation, "id">> & { name?: string }
  ) => void
  addPrscsxBasePopulation: (
    base?: Partial<Omit<PrscsxBasePopulation, "id">> & { name?: string }
  ) => string
  updatePrscsxBasePopulation: (
    baseId: string,
    updates: Partial<Omit<PrscsxBasePopulation, "id">>
  ) => void
  removePrscsxBasePopulation: (baseId: string) => void
  resetMappingForJob: (jobId: string) => void

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
  setExtractionProgress: (progress: { current: number; total: number } | null) => void
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
  configActiveTab: null,
  mappingState: {},
  sseConnected: false,
  sseStatus: "",
  toolStates: {},
  toolLogs: {},
  jobLogs: [],
  aggregateProgress: null,
  extractionProgress: null,
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

      setConfigActiveTab: (configActiveTab: string | null) =>
        set({ configActiveTab }),

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
              [tool]: combined.length > maxLines
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
            jobLogs: combined.length > maxLines ? combined.slice(-maxLines) : combined,
          }
        }),
      setJobLogs: (lines) => set({ jobLogs: lines }),
      setAggregateProgress: (aggregateProgress) => set({ aggregateProgress }),
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
          mappingState: {},
          sseConnected: false,
          sseStatus: "",
          toolStates: {},
          toolLogs: {},
          jobLogs: [],
          aggregateProgress: null,
          extractionProgress: null,
        }),

      // Mapping actions
      setMappingActiveTool: (toolId) =>
        set((state) => {
          const jobId = state.jobId
          if (!jobId) {
            return state
          }

          const existingMapping = state.mappingState[jobId]
          const jobMapping = existingMapping ?? createEmptyMappingJobState()
          const currentActive = jobMapping.activeTool ?? null
          const nextActive = toolId ?? null

          console.log("[store] setMappingActiveTool", { jobId, currentActive, nextActive })

          if (currentActive === nextActive) {
            return state
          }

          const nextMappingState = {
            ...state.mappingState,
            [jobId]: {
              ...jobMapping,
              activeTool: nextActive,
            },
          }

          return {
            ...state,
            mappingState: nextMappingState,
          }
        }),

      setToolPopulation: (toolId, population) =>
        set((state) => {
          const jobId = state.jobId
          if (!jobId) {
            return state
          }

          const jobMapping =
            state.mappingState[jobId] ?? createEmptyMappingJobState()
          const currentTool =
            jobMapping.toolConfigs[toolId] ?? createEmptyToolState()

          const nextPopulation: ToolPopulationState = {
            targetPopulation: population.targetPopulation,
            sourcePopulation: population.sourcePopulation,
          }

          const currentPopulation = currentTool.populations

          console.log("[store] setToolPopulation", {
            jobId,
            toolId,
            currentPopulation,
            nextPopulation,
          })

          if (
            currentPopulation.targetPopulation === nextPopulation.targetPopulation &&
            currentPopulation.sourcePopulation === nextPopulation.sourcePopulation
          ) {
            return state
          }

          return {
            ...state,
            mappingState: {
              ...state.mappingState,
              [jobId]: {
                ...jobMapping,
                toolConfigs: {
                  ...jobMapping.toolConfigs,
                  [toolId]: {
                    ...currentTool,
                    populations: nextPopulation,
                  },
                },
              },
            },
          }
        }),

      setToolMappings: (toolId, mappings) =>
        set((state) => {
          const jobId = state.jobId
          if (!jobId) {
            return state
          }

          const jobMapping =
            state.mappingState[jobId] ?? createEmptyMappingJobState()
          const currentTool =
            jobMapping.toolConfigs[toolId] ?? createEmptyToolState()

          const nextMappings = { ...mappings }
          const sameValues = Object.keys(nextMappings).every((key) => {
            return currentTool.fields[key] === nextMappings[key]
          })

          console.log("[store] setToolMappings", {
            jobId,
            toolId,
            sameValues,
            keys: Object.keys(nextMappings),
          })

          if (sameValues) {
            return state
          }

          return {
            ...state,
            mappingState: {
              ...state.mappingState,
              [jobId]: {
                ...jobMapping,
                toolConfigs: {
                  ...jobMapping.toolConfigs,
                  [toolId]: {
                    ...currentTool,
                    fields: nextMappings,
                  },
                },
              },
            },
          }
        }),

      setToolFieldValue: (toolId, fieldId, value) =>
        set((state) => {
          const jobId = state.jobId
          if (!jobId) {
            return state
          }

          const jobMapping =
            state.mappingState[jobId] ?? createEmptyMappingJobState()
          const currentTool =
            jobMapping.toolConfigs[toolId] ?? createEmptyToolState()
          const currentValue = currentTool.fields[fieldId]

          if (currentValue === value) {
            return state
          }

          return {
            ...state,
            mappingState: {
              ...state.mappingState,
              [jobId]: {
                ...jobMapping,
                toolConfigs: {
                  ...jobMapping.toolConfigs,
                  [toolId]: {
                    ...currentTool,
                    fields: {
                      ...currentTool.fields,
                      [fieldId]: value,
                    },
                  },
                },
              },
            },
          }
        }),

      ensureToolFields: (toolId, fieldIds) =>
        set((state) => {
          const jobId = state.jobId
          if (!jobId) {
            return state
          }

          const jobMapping =
            state.mappingState[jobId] ?? createEmptyMappingJobState()
          const currentTool =
            jobMapping.toolConfigs[toolId] ?? createEmptyToolState()
          const nextFields = { ...currentTool.fields }
          let changed = !jobMapping.toolConfigs[toolId]

          fieldIds.forEach((fieldId) => {
            if (!(fieldId in nextFields)) {
              nextFields[fieldId] = null
              changed = true
            }
          })

          console.log("[store] ensureToolFields", { jobId, toolId, changed })

          if (!changed) {
            return state
          }

          return {
            ...state,
            mappingState: {
              ...state.mappingState,
              [jobId]: {
                ...jobMapping,
                toolConfigs: {
                  ...jobMapping.toolConfigs,
                  [toolId]: {
                    ...currentTool,
                    fields: nextFields,
                  },
                },
              },
            },
          }
        }),

      setPrscsxTargetPopulation: (updates) =>
        set((state) => {
          const jobId = state.jobId
          if (!jobId) {
            return state
          }

          const existingMapping = state.mappingState[jobId]
          const jobMapping = existingMapping ?? createEmptyMappingJobState()
          const toolId = "prscsx"
          const existingToolState =
            jobMapping.toolConfigs[toolId] ?? createEmptyToolState()
          const currentPrscsx =
            existingToolState.prscsx ?? createDefaultPrscsxState()

          const nextTarget: PrscsxTargetPopulation = {
            ...currentPrscsx.target,
            ...updates,
          }

          if (updates.name !== undefined) {
            nextTarget.name = updates.name.trim()
          }

          if (updates.includeCovariate !== undefined) {
            nextTarget.includeCovariate = Boolean(updates.includeCovariate)
          }

          if (
            nextTarget.covariatePath === undefined ||
            nextTarget.covariatePath === null
          ) {
            nextTarget.covariatePath = currentPrscsx.target.covariatePath ?? ""
          }

          if (shallowEqual(currentPrscsx.target, nextTarget)) {
            return state
          }

          const nextPrscsx: PrscsxPopulationState = {
            ...currentPrscsx,
            target: nextTarget,
          }

          let nextFields = existingToolState.fields
          if (!nextTarget.includeCovariate) {
            const fieldKey = "prscsx.target.covariate_path"
            if (fieldKey in nextFields) {
              nextFields = { ...nextFields }
              delete nextFields[fieldKey]
            }
          }

          const nextToolState: MappingToolState = {
            ...existingToolState,
            populations: {
              ...existingToolState.populations,
              targetPopulation: nextTarget.name,
            },
            prscsx: nextPrscsx,
            fields: nextFields,
          }

          return {
            ...state,
            mappingState: {
              ...state.mappingState,
              [jobId]: {
                ...jobMapping,
                toolConfigs: {
                  ...jobMapping.toolConfigs,
                  [toolId]: nextToolState,
                },
              },
            },
          }
        }),

      addPrscsxBasePopulation: (base) => {
        const newId = generateId()

        set((state) => {
          const jobId = state.jobId
          if (!jobId) {
            return state
          }

          const existingMapping = state.mappingState[jobId]
          const jobMapping = existingMapping ?? createEmptyMappingJobState()
          const toolId = "prscsx"
          const existingToolState =
            jobMapping.toolConfigs[toolId] ?? createEmptyToolState()
          const currentPrscsx =
            existingToolState.prscsx ?? createDefaultPrscsxState()

          const baseTemplate = createDefaultPrscsxBase()
          const newBase: PrscsxBasePopulation = {
            ...baseTemplate,
            id: newId,
            name: (base?.name ?? "").trim(),
            sumstatsPath: baseTemplate.sumstatsPath,
            genotypePath: baseTemplate.genotypePath,
            phenotypePath: baseTemplate.phenotypePath,
            covariatePath: baseTemplate.covariatePath,
            includeGenotype: Boolean(base?.includeGenotype),
            includePhenotype: Boolean(base?.includePhenotype),
            includeCovariate: Boolean(base?.includeCovariate),
          }

          const nextBases = [...currentPrscsx.bases, newBase]
          const nextPrscsx: PrscsxPopulationState = {
            ...currentPrscsx,
            bases: nextBases,
          }

          const nextToolState: MappingToolState = {
            ...existingToolState,
            populations: {
              ...existingToolState.populations,
              sourcePopulation: nextBases[0]?.name ?? "",
            },
            prscsx: nextPrscsx,
            fields: existingToolState.fields,
          }

          return {
            ...state,
            mappingState: {
              ...state.mappingState,
              [jobId]: {
                ...jobMapping,
                toolConfigs: {
                  ...jobMapping.toolConfigs,
                  [toolId]: nextToolState,
                },
              },
            },
          }
        })

        return newId
      },

      updatePrscsxBasePopulation: (baseId, updates) =>
        set((state) => {
          const jobId = state.jobId
          if (!jobId) {
            return state
          }

          const existingMapping = state.mappingState[jobId]
          const jobMapping = existingMapping ?? createEmptyMappingJobState()
          const toolId = "prscsx"
          const existingToolState =
            jobMapping.toolConfigs[toolId] ?? createEmptyToolState()
          const currentPrscsx =
            existingToolState.prscsx ?? createDefaultPrscsxState()

          const baseIndex = currentPrscsx.bases.findIndex(
            (base) => base.id === baseId
          )

          if (baseIndex === -1) {
            return state
          }

          const currentBase = currentPrscsx.bases[baseIndex]

          const nextBase: PrscsxBasePopulation = {
            ...currentBase,
            ...updates,
          }

          if (updates.name !== undefined) {
            nextBase.name = updates.name.trim()
          }
          if (updates.includeGenotype !== undefined) {
            nextBase.includeGenotype = Boolean(updates.includeGenotype)
          }
          if (updates.includePhenotype !== undefined) {
            nextBase.includePhenotype = Boolean(updates.includePhenotype)
          }
          if (updates.includeCovariate !== undefined) {
            nextBase.includeCovariate = Boolean(updates.includeCovariate)
          }

          if (shallowEqual(currentBase, nextBase)) {
            return state
          }

          const nextBases = [...currentPrscsx.bases]
          nextBases[baseIndex] = nextBase

          const nextPrscsx: PrscsxPopulationState = {
            ...currentPrscsx,
            bases: nextBases,
          }

          const prefix = `prscsx.base.${baseId}`
          let nextFields = existingToolState.fields
          const maybeRemoveField = (
            shouldRemove: boolean,
            field: string
          ) => {
            if (shouldRemove && field in nextFields) {
              nextFields = { ...nextFields }
              delete nextFields[field]
            }
          }

          maybeRemoveField(
            currentBase.includeGenotype && !nextBase.includeGenotype,
            `${prefix}.genotype_path`
          )
          maybeRemoveField(
            currentBase.includePhenotype && !nextBase.includePhenotype,
            `${prefix}.phenotype_path`
          )
          maybeRemoveField(
            currentBase.includeCovariate && !nextBase.includeCovariate,
            `${prefix}.covariate_path`
          )

          const nextToolState: MappingToolState = {
            ...existingToolState,
            populations: {
              ...existingToolState.populations,
              sourcePopulation: nextBases[0]?.name ?? "",
            },
            prscsx: nextPrscsx,
            fields: nextFields,
          }

          return {
            ...state,
            mappingState: {
              ...state.mappingState,
              [jobId]: {
                ...jobMapping,
                toolConfigs: {
                  ...jobMapping.toolConfigs,
                  [toolId]: nextToolState,
                },
              },
            },
          }
        }),

      removePrscsxBasePopulation: (baseId) =>
        set((state) => {
          const jobId = state.jobId
          if (!jobId) {
            return state
          }

          const existingMapping = state.mappingState[jobId]
          const jobMapping = existingMapping ?? createEmptyMappingJobState()
          const toolId = "prscsx"
          const existingToolState =
            jobMapping.toolConfigs[toolId] ?? createEmptyToolState()
          const currentPrscsx =
            existingToolState.prscsx ?? createDefaultPrscsxState()

          if (currentPrscsx.bases.length <= 1) {
            return state
          }

          const nextBases = currentPrscsx.bases.filter(
            (base) => base.id !== baseId
          )

          if (nextBases.length === currentPrscsx.bases.length) {
            return state
          }

          const nextPrscsx: PrscsxPopulationState = {
            ...currentPrscsx,
            bases: nextBases,
          }

          const nextFields = Object.fromEntries(
            Object.entries(existingToolState.fields).filter(
              ([fieldId]) => !fieldId.startsWith(`prscsx.base.${baseId}.`)
            )
          )

          const nextToolState: MappingToolState = {
            ...existingToolState,
            populations: {
              ...existingToolState.populations,
              sourcePopulation: nextBases[0]?.name ?? "",
            },
            prscsx: nextPrscsx,
            fields: nextFields,
          }

          return {
            ...state,
            mappingState: {
              ...state.mappingState,
              [jobId]: {
                ...jobMapping,
                toolConfigs: {
                  ...jobMapping.toolConfigs,
                  [toolId]: nextToolState,
                },
              },
            },
          }
        }),

      resetMappingForJob: (jobId) =>
        set((state) => {
          if (!jobId || !state.mappingState[jobId]) {
            return {}
          }

          const nextMappingState = { ...state.mappingState }
          delete nextMappingState[jobId]

          return { mappingState: nextMappingState }
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
          mappingState: state.mappingState,
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
            if (
              typeof state.mappingState !== "object" ||
              state.mappingState === null
            ) {
              state.mappingState = {}
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
