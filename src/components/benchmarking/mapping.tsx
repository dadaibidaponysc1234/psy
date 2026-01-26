"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableSelect, type SearchableSelectItem } from "@/components/ui/searchable-select"
import {
  Folder,
  File,
  Loader2,
  RefreshCw,
  X,
  MapPin,
  AlertTriangle,
  Info,
} from "lucide-react"
import { Tooltip } from "@/components/ui/tooltip"
import { getBenchmarkUploadUrl, getBenchmarkJobStatusUrl } from "@/lib/config"
import axios from "axios"
import { toast } from "react-hot-toast"
import { FileExplorer } from "./file-explorer"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import {
  ToolPopulationState,
  PrscsxPopulationState,
  PrscsxTargetPopulation,
} from "@/stores/benchmarking-store"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"
import {
  useJobId,
  useJobMapping,
  useMappingActions,
  usePrscsxConfig,
} from "@/stores/selectors"
import { PrscsxTargetModal } from "@/components/benchmarking/prscsx/PrscsxTargetModal"
import {
  PrscsxBaseModal,
  PrscsxBaseModalValues,
} from "@/components/benchmarking/prscsx/PrscsxBaseModal"
import { PrsicePopulationConfiguration } from "./mapping/tools/prsice-population-configuration"
import { PrscsxPopulationConfiguration } from "./mapping/tools/prscsx-population-configuration"
import { BridgeprsPopulationConfiguration } from "./mapping/tools/bridgeprs-population-configuration"
import { SdprxPopulationConfiguration } from "./mapping/tools/sdprx-population-configuration"
import { XpassPopulationConfiguration } from "./mapping/tools/xpass-population-configuration"

interface DirectoryItem {
  name: string
  path: string
  file_count: number
  total_size: number
  total_size_formatted: string
}

interface FileInfo {
  name: string
  path: string
  size: number
  size_formatted: string
  file_type: string
  is_previewable: boolean
  last_modified: string
}

interface DatasetStructure {
  directories: DirectoryItem[]
  files: FileInfo[]
  total_files: number
  total_directories: number
  extracted_size: string
  root_path: string
}

interface JobStatusResponse {
  job_id: string
  status: string
  created_at: string
  uploaded_at: string
  processing_started_at: string
  processing_completed_at: string | null
  processing_details: {
    uploaded_files: string[]
    zip_files_to_extract: string[]
    message: string
  }
}

interface ExploreResponse {
  job_id: string
  status: string
  dataset_structure: DatasetStructure
}

interface PopulationConfig {
  name: string
  sumstats_path: string
  genotype_path: string
  phenotype_path: string
}

interface ToolConfig {
  target_population: PopulationConfig
  source_population: PopulationConfig
  // output_dir: string
  // column_mappings: Record<string, string>
  // phenotype_config: {
  //   target_population: {
  //     binary_traits: string[]
  //     quantitative_traits: string[]
  //   }
  //   source_population: {
  //     binary_traits: string[]
  //     quantitative_traits: string[]
  //   }
  // }
  // genotype_config: {
  //   file_type: string
  //   population_reference: string
  //   file_patterns: {
  //     bed: string
  //     bim: string
  //     fam: string
  //   }
  // }
  // processing_options: {
  //   process_binary_phenotypes: boolean
  //   process_quantitative_phenotypes: boolean
  //   skip_missing_columns: boolean
  //   overwrite_existing: boolean
  // }
}

interface MappingField {
  id: string
  label: string
  description: string
  acceptedTypes: string[]
  required: boolean
  population: "target" | "source" | "prscsx-target" | "prscsx-base"
  populationKey?: string
  fieldType:
    | "sumstats_path"
    | "genotype_directory"
    | "phenotype_path"
    | "covariate_path"
}

interface MappingProps {
  onNext: (data: any) => void
  onPrevious?: () => void
  data?: any
  toolsData?: any
}
const toolDisplayNames: Record<string, string> = {
  prsice: "PRSice",
  prscsx: "PRScsx",
  bridgeprs: "BridgePRS",
  sdprx: "SDPRX",
  xpass: "XPASS",
  "xpass+": "XPASS+",
}

const isXpassFamily = (toolId: string) => {
  const k = toolId.toLowerCase()
  return k === "xpass" || k === "xpass+"
}

// Get mapping fields based on the config structure
const getToolMappingFields = (
  tool: string,
  prscsxConfig?: PrscsxPopulationState
): MappingField[] => {
  const toolKey = tool.toLowerCase()
  const baseFields: MappingField[] = [
    // Target Population fields
    {
      id: "target_population.sumstats_path",
      label: "Target Population - Summary Statistics",
      description: "Summary statistics file for target population",
      acceptedTypes: [".txt", ".csv", ".sumstats", ".tsv", ".gz"],
      required: true,
      population: "target",
      fieldType: "sumstats_path",
    },
    {
      id: "target_population.genotype_path",
      label: "Target Population - Genotype Directory",
      description:
        "Directory containing PLINK format genotype files (.bed, .bim, .fam) for target population",
      acceptedTypes: ["Directory"],
      required: true,
      population: "target",
      fieldType: "genotype_directory",
    },
    {
      id: "target_population.phenotype_path",
      label: "Target Population - Phenotype File",
      description: "Phenotype data file for target population",
      acceptedTypes: ["Any file"],
      required: true,
      population: "target",
      fieldType: "phenotype_path",
    },
    // Source Population fields
    {
      id: "source_population.sumstats_path",
      label: "Source Population - Summary Statistics",
      description: "Summary statistics file for source population",
      acceptedTypes: [".txt", ".csv", ".sumstats", ".tsv", ".gz"],
      required: true,
      population: "source",
      fieldType: "sumstats_path",
    },
    {
      id: "source_population.genotype_path",
      label: "Source Population - Genotype Directory",
      description:
        "Directory containing PLINK format genotype files (.bed, .bim, .fam) for source population",
      acceptedTypes: ["Directory"],
      required: true,
      population: "source",
      fieldType: "genotype_directory",
    },
    {
      id: "source_population.phenotype_path",
      label: "Source Population - Phenotype File",
      description: "Phenotype data file for source population",
      acceptedTypes: ["Any file"],
      required: true,
      population: "source",
      fieldType: "phenotype_path",
    },
  ]

  if (toolKey === "prsice") {
    return baseFields
  }

  if (toolKey === "bridgeprs") {
    return baseFields.map((field) => {
      if (field.population === "target") {
        return {
          ...field,
          id: field.id.replace("target_population", "pop1"),
          label: field.label,
          description: field.description,
        }
      }

      if (field.population === "source") {
        let description = field.description
        if (field.fieldType === "sumstats_path") {
          description = "Summary statistics file for the base population"
        } else if (field.fieldType === "genotype_directory") {
          description =
            "Directory containing PLINK format genotype files (.bed, .bim, .fam) for the base population"
        } else if (field.fieldType === "phenotype_path") {
          description = "Phenotype data file for the base population"
        }

        return {
          ...field,
          id: field.id.replace("source_population", "pop2"),
          label: field.label.replace("Source Population", "Base Population"),
          description,
        }
      }

      return { ...field }
    })
  }

  if (toolKey === "sdprx") {
    return baseFields.map((field) => {
      if (field.population === "target") {
        return {
          ...field,
          id: field.id.replace("target_population", "pop1"),
          label: field.label,
          description: field.description,
        }
      }

      if (field.population === "source") {
        return {
          ...field,
          id: field.id.replace("source_population", "pop2"),
          label: field.label.replace("Source Population", "Base Population"),
          description: field.description.replace("source population", "base population"),
        }
      }

      return { ...field }
    })
  }

  if (toolKey === "prscsx") {
    if (!prscsxConfig) {
      return []
    }

    const mappingFields: MappingField[] = []
    const targetName = prscsxConfig.target.name || "Target"

    mappingFields.push(
      {
        id: "prscsx.target.sumstats_path",
        label: `${targetName} - Summary Statistics`,
        description: "Summary statistics file for the target population",
        acceptedTypes: [".txt", ".csv", ".sumstats", ".tsv", ".gz"],
        required: true,
        population: "prscsx-target",
        populationKey: prscsxConfig.target.id,
        fieldType: "sumstats_path",
      },
      {
        id: "prscsx.target.genotype_path",
        label: `${targetName} - Genotype Directory`,
        description:
          "Directory containing genotype files for the target population",
        acceptedTypes: ["Directory"],
        required: true,
        population: "prscsx-target",
        populationKey: prscsxConfig.target.id,
        fieldType: "genotype_directory",
      },
      {
        id: "prscsx.target.phenotype_path",
        label: `${targetName} - Phenotype File`,
        description: "Phenotype data file for the target population",
        acceptedTypes: ["Any file"],
        required: true,
        population: "prscsx-target",
        populationKey: prscsxConfig.target.id,
        fieldType: "phenotype_path",
      }
    )

    if (prscsxConfig.target.includeCovariate) {
      mappingFields.push({
        id: "prscsx.target.covariate_path",
        label: `${targetName} - Covariate File`,
        description: "Optional covariate data for the target population",
        acceptedTypes: ["Any file"],
        required: false,
        population: "prscsx-target",
        populationKey: prscsxConfig.target.id,
        fieldType: "covariate_path",
      })
    }

    prscsxConfig.bases.forEach((base) => {
      const baseName = base.name || "Base"

      mappingFields.push({
        id: `prscsx.base.${base.id}.sumstats_path`,
        label: `${baseName} - Summary Statistics`,
        description: "Summary statistics file for this base population",
        acceptedTypes: [".txt", ".csv", ".sumstats", ".tsv", ".gz"],
        required: true,
        population: "prscsx-base",
        populationKey: base.id,
        fieldType: "sumstats_path",
      })

      if (base.includeGenotype) {
        mappingFields.push({
          id: `prscsx.base.${base.id}.genotype_path`,
          label: `${baseName} - Genotype Directory`,
          description:
            "Directory containing genotype files for this base population",
          acceptedTypes: ["Directory"],
          required: false,
          population: "prscsx-base",
          populationKey: base.id,
          fieldType: "genotype_directory",
        })
      }

      if (base.includePhenotype) {
        mappingFields.push({
          id: `prscsx.base.${base.id}.phenotype_path`,
          label: `${baseName} - Phenotype File`,
          description: "Phenotype data file for this base population",
          acceptedTypes: ["Any file"],
          required: false,
          population: "prscsx-base",
          populationKey: base.id,
          fieldType: "phenotype_path",
        })
      }

      if (base.includeCovariate) {
        mappingFields.push({
          id: `prscsx.base.${base.id}.covariate_path`,
          label: `${baseName} - Covariate File`,
          description: "Optional covariate data for this base population",
          acceptedTypes: ["Any file"],
          required: false,
          population: "prscsx-base",
          populationKey: base.id,
          fieldType: "covariate_path",
        })
      }
    })

    return mappingFields
  }

  if (isXpassFamily(toolKey)) {
    // XPASS uses pop1 (target), pop2 (auxiliary), pop3 (validation)
    const fields: MappingField[] = [
      {
        id: "pop1.sumstats_path",
        label: "Target Population - Summary Statistics",
        description: "Summary statistics file for target population",
        acceptedTypes: [".txt", ".csv", ".sumstats", ".tsv", ".gz"],
        required: true,
        population: "target",
        fieldType: "sumstats_path",
      },
      {
        id: "pop1.genotype_path",
        label: "Target Population - Genotype Directory",
        description:
          "Directory containing PLINK format genotype files (.bed, .bim, .fam) for target population",
        acceptedTypes: ["Directory"],
        required: true,
        population: "target",
        fieldType: "genotype_directory",
      },
      {
        id: "pop2.sumstats_path",
        label: "Auxiliary Population - Summary Statistics",
        description: "Summary statistics file for auxiliary population",
        acceptedTypes: [".txt", ".csv", ".sumstats", ".tsv", ".gz"],
        required: true,
        population: "source",
        fieldType: "sumstats_path",
      },
      {
        id: "pop2.genotype_path",
        label: "Auxiliary Population - Genotype Directory",
        description:
          "Directory containing PLINK format genotype files (.bed, .bim, .fam) for auxiliary population",
        acceptedTypes: ["Directory"],
        required: true,
        population: "source",
        fieldType: "genotype_directory",
      },
      {
        id: "pop3.sumstats_path",
        label: "Validation Population - Summary Statistics",
        description: "Summary statistics file for validation population",
        acceptedTypes: [".txt", ".csv", ".sumstats", ".tsv", ".gz"],
        required: true,
        population: "source",
        fieldType: "sumstats_path",
      },
      {
        id: "pop3.genotype_path",
        label: "Validation Population - Genotype Directory",
        description:
          "Directory containing PLINK format genotype files (.bed, .bim, .fam) for validation population",
        acceptedTypes: ["Directory"],
        required: true,
        population: "source",
        fieldType: "genotype_directory",
      },
    ]
    return fields
  }

  return baseFields
}

export function Mapping({ onNext, onPrevious, data, toolsData }: MappingProps) {
  const [datasetStructure, setDatasetStructure] =
    useState<DatasetStructure | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)
  const [selectedDirectory, setSelectedDirectory] =
    useState<DirectoryItem | null>(null)
  const [populationPanels, setPopulationPanels] = useState<
    Record<string, boolean>
  >({})

  console.count("[Mapping] render")

  const jobId = useJobId()
  const jobMapping = useJobMapping()
  const {
    setMappingActiveTool,
    setToolPopulation,
    setToolMappings,
    setToolFieldValue,
    ensureToolFields,
    setPrscsxTargetPopulation,
    addPrscsxBasePopulation,
    updatePrscsxBasePopulation,
    removePrscsxBasePopulation,
  } = useMappingActions()
  const prscsxConfig = usePrscsxConfig()

  const rawTools = Array.isArray(toolsData?.selectedTools)
    ? toolsData.selectedTools.filter(
        (tool: unknown): tool is string => typeof tool === "string"
      )
    : []
  const selectedToolsKey = rawTools.join("|")
  const selectedTools = React.useMemo(() => [...rawTools], [selectedToolsKey])

  const [isTargetModalOpen, setTargetModalOpen] = useState(false)
  const [baseModalState, setBaseModalState] = useState<{
    open: boolean
    mode: "create" | "edit"
    baseId?: string
  }>({ open: false, mode: "create" })

  const prscsxBases = prscsxConfig?.bases ?? []

  const prscsxFieldSignature = React.useMemo(() => {
    if (!prscsxConfig) {
      return "none"
    }
    const baseSegments = prscsxConfig.bases.map((base) =>
      [
        base.id,
        base.includeGenotype ? "g1" : "g0",
        base.includePhenotype ? "p1" : "p0",
        base.includeCovariate ? "c1" : "c0",
      ].join(":")
    )
    return [
      prscsxConfig.target.includeCovariate ? "tc1" : "tc0",
      ...baseSegments,
    ].join("|")
  }, [prscsxConfig])

  const getFieldsForTool = React.useCallback(
    (tool: string) =>
      getToolMappingFields(
        tool,
        tool.toLowerCase() === "prscsx" ? prscsxConfig : undefined
      ),
    [prscsxConfig]
  )

  // Live sync support: write Mapping payload to stepData as user maps
  const setStepData = useBenchmarkingStore((state) => state.setStepData)
  const liveSyncSignatureRef = React.useRef<string | null>(null)

  const handleBaseModalOpenChange = (open: boolean) => {
    if (!open) {
      setBaseModalState({ open: false, mode: "create" })
    } else {
      setBaseModalState((prev) => ({ ...prev, open: true }))
    }
  }

  const toolConfigs = jobMapping?.toolConfigs ?? {}
  const resolveStoreToolId = React.useCallback(
    (toolId: string) => {
      const lower = toolId.toLowerCase()
      if (toolConfigs[toolId]) {
        return toolId
      }
      if (toolConfigs[lower]) {
        return lower
      }
      const matchedKey = Object.keys(toolConfigs).find(
        (existing) => existing.toLowerCase() === lower
      )
      return matchedKey ?? lower
    },
    [toolConfigs]
  )
  const activeTabFromStore = jobMapping?.activeTool ?? null
  const fallbackTab = selectedTools[0] || ""
  const derivedActiveTab =
    activeTabFromStore && selectedTools.includes(activeTabFromStore)
      ? activeTabFromStore
      : fallbackTab

  const activeTab = derivedActiveTab
  const statusRequestRef = React.useRef<string | null>(null)
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null)
  const initializedToolsRef = React.useRef<Set<string>>(new Set())

  // Instrumentation: log derived values for debugging
  useEffect(() => {
    console.log("[Mapping] derived values", {
      jobId,
      activeTabFromStore,
      activeTab,
      selectedTools,
    })
  }, [jobId, activeTabFromStore, activeTab, selectedToolsKey])

  // Dev-only: allow a debug dataset structure to bypass backend explore in dry-run
  useEffect(() => {
    const debugEnabled =
      (process.env.NEXT_PUBLIC_DEBUG || "").toLowerCase() === "true"
    if (!debugEnabled) return
    if (datasetStructure) return

    const debugStructure = useBenchmarkingStore.getState().stepData[
      "__debug_dataset_structure"
    ] as any
    if (debugStructure) {
      console.log("[Mapping] using debug dataset structure from store")
      setDatasetStructure(debugStructure as DatasetStructure)
      setLoading(false)
    }
  }, [datasetStructure])

  const handleActiveTabChange = (toolId: string) => {
    if (toolId !== activeTabFromStore) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[Mapping] handleActiveTabChange", {
          toolId,
          previous: activeTabFromStore,
        })
      }
      setMappingActiveTool(toolId)
    }
  }

  useEffect(() => {
    initializedToolsRef.current.clear()

    if (!jobId) {
      setLoading(false)
      statusRequestRef.current = null
      return
    }

    const jobKey = jobId

    if (statusRequestRef.current === jobKey) {
      return
    }

    statusRequestRef.current = jobKey
    if (process.env.NODE_ENV !== "production") {
      console.log("[Mapping] initiate status request", { jobId: jobKey })
    }
    void checkStatusAndLoadData(jobKey)
  }, [jobId])

  // Ensure the store always exposes a valid active tab for the current selection
  useEffect(() => {
    if (!jobId) {
      return
    }

    if (selectedTools.length === 0) {
      if (activeTabFromStore !== null) {
        if (process.env.NODE_ENV !== "production") {
          console.log("[Mapping] clearing store active tab (no tools)", {
            jobId,
            activeTabFromStore,
          })
        }
        setMappingActiveTool(null)
      }
      return
    }

    const desired = selectedTools.includes(activeTabFromStore ?? "")
      ? String(activeTabFromStore)
      : (selectedTools[0] ?? null)

    if (desired !== (activeTabFromStore ?? null)) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[Mapping] normalizing store active tab", {
          jobId,
          activeTabFromStore,
          desired,
          selectedTools,
        })
      }
      setMappingActiveTool(desired)
    }
  }, [jobId, selectedToolsKey, activeTabFromStore, setMappingActiveTool])

  useEffect(() => {
    if (selectedTools.length === 0) {
      return
    }

    setPopulationPanels((prev) => {
      const next = { ...prev }
      let changed = false
      selectedTools.forEach((tool) => {
        if (!(tool in next)) {
          next[tool] = true
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [selectedToolsKey])

  useEffect(() => {
    if (!jobId) {
      initializedToolsRef.current.clear()
      return
    }

    const jobKey = jobId
    const initializedKeys = initializedToolsRef.current

    // Remove keys for other jobs or deselected tools
    for (const key of Array.from(initializedKeys)) {
      const [keyJobId, keyTool, keySignature] = key.split(":")
      const expectedSignature =
        keyTool?.toLowerCase() === "prscsx" ? prscsxFieldSignature : "default"

      if (
        keyJobId !== jobKey ||
        !selectedTools.includes(keyTool) ||
        (keyTool?.toLowerCase() === "prscsx" &&
          keySignature !== expectedSignature)
      ) {
        initializedKeys.delete(key)
      }
    }

    selectedTools.forEach((tool) => {
      const signature =
        tool.toLowerCase() === "prscsx" ? prscsxFieldSignature : "default"
      const refKey = `${jobKey}:${tool}:${signature}`
      if (initializedKeys.has(refKey)) {
        return
      }

      const fieldIds = getFieldsForTool(tool).map((field) => field.id)
      // Register genotype file type and sumstats file type as mapping-level config for each tool
      if (!fieldIds.includes("genotype_config.file_type")) {
        fieldIds.push("genotype_config.file_type")
      }
      if (!fieldIds.includes("pre_processing.sumstats_file_type")) {
        fieldIds.push("pre_processing.sumstats_file_type")
      }
      if (process.env.NODE_ENV !== "production") {
        console.log("[Mapping] ensureToolFields trigger", {
          jobKey,
          tool,
          fieldIds,
        })
      }
      ensureToolFields(tool, fieldIds)
      initializedKeys.add(refKey)
    })
  }, [
    jobId,
    selectedToolsKey,
    ensureToolFields,
    prscsxFieldSignature,
    getFieldsForTool,
  ])

  const hasHydratedFromPropsRef = React.useRef(false)
  const [savedPopulations, setSavedPopulations] = useState<
    Record<string, boolean>
  >({})

  useEffect(() => {
    if (hasHydratedFromPropsRef.current || !jobId || !data) {
      return
    }

    hasHydratedFromPropsRef.current = true

    if (data.toolMappings) {
      Object.entries(data.toolMappings).forEach(([tool, mappings]) => {
        const storeToolId = resolveStoreToolId(tool)
        setToolMappings(storeToolId, mappings as Record<string, unknown>)
      })
    }

    if (data.populationConfigs) {
      const configs = data.populationConfigs as Record<
        string,
        ToolPopulationState
      >
      setPopulationPanels((prev) => {
        const next = { ...prev }
        Object.entries(configs).forEach(([tool, populations]) => {
          const storeToolId = resolveStoreToolId(tool)
          setToolPopulation(storeToolId, {
            targetPopulation: populations.targetPopulation || "",
            sourcePopulation: populations.sourcePopulation || "",
          })
          if (populations.targetPopulation && populations.sourcePopulation) {
            next[tool] = false
          }
        })
        return next
      })
      // Mark as saved when fully populated from configs
      setSavedPopulations((prev) => {
        const next = { ...prev }
        Object.entries(configs).forEach(([tool, populations]) => {
          const key = tool.toLowerCase()
          const filled = Boolean(
            populations.targetPopulation && populations.sourcePopulation
          )
          if (filled) next[key] = true
        })
        return next
      })
    } else if (data.populationNames) {
      const fallback = data.populationNames as {
        targetPopulation?: string
        sourcePopulation?: string
      }
      const panelsToClose: Record<string, boolean> = {}

      selectedTools.forEach((tool) => {
        const storeToolId = resolveStoreToolId(tool)
        setToolPopulation(storeToolId, {
          targetPopulation: fallback.targetPopulation || "",
          sourcePopulation: fallback.sourcePopulation || "",
        })

        if (fallback.targetPopulation && fallback.sourcePopulation) {
          panelsToClose[tool] = false
        }
      })

      if (Object.keys(panelsToClose).length > 0) {
        setPopulationPanels((prev) => ({
          ...prev,
          ...panelsToClose,
        }))
      }
      // Mark as saved when names provided via fallback
      setSavedPopulations((prev) => {
        const next = { ...prev }
        const filled = Boolean(
          fallback.targetPopulation && fallback.sourcePopulation
        )
        selectedTools.forEach((tool) => {
          const storeToolId = resolveStoreToolId(tool)
          const key = storeToolId.toLowerCase()
          if (filled) next[key] = true
        })
        return next
      })
    }
  }, [
    data,
    jobId,
    selectedToolsKey,
    setToolMappings,
    setToolPopulation,
    resolveStoreToolId,
  ])

  useEffect(() => {
    // Do not auto-mark populations as saved based on non-empty inputs.
    // Completion should only occur after an explicit Save action
    // or when hydrating from existing job configuration data.
  }, [selectedToolsKey, toolConfigs, resolveStoreToolId])

  type MappingValue = FileInfo | DirectoryItem | null

  const getPopulationForTool = (toolId: string): ToolPopulationState => {
    if (toolId.toLowerCase() === "prscsx" && prscsxConfig) {
      return {
        targetPopulation: prscsxConfig.target.name || "",
        sourcePopulation: prscsxConfig.bases[0]?.name || "",
      }
    }

    const storeToolId = resolveStoreToolId(toolId)
    const toolState = toolConfigs[storeToolId]
    const populations = toolState?.populations ?? {
      targetPopulation: "",
      sourcePopulation: "",
    }

    return {
      targetPopulation: populations.targetPopulation || "",
      sourcePopulation: populations.sourcePopulation || "",
    }
  }

  const getMappingsForTool = (toolId: string): Record<string, MappingValue> => {
    const storeToolId = resolveStoreToolId(toolId)
    const toolState = toolConfigs[storeToolId]
    return (toolState?.fields ?? {}) as Record<string, MappingValue>
  }

  const updatePopulationValue = (
    toolId: string,
    field: keyof ToolPopulationState,
    value: string
  ) => {
    if (toolId.toLowerCase() === "prscsx") {
      if (field === "targetPopulation") {
        setPrscsxTargetPopulation({ name: value })
      }
      return
    }

    const storeToolId = resolveStoreToolId(toolId)
    const current = getPopulationForTool(storeToolId)
    setToolPopulation(storeToolId, {
      ...current,
      [field]: value,
    })

    const toolKey = storeToolId.toLowerCase()
    setSavedPopulations((prev) => {
      if (!prev[toolKey]) {
        return prev
      }
      return { ...prev, [toolKey]: false }
    })
  }

  const getMissingMappingsForTool = (toolId: string) => {
    if (!toolId) {
      return [] as MappingField[]
    }

    const toolKey = toolId.toLowerCase()
    const mappings = getMappingsForTool(toolId)

    // For PRScsx, treat optional fields as required IF they are included via population config
    if (toolKey === "prscsx") {
      const requiredIds: string[] = []
      // Target: require sumstats, genotype, phenotype; covariate only if included
      requiredIds.push(
        "prscsx.target.sumstats_path",
        "prscsx.target.genotype_path",
        "prscsx.target.phenotype_path"
      )
      if (prscsxConfig?.target.includeCovariate) {
        requiredIds.push("prscsx.target.covariate_path")
      }

      // Bases: always require sumstats; require others only if included in base config
      prscsxBases.forEach((base) => {
        const prefix = `prscsx.base.${base.id}`
        requiredIds.push(`${prefix}.sumstats_path`)
        if (base.includeGenotype) requiredIds.push(`${prefix}.genotype_path`)
        if (base.includePhenotype) requiredIds.push(`${prefix}.phenotype_path`)
        if (base.includeCovariate) requiredIds.push(`${prefix}.covariate_path`)
      })

      const fields = getFieldsForTool(toolId)
      return fields.filter((field) => {
        if (!requiredIds.includes(field.id)) return false
        const value = mappings[field.id] as MappingValue
        return !value
      })
    }

    const requiredFields = getFieldsForTool(toolId).filter(
      (field) => field.required
    )

    return requiredFields.filter((field) => {
      const value = mappings[field.id] as MappingValue
      return !value
    })
  }

  const computeToolValidity = (toolId: string) => {
    if (!toolId) {
      return false
    }

    const toolKey = toolId.toLowerCase()
    const populations = getPopulationForTool(toolId)

    if (
      (toolKey === "prsice" ||
        toolKey === "bridgeprs" ||
        toolKey === "sdprx") &&
      (!populations.targetPopulation || !populations.sourcePopulation)
    ) {
      return false
    }

    if (
      (toolKey === "prsice" ||
        toolKey === "bridgeprs" ||
        toolKey === "sdprx") &&
      !savedPopulations[toolKey]
    ) {
      return false
    }

    if (isXpassFamily(toolKey)) {
      if (!populations.targetPopulation || !populations.sourcePopulation) {
        return false
      }
      if (!savedPopulations[toolKey]) {
        return false
      }
      const validationName = String(
        getMappingsForTool(toolId)["validation_population.name"] || ""
      ).trim()
      if (!validationName) {
        return false
      }
    }

    if (toolKey === "prscsx") {
      if (!prscsxConfig) {
        return false
      }

      if (!prscsxConfig.target.name.trim()) {
        return false
      }

      if (prscsxConfig.bases.length === 0) {
        return false
      }

      if (prscsxConfig.bases.some((base) => !base.name.trim())) {
        return false
      }
    }

    if (isXpassFamily(toolKey)) {
      const tSumstats = getMappingPath(toolId, "pop1.sumstats_path")
      const tGenotype = getMappingPath(toolId, "pop1.genotype_path")
      const aSumstats = getMappingPath(toolId, "pop2.sumstats_path")
      const aGenotype = getMappingPath(toolId, "pop2.genotype_path")
      const vSumstats = getMappingPath(toolId, "pop3.sumstats_path")
      const vGenotype = getMappingPath(toolId, "pop3.genotype_path")

      const manualPathsOk = Boolean(
        tSumstats && tGenotype && aSumstats && aGenotype && vSumstats && vGenotype
      )
      const missing = getMissingMappingsForTool(toolId)
      return manualPathsOk && missing.length === 0
    }

    const missing = getMissingMappingsForTool(toolId)
    return missing.length === 0
  }

  const isPopulationConfigured = (toolId: string) => {
    if (!toolId) return false
    const toolKey = toolId.toLowerCase()

    if (
      toolKey === "prsice" ||
      toolKey === "bridgeprs" ||
      toolKey === "sdprx"
    ) {
      const populations = getPopulationForTool(toolId)
      return Boolean(
        savedPopulations[toolKey] &&
          populations.targetPopulation &&
          populations.sourcePopulation
      )
    }

    if (toolKey === "prscsx") {
      if (!prscsxConfig) return false
      if (!prscsxConfig.target.name.trim()) return false
      if (prscsxConfig.bases.length === 0) return false
      if (prscsxConfig.bases.some((base) => !base.name.trim())) return false
      return true
    }

    if (isXpassFamily(toolKey)) {
      const populations = getPopulationForTool(toolId)
      const validationName = String(
        getMappingsForTool(toolId)["validation_population.name"] || ""
      )
      return Boolean(
        savedPopulations[toolKey] &&
          populations.targetPopulation &&
          populations.sourcePopulation &&
          validationName.trim()
      )
    }

    return false
  }

  const getMappingPath = (toolId: string, fieldId: string) => {
    const mappings = getMappingsForTool(toolId)
    const value = mappings[fieldId] as MappingValue

    if (value && typeof value === "object" && "path" in value) {
      return (value as FileInfo | DirectoryItem).path
    }

    return ""
  }

  // Live-sync Mapping payload into stepData["populations"] for ToolConfiguration
  React.useEffect(() => {
    if (!datasetStructure) return

    try {
      const toolMappingsPayload: Record<string, Record<string, any>> = {}
      const populationConfigs: Record<string, ToolPopulationState> = {}
      const configData: Record<string, any> = {}

      selectedTools.forEach((tool: string) => {
        const toolKey = tool.toLowerCase()
        const populations = getPopulationForTool(tool)
        const toolMapping = getMappingsForTool(tool)

        populationConfigs[tool] = populations
        toolMappingsPayload[tool] = toolMapping as any
        const fileType = String(toolMapping["genotype_config.file_type"] || "merged")
        const sumstatsType = String(toolMapping["pre_processing.sumstats_file_type"] || fileType)

        if (toolKey === "prscsx" && prscsxConfig) {
          const targetEntry: Record<string, string> = {
            name: prscsxConfig.target.name,
            type: "target",
            sumstats_path: getMappingPath(
              "prscsx",
              "prscsx.target.sumstats_path"
            ),
            genotype_path: getMappingPath(
              "prscsx",
              "prscsx.target.genotype_path"
            ),
            phenotype_path: getMappingPath(
              "prscsx",
              "prscsx.target.phenotype_path"
            ),
          }

          const targetCovariatePath = getMappingPath(
            "prscsx",
            "prscsx.target.covariate_path"
          )

          if (prscsxConfig.target.includeCovariate && targetCovariatePath) {
            targetEntry.covariate_path = targetCovariatePath
          }

          const baseEntries = (prscsxConfig.bases ?? []).map((base) => {
            const prefix = `prscsx.base.${base.id}`
            const entry: Record<string, string> = {
              name: base.name,
              sumstats_path: getMappingPath("prscsx", `${prefix}.sumstats_path`),
            }

            const maybeAssign = (
              include: boolean,
              field: "genotype_path" | "phenotype_path" | "covariate_path"
            ) => {
              if (!include) return
              const value = getMappingPath("prscsx", `${prefix}.${field}`)
              if (value) {
                entry[field] = value
              }
            }

            maybeAssign(base.includeGenotype, "genotype_path")
            maybeAssign(base.includePhenotype, "phenotype_path")
            maybeAssign(base.includeCovariate, "covariate_path")
            return entry
          })

          const populationsPayload = [targetEntry, ...baseEntries]
          const columnMappingsByPopulation: Record<string, Record<string, string>> = {}
          populationsPayload.forEach((populationEntry) => {
            if (populationEntry.name) {
              columnMappingsByPopulation[populationEntry.name] = {}
            }
          })

          configData[tool] = {
            pre_processing: {
              populations: populationsPayload,
              column_mappings: { by_population: columnMappingsByPopulation },
              phenotype_config: { by_population: {}, covariate_id_mapping: {} },
              genotype_config: { file_type: fileType },
            sumstats_file_type: sumstatsType,
            options: {},
            },
          }

          return
        }

        if (isXpassFamily(toolKey)) {
          const mappingPath = (fieldId: string) => getMappingPath(tool, fieldId)
          const validationName = String(toolMapping["validation_population.name"] || "").trim()

          const populationsPayload: Array<Record<string, string>> = []

          if (populations.targetPopulation?.trim()) {
            populationsPayload.push({
              name: populations.targetPopulation.trim(),
              type: "target",
              sumstats_path: mappingPath("pop1.sumstats_path"),
              genotype_path: mappingPath("pop1.genotype_path"),
            })
          }

          if (populations.sourcePopulation?.trim()) {
            populationsPayload.push({
              name: populations.sourcePopulation.trim(),
              type: "auxiliary",
              sumstats_path: mappingPath("pop2.sumstats_path"),
              genotype_path: mappingPath("pop2.genotype_path"),
            })
          }

          if (validationName) {
            populationsPayload.push({
              name: validationName,
              type: "validation",
              sumstats_path: mappingPath("pop3.sumstats_path"),
              genotype_path: mappingPath("pop3.genotype_path"),
            })
          }

          const columnMappingsByPopulation: Record<string, Record<string, string>> = {}
          populationsPayload.forEach((p) => {
            if (p.name) columnMappingsByPopulation[p.name] = {}
          })

          configData[tool] = {
            pre_processing: {
              populations: populationsPayload,
              column_mappings: { by_population: columnMappingsByPopulation },
              genotype_config: { file_type: fileType },
              sumstats_file_type: sumstatsType,
              covariate_config: {
                target_population: populations.targetPopulation || "",
                auxiliary_population: populations.sourcePopulation || "",
                validation_population: validationName || "",
              },
              options: {},
              output_dir: "results/preprocessed_data/preprocessed_xpass_output",
            },
          }

          return
        }

        const mappingPath = (fieldId: string) => getMappingPath(tool, fieldId)

        if (toolKey === "bridgeprs") {
          const pop1Config = {
            name: populations.targetPopulation,
            sumstats_path: mappingPath("pop1.sumstats_path"),
            genotype_path: mappingPath("pop1.genotype_path"),
            phenotype_path: mappingPath("pop1.phenotype_path"),
          }

          const pop2Config = {
            name: populations.sourcePopulation,
            sumstats_path: mappingPath("pop2.sumstats_path"),
            genotype_path: mappingPath("pop2.genotype_path"),
            phenotype_path: mappingPath("pop2.phenotype_path"),
          }

          const sharedGenotypePath =
            mappingPath("pop1.genotype_path") ||
            mappingPath("pop2.genotype_path") ||
            ""

          configData[tool] = {
            pre_processing: {
              pop1: pop1Config,
              pop2: pop2Config,
              genotype_path: sharedGenotypePath,
              genotype_config: { file_type: fileType },
              sumstats_file_type: sumstatsType,
            },
          }

          return
        }

        if (toolKey === "sdprx") {
          const pop1Config = {
            name: populations.targetPopulation,
            sumstats_path: mappingPath("pop1.sumstats_path"),
            genotype_path: mappingPath("pop1.genotype_path"),
            phenotype_path: mappingPath("pop1.phenotype_path"),
          }

          const pop2Config = {
            name: populations.sourcePopulation,
            sumstats_path: mappingPath("pop2.sumstats_path"),
            genotype_path: mappingPath("pop2.genotype_path"),
            phenotype_path: mappingPath("pop2.phenotype_path"),
          }

          const sharedGenotypePath =
            mappingPath("pop1.genotype_path") ||
            mappingPath("pop2.genotype_path") ||
            ""

          configData[tool] = {
            pre_processing: {
              pop1: pop1Config,
              pop2: pop2Config,
              genotype_path: sharedGenotypePath,
              output_dir: "results/preprocessed_data/preprocessed_sdprx_output",
              fixed_N1: "",
              fixed_N2: "",
              column_mappings: { by_population: {} },
              sumstats_file_type: sumstatsType,
              genotype_config: {
                file_type: fileType,
                population_reference: "target_population",
                file_patterns: { bed: "", bim: "", fam: "" },
              },
              phenotype_config: {
                pop1: { binary_traits: [], quantitative_traits: [] },
                pop2: { binary_traits: [], quantitative_traits: [] },
              },
              options: {},
            },
          }

          return
        }

        const toolConfig: any = {
          target_population: {
            name: populations.targetPopulation,
            sumstats_path: mappingPath("target_population.sumstats_path"),
            genotype_path: mappingPath("target_population.genotype_path"),
            phenotype_path: mappingPath("target_population.phenotype_path"),
          },
          source_population: {
            name: populations.sourcePopulation,
            sumstats_path: mappingPath("source_population.sumstats_path"),
            genotype_path: mappingPath("source_population.genotype_path"),
            phenotype_path: mappingPath("source_population.phenotype_path"),
          },
          genotype_config: { file_type: fileType },
          sumstats_file_type: sumstatsType,
        }
        configData[tool] = toolConfig
      })

      const payload = {
        toolMappings: toolMappingsPayload,
        datasetStructure,
        populationConfigs,
        configData,
      }

      const signature = JSON.stringify({
        jobId: jobId || "",
        tools: selectedToolsKey,
        prscsxSig: prscsxFieldSignature || "",
        payload,
      })

      if (signature !== liveSyncSignatureRef.current) {
        liveSyncSignatureRef.current = signature
        setStepData("populations", payload)
        console.log("[Mapping] live-sync populations payload updated")
      }
    } catch (err) {
      console.error("[Mapping] live-sync error:", err)
    }
  }, [datasetStructure, jobId, selectedToolsKey, prscsxFieldSignature, jobMapping])

  const checkJobStatus = async (jobKey: string) => {
    try {
      const response = await axios.get<JobStatusResponse>(
        getBenchmarkJobStatusUrl(jobKey)
      )

      console.log("📊 Job status response:", response.data)
      if (statusRequestRef.current === jobKey) {
        setJobStatus(response.data)
      }
      return response.data
    } catch (err) {
      console.error("❌ Failed to fetch job status:", err)
      throw err
    }
  }

  const checkStatusAndLoadData = async (jobKey: string) => {
    if (statusRequestRef.current === jobKey) {
      return
    }

    statusRequestRef.current = jobKey
    if (!jobKey) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log("[Mapping] checkStatusAndLoadData:start", { jobKey })
      const statusData = await checkJobStatus(jobKey)
      console.log("[Mapping] checkStatusAndLoadData:status", statusData)

      if (statusData.status && statusData.status.toLowerCase() === "uploaded") {
        console.log("[Mapping] checkStatusAndLoadData:fetchDataset")
        await fetchDatasetStructure(jobKey)
      } else if (statusRequestRef.current === jobKey) {
        setLoading(false)
      }
    } catch (err) {
      console.error("[Mapping] checkStatusAndLoadData:error", err)
      if (statusRequestRef.current === jobKey) {
        setError(
          err instanceof Error ? err.message : "Failed to check job status"
        )
        setLoading(false)
      }
    }
    statusRequestRef.current = null
  }

  const fetchDatasetStructure = async (jobKey: string) => {
    try {
      if (!jobKey) {
        throw new Error("No job ID found. Please upload files first.")
      }

      console.log("[Mapping] fetchDatasetStructure:start", { jobKey })
      const response = await axios.get<ExploreResponse>(
        `${getBenchmarkUploadUrl().replace("/upload", "")}/${jobKey}/explore`
      )

      console.log("[Mapping] fetchDatasetStructure:success", response.data)
      if (statusRequestRef.current !== jobKey) {
        return
      }
      setDatasetStructure(response.data.dataset_structure)
      setLoading(false)
    } catch (err) {
      console.error("[Mapping] fetchDatasetStructure:error", err)
      if (statusRequestRef.current === jobKey) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch dataset structure"
        )
        toast.error("Failed to fetch dataset structure")
        setLoading(false)
      }
    }
  }

  const handleRefresh = React.useCallback(async () => {
    if (!jobId) {
      toast.error("No job found. Please select tools and datasets first.")
      return
    }

    if (isCheckingStatus) return

    setIsCheckingStatus(true)
    const identifier = `${jobId}-${Date.now()}`
    statusRequestRef.current = identifier

    try {
      await checkStatusAndLoadData(jobId)
      if (statusRequestRef.current === identifier) {
        toast.success("Status refreshed successfully")
      }
    } catch (err) {
      console.error("Failed to refresh:", err)
      if (statusRequestRef.current === identifier) {
        toast.error("Failed to refresh status. Please try again.")
      }
    } finally {
      if (statusRequestRef.current === identifier) {
        setIsCheckingStatus(false)
        statusRequestRef.current = null
      }
    }
  }, [jobId, isCheckingStatus, checkStatusAndLoadData])

  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    if (!jobId) return

    handleRefresh()

    if (!datasetStructure) {
      pollingIntervalRef.current = setInterval(() => {
        void checkStatusAndLoadData(jobId)
      }, 10000)
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [jobId, datasetStructure, handleRefresh, checkStatusAndLoadData])

  // File selection handlers
  const handleFileSelect = (file: FileInfo) => {
    setSelectedFile(file)
    console.log("Selected file for mapping:", file)
  }

  const handleDirectorySelect = (directory: DirectoryItem) => {
    setSelectedDirectory(directory)
    console.log("Selected directory for mapping:", directory)
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setSelectedDirectory(null)
  }

  // Mapping handlers
  const mapFileToField = (fieldId: string, toolId: string = activeTab) => {
    if (!selectedFile || !toolId) return

    const storeToolId = resolveStoreToolId(toolId)
    setToolFieldValue(storeToolId, fieldId, selectedFile)
    setSelectedFile(null)
    toast.success(`Mapped ${selectedFile.name} to ${fieldId}`)
  }

  const mapDirectoryToField = (fieldId: string, toolId: string = activeTab) => {
    if (!selectedDirectory || !toolId) return

    const storeToolId = resolveStoreToolId(toolId)
    setToolFieldValue(storeToolId, fieldId, selectedDirectory)
    setSelectedDirectory(null)
    toast.success(`Mapped ${selectedDirectory.name} to ${fieldId}`)
  }

  const removeMapping = (fieldId: string, toolId: string = activeTab) => {
    if (!toolId) return
    const storeToolId = resolveStoreToolId(toolId)
    setToolFieldValue(storeToolId, fieldId, null)
  }

  const selectFileFromDropdown = (
    fieldId: string,
    filePath: string,
    toolId: string = activeTab
  ) => {
    if (!toolId) return
    const storeToolId = resolveStoreToolId(toolId)
    const file = datasetStructure?.files.find((f) => f.path === filePath)
    if (file) {
      setToolFieldValue(storeToolId, fieldId, file)
      toast.success(`Mapped ${file.name} to ${fieldId}`)
    }
  }

  const selectDirectoryFromDropdown = (
    fieldId: string,
    directoryPath: string,
    toolId: string = activeTab
  ) => {
    if (!toolId) return
    const storeToolId = resolveStoreToolId(toolId)
    const directory = datasetStructure?.directories.find(
      (d) => d.path === directoryPath
    )
    if (directory) {
      setToolFieldValue(storeToolId, fieldId, directory)
      toast.success(`Mapped ${directory.name} to ${fieldId}`)
    }
  }

  // Drag and drop handlers
  const onDragEndForTool = (toolId: string) => (result: any) => {
    const { destination, source, draggableId } = result

    if (!destination || !toolId) {
      return
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    // destination.droppableId is constructed as `${tool}-${field.id}`; we must map to the actual field.id key
    const prefix = `${toolId}-`
    const fieldId = destination.droppableId.startsWith(prefix)
      ? destination.droppableId.slice(prefix.length)
      : destination.droppableId

    const file = findFileById(draggableId)
    const directory = findDirectoryById(draggableId)
    const storeToolId = resolveStoreToolId(toolId)

    if (file) {
      setToolFieldValue(storeToolId, fieldId, file)
      toast.success(`Mapped ${file.name} to ${fieldId}`)
    } else if (directory) {
      setToolFieldValue(storeToolId, fieldId, directory)
      toast.success(`Mapped directory ${directory.name} to ${fieldId}`)
    }
  }

  const findFileById = (id: string): FileInfo | null => {
    if (!datasetStructure) return null
    return datasetStructure.files.find((file) => file.path === id) || null
  }

  const findDirectoryById = (id: string): DirectoryItem | null => {
    if (!datasetStructure) return null
    return datasetStructure.directories.find((dir) => dir.path === id) || null
  }

  const renderPopulationConfiguration = (tool: string) => {
    const storeToolId = resolveStoreToolId(tool)
    const key = storeToolId.toLowerCase()
    const populations = getPopulationForTool(storeToolId)
    const isOpen = populationPanels[tool] ?? true
    const isSaved = Boolean(savedPopulations[key])

    const handleOpenChange = (open: boolean) => {
      setPopulationPanels((prev) => ({
        ...prev,
        [tool]: open,
      }))
    }

    const populationRenderers: Record<string, () => React.ReactNode> = {
      prsice: () => (
        <PrsicePopulationConfiguration
          toolId={tool}
          populations={populations}
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
          onPopulationChange={(field, value) =>
            updatePopulationValue(tool, field, value)
          }
          onSave={() => handlePopulationFormSubmit(tool)}
          isCompleted={isSaved}
        />
      ),
      xpass: () => {
        const validationName = String(
          getMappingsForTool(storeToolId)["validation_population.name"] || ""
        )

        return (
          <XpassPopulationConfiguration
            toolId={tool}
            populations={populations}
            validationName={validationName}
            isOpen={isOpen}
            onOpenChange={handleOpenChange}
            onPopulationChange={(field, value) =>
              updatePopulationValue(tool, field, value)
            }
            onValidationChange={(value) =>
              setToolFieldValue(storeToolId, "validation_population.name", value)
            }
            onSave={() => handlePopulationFormSubmit(tool)}
            isCompleted={isSaved}
          />
        )
      },
      "xpass+": () => {
        const validationName = String(
          getMappingsForTool(storeToolId)["validation_population.name"] || ""
        )

        return (
          <XpassPopulationConfiguration
            toolId={tool}
            populations={populations}
            validationName={validationName}
            isOpen={isOpen}
            onOpenChange={handleOpenChange}
            onPopulationChange={(field, value) =>
              updatePopulationValue(tool, field, value)
            }
            onValidationChange={(value) =>
              setToolFieldValue(storeToolId, "validation_population.name", value)
            }
            onSave={() => handlePopulationFormSubmit(tool)}
            isCompleted={isSaved}
          />
        )
      },
      prscsx: () => {
        const mappingPath = (fieldId: string) =>
          getMappingPath("prscsx", fieldId)

        const targetMappings = {
          sumstats: mappingPath("prscsx.target.sumstats_path"),
          genotype: mappingPath("prscsx.target.genotype_path"),
          phenotype: mappingPath("prscsx.target.phenotype_path"),
          covariate: mappingPath("prscsx.target.covariate_path"),
        }

        const targetComplete =
          Boolean(targetMappings.sumstats) &&
          Boolean(targetMappings.genotype) &&
          Boolean(targetMappings.phenotype)

        const baseSummaries = prscsxBases.map((base) => {
          const prefix = `prscsx.base.${base.id}`
          return {
            base,
            mappings: {
              sumstats: mappingPath(`${prefix}.sumstats_path`),
              genotype: mappingPath(`${prefix}.genotype_path`),
              phenotype: mappingPath(`${prefix}.phenotype_path`),
              covariate: mappingPath(`${prefix}.covariate_path`),
            },
          }
        })

        return (
          <PrscsxPopulationConfiguration
            isOpen={isOpen}
            onOpenChange={handleOpenChange}
            config={prscsxConfig ?? null}
            targetMappings={targetMappings}
            targetComplete={targetComplete}
            onConfigureTarget={() => setTargetModalOpen(true)}
            baseSummaries={baseSummaries}
            onAddBase={() => setBaseModalState({ open: true, mode: "create" })}
            onEditBase={(baseId) =>
              setBaseModalState({ open: true, mode: "edit", baseId })
            }
            onRemoveBase={handleRemoveBase}
            disableRemoveBase={prscsxBases.length <= 1}
          />
        )
      },
      bridgeprs: () => (
        <BridgeprsPopulationConfiguration
          toolId={tool}
          populations={populations}
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
          onPopulationChange={(field, value) =>
            updatePopulationValue(tool, field, value)
          }
          onSave={() => handlePopulationFormSubmit(tool)}
          isCompleted={isSaved}
        />
      ),
      sdprx: () => (
        <SdprxPopulationConfiguration
          toolId={tool}
          populations={populations}
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
          onPopulationChange={(field, value) =>
            updatePopulationValue(tool, field, value)
          }
          onSave={() => handlePopulationFormSubmit(tool)}
          isCompleted={isSaved}
        />
      ),
    }

    return populationRenderers[key]?.() ?? null
  }

  const renderMappingCards = (tool: string) => {
    const toolMapping = getMappingsForTool(tool)
    const fields = getFieldsForTool(tool)

    if (fields.length === 0) {
      return [
        <Card
          key={`${tool}-placeholder`}
          className="border-dashed border-slate-300 bg-slate-50 text-sm text-muted-foreground"
        >
          <CardContent className="py-6">
            Mapping support for {toolDisplayNames[tool.toLowerCase()] || tool}
            will be available soon. You can continue to the next step without
            providing file mappings for this tool.
          </CardContent>
        </Card>,
      ]
    }

    return fields.map((field) => {
      const mappedValue = (toolMapping[field.id] ?? null) as MappingValue
      const isFileCompatible = selectedFile
        ? isValidFileForField(selectedFile, field)
        : false
      const isDirectoryCompatible = selectedDirectory
        ? isValidDirectoryForField(tool, selectedDirectory, field)
        : false
      const isCompatible = isFileCompatible || isDirectoryCompatible
      const isMapped = Boolean(mappedValue)
      const eligibleFiles = getEligibleFilesForField(field)
      const eligibleDirectories = getEligibleDirectoriesForField(tool, field)
      const canMapSelectedFile =
        isFileCompatible && field.fieldType !== "genotype_directory"
      const canMapSelectedDirectory = isDirectoryCompatible
      const canMapSelection = canMapSelectedFile || canMapSelectedDirectory

      // Build display label with population names inline for XPASS
      const toolKey = tool.toLowerCase()
      let displayLabel = field.label
      if (isXpassFamily(toolKey)) {
        const populations = getPopulationForTool(tool)
        const validationName = String(
          getMappingsForTool(tool)["validation_population.name"] || ""
        ).trim()
        let nameForField = ""
        if (field.id.startsWith("pop1.")) {
          nameForField = populations.targetPopulation || ""
        } else if (field.id.startsWith("pop2.")) {
          nameForField = populations.sourcePopulation || ""
        } else if (field.id.startsWith("pop3.")) {
          nameForField = validationName || ""
        }
        if (nameForField) {
          displayLabel = `${field.label} (${nameForField})`
        }
      }

      return (
        <Card
          key={`${tool}-${field.id}`}
          className={`border ${
            isMapped
              ? "border-green-200 bg-green-50"
              : isCompatible
                ? "border-blue-200 bg-blue-50"
                : "border-muted"
          }`}
        >
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                {displayLabel}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {field.description}
              </CardDescription>
              <div className="mt-2">
                <Badge
                  variant="outline"
                  className="border-orange-300 bg-orange-50 text-orange-700"
                >
                  Supported: {field.acceptedTypes.join(", ")}
                  {(field.fieldType === "genotype_directory" || (field.fieldType === "sumstats_path" && eligibleDirectories.length > 0)) ? " + directories" : ""}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 text-right text-xs text-muted-foreground">
              {field.required ? (
                isMapped ? (
                  <Badge
                    variant="outline"
                    className="border-green-300 bg-green-50 text-green-700"
                  >
                    Mapped
                  </Badge>
                ) : (
                  <Badge className="border-red-300 bg-red-50 text-red-700">
                    Required
                  </Badge>
                )
              ) : (
                <Badge variant="outline">Optional</Badge>
              )}

              {((isCompatible && !isMapped) || canMapSelection) && (
                <div className="flex items-center gap-2">
                  {isCompatible && !isMapped && (
                    <span className="text-xs text-blue-600">
                      Selected {selectedFile ? "file" : "directory"} is
                      compatible
                    </span>
                  )}
                  {canMapSelection && (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (canMapSelectedFile) {
                          mapFileToField(field.id, tool)
                        } else if (canMapSelectedDirectory) {
                          mapDirectoryToField(field.id, tool)
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <MapPin className="mr-1 h-3 w-3" />
                      Map
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Droppable droppableId={`${tool}-${field.id}`}>
              {(provided: any, snapshot: any) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`flex min-h-[80px] items-center justify-center rounded-md p-4 ${
                    snapshot.isDraggingOver ? "bg-blue-100" : "bg-transparent"
                  }`}
                >
                  {isMapped ? (
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(mappedValue && (mappedValue as any).file_count !== undefined) ? (
                          <Folder className="h-4 w-4 text-blue-500" />
                        ) : (
                          <File className="h-4 w-4 text-gray-500" />
                        )}
                        <div>
                          <div className="font-medium">{mappedValue?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {mappedValue?.path}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMapping(field.id, tool)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-3">
                      <div className="text-center text-muted-foreground">
                        {snapshot.isDraggingOver
                          ? (field.fieldType === "genotype_directory" || eligibleDirectories.length > 0)
                            ? "Drop file or directory here"
                            : "Drop file here"
                          : (field.fieldType === "genotype_directory" || eligibleDirectories.length > 0)
                            ? "Drag file or directory here or use dropdown"
                            : "Drag file here or use dropdown"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Or select:</Label>
                        <SearchableSelect
                          placeholder={
                            field.fieldType === "genotype_directory"
                              ? "Choose a directory..."
                              : eligibleDirectories.length > 0
                                ? "Choose a file or directory..."
                                : "Choose a file..."
                          }
                          directoryItems={eligibleDirectories.map((directory) => ({
                            label: directory.name,
                            value: directory.path,
                            description: directory.path,
                          }) as SearchableSelectItem)}
                          fileItems={
                            field.fieldType === "genotype_directory"
                              ? []
                              : eligibleFiles.map((file) => ({
                                  label: file.name,
                                  value: file.path,
                                  description: file.path,
                                }) as SearchableSelectItem)
                          }
                          onSelect={(value) => {
                            if (field.fieldType === "genotype_directory") {
                              // value may be prefixed with "dir:"; strip if present
                              const dirPath = (value as string).startsWith("dir:")
                                ? (value as string).slice(4)
                                : (value as string)
                              selectDirectoryFromDropdown(field.id, dirPath, tool)
                            } else {
                              if ((value as string).startsWith("dir:")) {
                                selectDirectoryFromDropdown(field.id, (value as string).slice(4), tool)
                              } else {
                                const filePath = (value as string).startsWith("file:") ? (value as string).slice(5) : (value as string)
                                selectFileFromDropdown(field.id, filePath, tool)
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </CardContent>
        </Card>
      )
    })
  }

  const renderMappingGrid = (tool: string) => {
    if (!datasetStructure) {
      return (
        <Card className="border border-dashed">
          <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Waiting for dataset structure...
          </CardContent>
        </Card>
      )
    }

    // Gate explorer and mapping until population is configured
    if (!isPopulationConfigured(tool)) {
      return (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
              <div>
                <CardTitle className="text-sm font-semibold text-orange-900">
                  Population configuration required
                </CardTitle>
                <CardDescription className="text-xs text-orange-700">
                  Please configure population(s) for{" "}
                  {toolDisplayNames[tool.toLowerCase()] || tool} before mapping
                  files.
                </CardDescription>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    const toolKey = tool.toLowerCase()
    const populations = getPopulationForTool(tool)
    let populationLabel = `${populations.targetPopulation || "target"} population`
    if (toolKey === "prscsx") {
      populationLabel = `${prscsxConfig?.target.name || "target"} with ${prscsxBases.length} base population${prscsxBases.length === 1 ? "" : "s"}`
    } else if (toolKey === "bridgeprs") {
      const targetName = populations.targetPopulation || "target population"
      const baseName = populations.sourcePopulation || "base population"
      populationLabel = `${targetName} and ${baseName}`
    } else if (populations.sourcePopulation) {
      populationLabel = `${populations.targetPopulation || "target"} and ${populations.sourcePopulation} populations`
    }

    return (
      <DragDropContext onDragEnd={onDragEndForTool(tool)}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
          <div className="order-2 lg:order-1 lg:col-span-5">
            <Droppable
              droppableId={`file-explorer-${tool}`}
              isDropDisabled={true}
            >
              {(provided: any) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  <FileExplorer
                    datasetStructure={datasetStructure}
                    onFileSelect={handleFileSelect}
                    onDirectorySelect={handleDirectorySelect}
                    jobId={jobId}
                    selectedFile={selectedFile}
                    selectedDirectory={selectedDirectory}
                  />
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          <div className="order-1 lg:order-2 lg:col-span-7">
            <Card className="flex h-[400px] flex-col lg:h-[600px]">
              <CardHeader className="flex-shrink-0">
                <CardTitle>Configuration Mapping</CardTitle>
                <CardDescription>
                  Map files for the {populationLabel}.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto pr-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Genotype file structure</Label>
                      <Tooltip
                        delayMs={400}
                        content={
                          <div>
                            <div className="font-semibold mb-1">Genotype file structure</div>
                            <div>
                              <span className="font-medium">Merged</span> means a single set of PLINK files
                              (<code>.bed</code>, <code>.bim</code>, <code>.fam</code>) covering all chromosomes.
                            </div>
                            <div className="mt-1">
                              <span className="font-medium">Multi Chromosome</span> means a directory with per-chromosome
                              PLINK triplets (e.g., <code>chr1.bed/bim/fam</code>, <code>chr2.*</code>).
                            </div>
                          </div>
                        }
                      >
                        <div aria-label="Genotype file structure help" className="inline-flex cursor-help">
                          <Info className="h-3 w-3 text-orange-500" />
                        </div>
                      </Tooltip>
                    </div>
                    <Select
                      value={String(getMappingsForTool(tool)["genotype_config.file_type"] || "merged")}
                      onValueChange={(value) =>
                        setToolFieldValue(
                          tool,
                          "genotype_config.file_type",
                          value as "merged" | "multi_chromosome"
                        )
                      }
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Select genotype file type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="merged">Merged</SelectItem>
                        <SelectItem value="multi_chromosome">Multi Chromosome</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Sumstats file structure</Label>
                      <Tooltip
                        delayMs={400}
                        content={
                          <div>
                            <div className="font-semibold mb-1">Sumstats file structure</div>
                            <div>
                              Defaults to your genotype selection: if genotype is <span className="font-medium">Merged</span>,
                              sumstats defaults to <span className="font-medium">Merged</span>; if genotype is
                              <span className="font-medium"> Multi Chromosome</span>, sumstats defaults to
                              <span className="font-medium"> Multi Chromosome</span>.
                            </div>
                            <div className="mt-1">You can change sumstats independently here if needed.</div>
                            <div className="mt-2">
                              <div className="font-medium">Differences:</div>
                              <ul className="mt-1 list-disc pl-4">
                                <li>
                                  <span className="font-medium">Merged</span>: a single summary statistics file containing variants across all
                                  chromosomes (e.g., <code>sumstats.txt</code>).
                                </li>
                                <li>
                                  <span className="font-medium">Multi Chromosome</span>: a directory with separate per‑chromosome files
                                  (e.g., <code>sumstats_chr1.txt</code>, <code>sumstats_chr2.txt</code>, … or <code>chr1.sumstats</code>, <code>chr2.sumstats</code>).
                                </li>
                              </ul>
                            </div>
                          </div>
                        }
                      >
                        <div aria-label="Sumstats file structure help" className="inline-flex cursor-help">
                          <Info className="h-3 w-3 text-orange-500" />
                        </div>
                      </Tooltip>
                    </div>
                    <Select
                      value={String(getMappingsForTool(tool)["pre_processing.sumstats_file_type"] || String(getMappingsForTool(tool)["genotype_config.file_type"] || "merged"))}
                      onValueChange={(value) =>
                        setToolFieldValue(
                          tool,
                          "pre_processing.sumstats_file_type",
                          value as "merged" | "multi_chromosome"
                        )
                      }
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Select sumstats file type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="merged">Merged</SelectItem>
                        <SelectItem value="multi_chromosome">Multi Chromosome</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {renderMappingCards(tool)}
              </CardContent>
            </Card>
          </div>
        </div>
      </DragDropContext>
    )
  }
  const isValidFileForField = (file: FileInfo, field: MappingField) => {
    // Allow any file format for phenotype or covariate fields
    if (
      field.fieldType === "phenotype_path" ||
      field.fieldType === "covariate_path"
    ) {
      return true
    }
    // For genotype directories, we need to check if the file is in a directory
    if (field.fieldType === "genotype_directory") {
      return false // Files cannot be mapped to genotype directory fields
    }
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || ""
    return field.acceptedTypes.includes(`.${fileExtension}`)
  }

  const isValidDirectoryForField = (
    toolId: string,
    directory: DirectoryItem,
    field: MappingField
  ) => {
    if (field.fieldType === "genotype_directory") {
      return true
    }
    if (field.fieldType === "sumstats_path") {
      const toolMapping = getMappingsForTool(toolId)
      const sumstatsType = String(
        toolMapping["pre_processing.sumstats_file_type"] ||
          String(toolMapping["genotype_config.file_type"] || "merged")
      )
      return sumstatsType === "multi_chromosome"
    }
    return false
  }

  const getEligibleFilesForField = (field: MappingField) => {
    if (!datasetStructure) return []
    return datasetStructure.files
      .filter((file) => Boolean(file.path && file.path.trim()))
      .filter((file) => isValidFileForField(file, field))
  }

  const getEligibleDirectoriesForField = (toolId: string, field: MappingField) => {
    if (!datasetStructure) return []
    return datasetStructure.directories
      .filter((directory) => Boolean(directory.path && directory.path.trim()))
      .filter((directory) => isValidDirectoryForField(toolId, directory, field))
  }

  const handlePopulationFormSubmit = (toolId: string) => {
    const storeToolId = resolveStoreToolId(toolId)
    const populations = getPopulationForTool(storeToolId)

    if (!populations.targetPopulation || !populations.sourcePopulation) {
      toast.error("Please provide both target and source population names")
      return
    }

    if (isXpassFamily(storeToolId)) {
      const validationName = String(
        getMappingsForTool(storeToolId)["validation_population.name"] || ""
      ).trim()
      if (!validationName) {
        const label = toolDisplayNames[storeToolId.toLowerCase()] || "XPASS"
        toast.error(
          `Please provide a validation population name for ${label}`
        )
        return
      }
    }

    const toolKey = storeToolId.toLowerCase()
    setSavedPopulations((prev) => ({ ...prev, [toolKey]: true }))

    setPopulationPanels((prev) => ({
      ...prev,
      [toolId]: false,
    }))
    toast.success("Population names saved! You can now start mapping files.")
  }

  const handleTargetModalSubmit = (
    values: Partial<Omit<PrscsxTargetPopulation, "id">>
  ) => {
    const previousInclude = prscsxConfig?.target.includeCovariate ?? false
    setPrscsxTargetPopulation({
      name: values.name ?? prscsxConfig?.target.name ?? "",
      includeCovariate: values.includeCovariate ?? previousInclude,
    })

    if (previousInclude && values.includeCovariate === false) {
      setToolFieldValue("prscsx", "prscsx.target.covariate_path", null)
    }

    setTargetModalOpen(false)
    toast.success("Target population updated")
  }

  const handleBaseModalSubmit = (values: PrscsxBaseModalValues) => {
    if (baseModalState.mode === "create") {
      addPrscsxBasePopulation({
        name: values.name,
        includeGenotype: values.includeGenotype,
        includePhenotype: values.includePhenotype,
        includeCovariate: values.includeCovariate,
      })
      toast.success("Base population added")
    } else if (baseModalState.mode === "edit" && baseModalState.baseId) {
      const baseId = baseModalState.baseId
      const existingBase = prscsxBases.find((base) => base.id === baseId)

      updatePrscsxBasePopulation(baseId, {
        name: values.name,
        includeGenotype: values.includeGenotype,
        includePhenotype: values.includePhenotype,
        includeCovariate: values.includeCovariate,
      })

      if (existingBase) {
        const prefix = `prscsx.base.${baseId}`
        if (existingBase.includeGenotype && !values.includeGenotype) {
          setToolFieldValue("prscsx", `${prefix}.genotype_path`, null)
        }
        if (existingBase.includePhenotype && !values.includePhenotype) {
          setToolFieldValue("prscsx", `${prefix}.phenotype_path`, null)
        }
        if (existingBase.includeCovariate && !values.includeCovariate) {
          setToolFieldValue("prscsx", `${prefix}.covariate_path`, null)
        }
      }

      toast.success("Base population updated")
    }

    setBaseModalState({ open: false, mode: "create" })
  }

  const handleRemoveBase = (baseId: string) => {
    if (prscsxBases.length <= 1) {
      toast.error("At least one base population is required")
      return
    }

    removePrscsxBasePopulation(baseId)

    const prefix = `prscsx.base.${baseId}`
    setToolFieldValue("prscsx", `${prefix}.sumstats_path`, null)
    setToolFieldValue("prscsx", `${prefix}.genotype_path`, null)
    setToolFieldValue("prscsx", `${prefix}.phenotype_path`, null)
    setToolFieldValue("prscsx", `${prefix}.covariate_path`, null)

    if (baseModalState.mode === "edit" && baseModalState.baseId === baseId) {
      setBaseModalState({ open: false, mode: "create" })
    }

    toast.success("Base population removed")
  }

  const targetModalSummary = {
    sumstatsPath: getMappingPath("prscsx", "prscsx.target.sumstats_path"),
    genotypePath: getMappingPath("prscsx", "prscsx.target.genotype_path"),
    phenotypePath: getMappingPath("prscsx", "prscsx.target.phenotype_path"),
    covariatePath: getMappingPath("prscsx", "prscsx.target.covariate_path"),
  }

  const activeBaseForModal =
    baseModalState.mode === "edit"
      ? prscsxBases.find((base) => base.id === baseModalState.baseId)
      : undefined

  const activeBaseSummary = activeBaseForModal
    ? {
        sumstatsPath: getMappingPath(
          "prscsx",
          `prscsx.base.${activeBaseForModal.id}.sumstats_path`
        ),
        genotypePath: getMappingPath(
          "prscsx",
          `prscsx.base.${activeBaseForModal.id}.genotype_path`
        ),
        phenotypePath: getMappingPath(
          "prscsx",
          `prscsx.base.${activeBaseForModal.id}.phenotype_path`
        ),
        covariatePath: getMappingPath(
          "prscsx",
          `prscsx.base.${activeBaseForModal.id}.covariate_path`
        ),
      }
    : undefined

  const handleNext = () => {
    if (!datasetStructure) {
      toast.error("Please wait for dataset structure to load")
      return
    }

    if (!activeTab) {
      toast.error("Select a tool to continue")
      return
    }

    // Require ALL selected tools to be fully configured and mapped before proceeding
    const incompleteTools = selectedTools.filter(
      (tool) => !computeToolValidity(tool)
    )
    if (incompleteTools.length > 0) {
      const first = incompleteTools[0]
      toast.error(
        `Please complete population configuration and required mappings for all selected tools (e.g., ${toolDisplayNames[first.toLowerCase()] || first}).`
      )
      return
    }

    const toolMappingsPayload: Record<string, Record<string, MappingValue>> = {}
    const populationConfigs: Record<string, ToolPopulationState> = {}
    const configData: Record<string, any> = {}

    selectedTools.forEach((tool: string) => {
      const toolKey = tool.toLowerCase()
      const populations = getPopulationForTool(tool)
      const toolMapping = getMappingsForTool(tool)

      populationConfigs[tool] = populations
      toolMappingsPayload[tool] = toolMapping
      const fileType = String(toolMapping["genotype_config.file_type"] || "merged")
      const sumstatsType = String(toolMapping["pre_processing.sumstats_file_type"] || fileType)

      if (toolKey === "prscsx" && prscsxConfig) {
        const targetEntry: Record<string, string> = {
          name: prscsxConfig.target.name,
          type: "target",
          sumstats_path: getMappingPath(
            "prscsx",
            "prscsx.target.sumstats_path"
          ),
          genotype_path: getMappingPath(
            "prscsx",
            "prscsx.target.genotype_path"
          ),
          phenotype_path: getMappingPath(
            "prscsx",
            "prscsx.target.phenotype_path"
          ),
        }

        const targetCovariatePath = getMappingPath(
          "prscsx",
          "prscsx.target.covariate_path"
        )

        if (prscsxConfig.target.includeCovariate && targetCovariatePath) {
          targetEntry.covariate_path = targetCovariatePath
        }

        const baseEntries = prscsxBases.map((base) => {
          const prefix = `prscsx.base.${base.id}`
          const entry: Record<string, string> = {
            name: base.name,
            sumstats_path: getMappingPath("prscsx", `${prefix}.sumstats_path`),
          }

          const maybeAssign = (
            include: boolean,
            field: "genotype_path" | "phenotype_path" | "covariate_path"
          ) => {
            if (!include) return
            const value = getMappingPath("prscsx", `${prefix}.${field}`)
            if (value) {
              entry[field] = value
            }
          }

          maybeAssign(base.includeGenotype, "genotype_path")
          maybeAssign(base.includePhenotype, "phenotype_path")
          maybeAssign(base.includeCovariate, "covariate_path")

          return entry
        })

        const populationsPayload = [targetEntry, ...baseEntries]

        const columnMappingsByPopulation: Record<
          string,
          Record<string, string>
        > = {}
        populationsPayload.forEach((populationEntry) => {
          if (populationEntry.name) {
            columnMappingsByPopulation[populationEntry.name] = {}
          }
        })

        configData[tool] = {
          pre_processing: {
            populations: populationsPayload,
            column_mappings: { by_population: columnMappingsByPopulation },
            phenotype_config: {
              by_population: {},
              covariate_id_mapping: {},
            },
            genotype_config: { file_type: fileType },
            sumstats_file_type: sumstatsType,
            options: {},
          },
        }

        return
      }

      const mappingPath = (fieldId: string) => getMappingPath(tool, fieldId)

      if (toolKey === "bridgeprs") {
        const pop1Config = {
          name: populations.targetPopulation,
          sumstats_path: mappingPath("pop1.sumstats_path"),
          genotype_path: mappingPath("pop1.genotype_path"),
          phenotype_path: mappingPath("pop1.phenotype_path"),
        }

        const pop2Config = {
          name: populations.sourcePopulation,
          sumstats_path: mappingPath("pop2.sumstats_path"),
          genotype_path: mappingPath("pop2.genotype_path"),
          phenotype_path: mappingPath("pop2.phenotype_path"),
        }

        const sharedGenotypePath =
          mappingPath("pop1.genotype_path") ||
          mappingPath("pop2.genotype_path") ||
          ""

        configData[tool] = {
          pre_processing: {
            pop1: pop1Config,
            pop2: pop2Config,
            genotype_path: sharedGenotypePath,
            genotype_config: { file_type: fileType },
            sumstats_file_type: sumstatsType,
          },
        }

        return
      }

      if (toolKey === "sdprx") {
        const pop1Config = {
          name: populations.targetPopulation,
          sumstats_path: mappingPath("pop1.sumstats_path"),
          genotype_path: mappingPath("pop1.genotype_path"),
          phenotype_path: mappingPath("pop1.phenotype_path"),
        }

        const pop2Config = {
          name: populations.sourcePopulation,
          sumstats_path: mappingPath("pop2.sumstats_path"),
          genotype_path: mappingPath("pop2.genotype_path"),
          phenotype_path: mappingPath("pop2.phenotype_path"),
        }

        const sharedGenotypePath =
          mappingPath("pop1.genotype_path") ||
          mappingPath("pop2.genotype_path") ||
          ""

        configData[tool] = {
          pre_processing: {
            pop1: pop1Config,
            pop2: pop2Config,
            genotype_path: sharedGenotypePath,
            output_dir: "results/preprocessed_data/preprocessed_sdprx_output",
            fixed_N1: "",
            fixed_N2: "",
            column_mappings: { by_population: {} },
            sumstats_file_type: sumstatsType,
            genotype_config: {
              file_type: fileType,
              population_reference: "target_population",
              file_patterns: { bed: "", bim: "", fam: "" },
            },
            phenotype_config: {
              pop1: { binary_traits: [], quantitative_traits: [] },
              pop2: { binary_traits: [], quantitative_traits: [] },
            },
            options: {},
          },
        }

        return
      }

      const toolConfig: ToolConfig = {
          target_population: {
            name: populations.targetPopulation,
            sumstats_path: mappingPath("target_population.sumstats_path"),
            genotype_path: mappingPath("target_population.genotype_path"),
            phenotype_path: mappingPath("target_population.phenotype_path"),
          },
          source_population: {
            name: populations.sourcePopulation,
            sumstats_path: mappingPath("source_population.sumstats_path"),
            genotype_path: mappingPath("source_population.genotype_path"),
            phenotype_path: mappingPath("source_population.phenotype_path"),
          },
          // Include mapping-selected genotype file type for tools like PRSice
          // This will be consumed by ToolConfiguration when building preprocessing config
          // and ensures consistency with the Mapping page selection
          // @ts-ignore
          genotype_config: { file_type: fileType },
          // @ts-ignore
          sumstats_file_type: sumstatsType,
        }
        configData[tool] = toolConfig
    })

    onNext({
      toolMappings: toolMappingsPayload,
      datasetStructure,
      populationConfigs,
      configData,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading dataset structure...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-xl font-semibold">
            Map Files to Configuration
          </h3>
          <p className="text-muted-foreground">
            Map your uploaded files to the appropriate configuration fields for
            the selected tools.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <Button
              onClick={() => {
                if (!jobId) {
                  return
                }
                statusRequestRef.current = jobId
                void checkStatusAndLoadData(jobId)
              }}
              variant="outline"
              className="mt-4"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const activeToolKey = activeTab?.toLowerCase() || ""
  const allToolsValid =
    selectedTools.length > 0 &&
    selectedTools.every((t) => computeToolValidity(t))
  const isNextDisabled =
    !datasetStructure || selectedTools.length === 0 || !allToolsValid

  return (
    <>
      <PrscsxTargetModal
        open={isTargetModalOpen}
        onOpenChange={setTargetModalOpen}
        target={prscsxConfig?.target}
        onSubmit={handleTargetModalSubmit}
        mappedSummary={targetModalSummary}
      />
      <PrscsxBaseModal
        open={baseModalState.open}
        onOpenChange={handleBaseModalOpenChange}
        initialBase={activeBaseForModal}
        mode={baseModalState.mode}
        disableDelete={prscsxBases.length <= 1}
        mappedSummary={activeBaseSummary}
        onSubmit={handleBaseModalSubmit}
        onDelete={
          baseModalState.mode === "edit" && activeBaseForModal
            ? () => handleRemoveBase(activeBaseForModal.id)
            : undefined
        }
      />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="mb-2 text-xl font-semibold">
              Map Files to Configuration
            </h3>
            <p className="text-muted-foreground">
              First define your populations, then map files to the configuration
              structure.
            </p>
          </div>
          {!datasetStructure && (
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isCheckingStatus}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isCheckingStatus ? "animate-spin" : ""}`}
              />
              {isCheckingStatus ? "Checking..." : "Refresh"}
            </Button>
          )}
        </div>

        {/* Population Configuration Form */}
        {/* Population Configuration is now handled per-tool inside the tab content */}

        {/* Removed duplicate status card to avoid redundant waiting messages while extraction runs */}

        {/* Selected File Display */}
        {/* Blue selected-file info box removed per request */}

        <Tabs
          value={activeTab}
          onValueChange={handleActiveTabChange}
          className="flex w-full flex-col gap-6"
        >
          <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap border-b border-border bg-transparent p-0">
            {selectedTools.map((tool: string) => {
              const isComplete = computeToolValidity(tool)

              return (
                <TabsTrigger
                  key={tool}
                  value={tool}
                  data-complete={isComplete}
                  className="group rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-semibold transition-all duration-200 hover:bg-muted/40 data-[state=active]:border-primary data-[state=active]:bg-primary data-[complete=false]:text-muted-foreground/80 data-[state=active]:text-white"
                >
                  <span className="flex items-center gap-2">
                    {toolDisplayNames[tool.toLowerCase()] || tool}
                    {isComplete && (
                      <Badge
                        variant="outline"
                        className="hidden border-orange-600 text-xs text-orange-600 group-data-[state=active]:border-white group-data-[state=active]:text-white sm:inline-flex"
                      >
                        Ready
                      </Badge>
                    )}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {selectedTools.map((tool: string) => (
            <TabsContent key={tool} value={tool} className="space-y-6">
              {renderPopulationConfiguration(tool)}
              {renderMappingGrid(tool)}
            </TabsContent>
          ))}
        </Tabs>

        {/* Navigation */}
        <div className="flex justify-between">
          {onPrevious && (
            <Button variant="outline" onClick={onPrevious}>
              Back
            </Button>
          )}
          <Button onClick={handleNext} disabled={isNextDisabled}>
            Next
          </Button>
        </div>
      </div>
    </>
  )
}
