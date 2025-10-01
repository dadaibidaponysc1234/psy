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
import {
  Folder,
  File,
  Loader2,
  RefreshCw,
  X,
  MapPin,
  AlertTriangle,
} from "lucide-react"
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
      acceptedTypes: [".txt", ".csv", ".sumstats"],
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
      acceptedTypes: [".txt", ".csv", ".sumstats"],
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
        const nextLabel = field.label.replace(
          "Target Population",
          "Pop1 (Target Population)"
        )
        let description = field.description
        if (field.fieldType === "sumstats_path") {
          description = "Summary statistics file for Pop1 (target population)"
        } else if (field.fieldType === "genotype_directory") {
          description =
            "Directory containing PLINK format genotype files (.bed, .bim, .fam) for Pop1 (target population)"
        } else if (field.fieldType === "phenotype_path") {
          description = "Phenotype data file for Pop1 (target population)"
        }

        return {
          ...field,
          id: field.id.replace("target_population", "pop1"),
          label: nextLabel,
          description,
        }
      }

      if (field.population === "source") {
        const nextLabel = field.label.replace(
          "Source Population",
          "Pop2 (Base Population)"
        )
        let description = field.description
        if (field.fieldType === "sumstats_path") {
          description = "Summary statistics file for Pop2 (base population)"
        } else if (field.fieldType === "genotype_directory") {
          description =
            "Directory containing PLINK format genotype files (.bed, .bim, .fam) for Pop2 (base population)"
        } else if (field.fieldType === "phenotype_path") {
          description = "Phenotype data file for Pop2 (base population)"
        }

        return {
          ...field,
          id: field.id.replace("source_population", "pop2"),
          label: nextLabel,
          description,
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
        acceptedTypes: [".txt", ".csv", ".sumstats"],
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
        acceptedTypes: [".txt", ".csv", ".sumstats"],
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
        (tool): tool is string => typeof tool === "string"
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

  const handleBaseModalOpenChange = (open: boolean) => {
    if (!open) {
      setBaseModalState({ open: false, mode: "create" })
    } else {
      setBaseModalState((prev) => ({ ...prev, open: true }))
    }
  }

  const toolConfigs = jobMapping?.toolConfigs ?? {}
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
      ? (activeTabFromStore as string)
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
  const [savedPopulations, setSavedPopulations] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (hasHydratedFromPropsRef.current || !jobId || !data) {
      return
    }

    hasHydratedFromPropsRef.current = true

    if (data.toolMappings) {
      Object.entries(data.toolMappings).forEach(([tool, mappings]) => {
        setToolMappings(tool, mappings as Record<string, unknown>)
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
          setToolPopulation(tool, {
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
        setToolPopulation(tool, {
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
          const key = tool.toLowerCase()
          if (filled) next[key] = true
        })
        return next
      })
    }
  }, [data, jobId, selectedToolsKey, setToolMappings, setToolPopulation])

  type MappingValue = FileInfo | DirectoryItem | null

  const getPopulationForTool = (toolId: string): ToolPopulationState => {
    if (toolId.toLowerCase() === "prscsx" && prscsxConfig) {
      return {
        targetPopulation: prscsxConfig.target.name || "",
        sourcePopulation: prscsxConfig.bases[0]?.name || "",
      }
    }

    const toolState = toolConfigs[toolId]
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
    const toolState = toolConfigs[toolId]
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

    const current = getPopulationForTool(toolId)
    setToolPopulation(toolId, {
      ...current,
      [field]: value,
    })

    const toolKey = toolId.toLowerCase()
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

    const requiredFields = getFieldsForTool(toolId).filter((field) => field.required)

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
      (toolKey === "prsice" || toolKey === "bridgeprs") &&
      (!populations.targetPopulation || !populations.sourcePopulation)
    ) {
      return false
    }

    if (
      (toolKey === "prsice" || toolKey === "bridgeprs") &&
      !savedPopulations[toolKey]
    ) {
      return false
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

    const missing = getMissingMappingsForTool(toolId)
    return missing.length === 0
  }

  const isPopulationConfigured = (toolId: string) => {
    if (!toolId) return false
    const toolKey = toolId.toLowerCase()

    if (toolKey === "prsice" || toolKey === "bridgeprs") {
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

    setToolFieldValue(toolId, fieldId, selectedFile)
    setSelectedFile(null)
    toast.success(`Mapped ${selectedFile.name} to ${fieldId}`)
  }

  const mapDirectoryToField = (fieldId: string, toolId: string = activeTab) => {
    if (!selectedDirectory || !toolId) return

    setToolFieldValue(toolId, fieldId, selectedDirectory)
    setSelectedDirectory(null)
    toast.success(`Mapped ${selectedDirectory.name} to ${fieldId}`)
  }

  const removeMapping = (fieldId: string, toolId: string = activeTab) => {
    if (!toolId) return
    setToolFieldValue(toolId, fieldId, null)
  }

  const selectFileFromDropdown = (
    fieldId: string,
    filePath: string,
    toolId: string = activeTab
  ) => {
    if (!toolId) return
    const file = datasetStructure?.files.find((f) => f.path === filePath)
    if (file) {
      setToolFieldValue(toolId, fieldId, file)
      toast.success(`Mapped ${file.name} to ${fieldId}`)
    }
  }

  const selectDirectoryFromDropdown = (
    fieldId: string,
    directoryPath: string,
    toolId: string = activeTab
  ) => {
    if (!toolId) return
    const directory = datasetStructure?.directories.find(
      (d) => d.path === directoryPath
    )
    if (directory) {
      setToolFieldValue(toolId, fieldId, directory)
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

    if (file) {
      setToolFieldValue(toolId, fieldId, file)
      toast.success(`Mapped ${file.name} to ${fieldId}`)
    } else if (directory) {
      setToolFieldValue(toolId, fieldId, directory)
      toast.success(
        `Mapped directory ${directory.name} to ${fieldId}`
      )
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
    const key = tool.toLowerCase()
    const populations = getPopulationForTool(tool)
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
      prscsx: () => {
        const mappingPath = (fieldId: string) => getMappingPath("prscsx", fieldId)

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
        ? isValidDirectoryForField(selectedDirectory, field)
        : false
      const isCompatible = isFileCompatible || isDirectoryCompatible
      const isMapped = Boolean(mappedValue)
      const eligibleFiles = getEligibleFilesForField(field)
      const eligibleDirectories = getEligibleDirectoriesForField(field)
      const canMapSelectedFile =
        isFileCompatible && field.fieldType !== "genotype_directory"
      const canMapSelectedDirectory =
        isDirectoryCompatible && field.fieldType === "genotype_directory"
      const canMapSelection = canMapSelectedFile || canMapSelectedDirectory

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
                {field.label}
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
                  <Badge className="border-red-300 bg-red-50 text-red-700">Required</Badge>
                )
              ) : (
                <Badge variant="secondary">Optional</Badge>
              )}

              {((isCompatible && !isMapped) || canMapSelection) && (
                <div className="flex items-center gap-2">
                  {isCompatible && !isMapped && (
                    <span className="text-xs text-blue-600">
                      Selected {selectedFile ? "file" : "directory"} is compatible
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
                        {field.fieldType === "genotype_directory" ? (
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
                          ? field.fieldType === "genotype_directory"
                            ? "Drop directory here"
                            : "Drop file here"
                          : field.fieldType === "genotype_directory"
                            ? "Drag directory here or use dropdown"
                            : "Drag file here or use dropdown"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Or select:</Label>
                        <Select
                          onValueChange={(value) => {
                            if (field.fieldType === "genotype_directory") {
                              selectDirectoryFromDropdown(field.id, value, tool)
                            } else {
                              selectFileFromDropdown(field.id, value, tool)
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                field.fieldType === "genotype_directory"
                                  ? "Choose a directory..."
                                  : "Choose a file..."
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {field.fieldType === "genotype_directory"
                              ? eligibleDirectories.map((directory) => (
                                  <SelectItem
                                    key={directory.path}
                                    value={directory.path}
                                  >
                                    {directory.path}
                                  </SelectItem>
                                ))
                              : eligibleFiles.map((file) => (
                                  <SelectItem key={file.path} value={file.path}>
                                    {file.name}
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
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
                <CardTitle className="text-sm font-semibold text-orange-900">Population configuration required</CardTitle>
                <CardDescription className="text-xs text-orange-700">
                  Please configure population(s) for {toolDisplayNames[tool.toLowerCase()] || tool} before mapping files.
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
      const pop1Name = populations.targetPopulation || "Pop1"
      const pop2Name = populations.sourcePopulation || "Pop2"
      populationLabel = `${pop1Name} (Pop1) and ${pop2Name} (Pop2)`
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
    directory: DirectoryItem,
    field: MappingField
  ) => {
    // Only genotype directory fields can accept directories
    if (field.fieldType === "genotype_directory") {
      return true
    }
    return false
  }

  const getEligibleFilesForField = (field: MappingField) => {
    if (!datasetStructure) return []
    return datasetStructure.files.filter((file) =>
      isValidFileForField(file, field)
    )
  }

  const getEligibleDirectoriesForField = (field: MappingField) => {
    if (!datasetStructure) return []
    return datasetStructure.directories.filter((directory) =>
      isValidDirectoryForField(directory, field)
    )
  }

  const handlePopulationFormSubmit = (toolId: string) => {
    const populations = getPopulationForTool(toolId)

    if (!populations.targetPopulation || !populations.sourcePopulation) {
      toast.error("Please provide both target and source population names")
      return
    }

    const toolKey = toolId.toLowerCase()
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
    const incompleteTools = selectedTools.filter((tool) => !computeToolValidity(tool))
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
            genotype_config: { file_type: "merged" },
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

        configData[tool] = {
          pre_processing: {
            pop1: pop1Config,
            pop2: pop2Config,
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
  const allToolsValid = selectedTools.length > 0 && selectedTools.every((t) => computeToolValidity(t))
  const isNextDisabled = !datasetStructure || selectedTools.length === 0 || !allToolsValid

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

        {/* Status Message */}
        {!datasetStructure && jobStatus && (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Current Status</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {jobStatus.status === "CREATED"
                    ? "Job created but no files uploaded yet."
                    : jobStatus.status === "PROCESSING"
                      ? "Files are being processed and extracted."
                      : jobStatus.status === "FAILED"
                        ? "Job processing failed."
                        : jobStatus.status === "CANCELLED"
                          ? "Job was cancelled."
                          : "Waiting for files to be ready."}
                </p>
              </div>
              <Badge
                variant={jobStatus.status === "UPLOADED" ? "default" : "outline"}
                className={
                  jobStatus.status === "CREATED"
                    ? "bg-blue-100 text-blue-800"
                    : jobStatus.status === "PROCESSING"
                      ? "bg-yellow-100 text-yellow-800"
                      : jobStatus.status === "FAILED"
                        ? "bg-red-100 text-red-800"
                        : jobStatus.status === "CANCELLED"
                          ? "bg-gray-100 text-gray-800"
                          : ""
                }
              >
                {jobStatus.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {jobStatus.message || "Processing job, please wait..."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
                  className="group rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-semibold transition-all duration-200 hover:bg-muted/40 data-[state=active]:border-primary data-[complete=false]:text-muted-foreground/80 data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  <span className="flex items-center gap-2">
                    {toolDisplayNames[tool.toLowerCase()] || tool}
                    {isComplete && (
                      <Badge
                        variant="outline"
                        className="hidden text-xs sm:inline-flex text-orange-600 border-orange-600 group-data-[state=active]:text-white group-data-[state=active]:border-white"
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
