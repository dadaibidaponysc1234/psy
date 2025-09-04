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
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Eye,
  Folder,
  File,
  Loader2,
  RefreshCw,
  Grip,
  CheckCircle,
  X,
  Undo2,
  MapPin,
  ChevronDown,
  ChevronRight,
  Users,
} from "lucide-react"
import { getBenchmarkUploadUrl, getBenchmarkJobStatusUrl } from "@/lib/config"
import axios from "axios"
import { toast } from "react-hot-toast"
import { FileExplorer } from "./file-explorer"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"

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
  population: "target" | "source"
  fieldType: "sumstats_path" | "genotype_path" | "phenotype_path"
}

interface MappingProps {
  onNext: (data: any) => void
  onPrevious?: () => void
  data?: any
  toolsData?: any
}

// Get mapping fields based on the config structure
const getToolMappingFields = (tool: string): MappingField[] => {
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
      label: "Target Population - Genotype Files",
      description: "PLINK format genotype files for target population",
      acceptedTypes: [".bed", ".bim", ".fam"],
      required: true,
      population: "target",
      fieldType: "genotype_path",
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
      label: "Source Population - Genotype Files",
      description: "PLINK format genotype files for source population",
      acceptedTypes: [".bed", ".bim", ".fam"],
      required: true,
      population: "source",
      fieldType: "genotype_path",
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

  return baseFields
}

export function Mapping({ onNext, onPrevious, data, toolsData }: MappingProps) {
  const [datasetStructure, setDatasetStructure] =
    useState<DatasetStructure | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("")
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)
  const [isPopulationFormOpen, setIsPopulationFormOpen] = useState(true)
  const [populationNames, setPopulationNames] = useState({
    targetPopulation: "",
    sourcePopulation: "",
  })

  // Tool-specific mappings
  const [toolMappings, setToolMappings] = useState<
    Record<string, Record<string, FileInfo | null>>
  >({})

  const { jobId, stepData, setStepData } = useBenchmarkingStore()

  const selectedTools = toolsData?.selectedTools || []

  // Helper functions for store persistence
  const getMappingStorageKey = () => `mapping_${jobId}`
  const getPopulationStorageKey = () => `populations_${jobId}`

  const saveMappingsToStore = (
    mappings: Record<string, Record<string, FileInfo | null>>
  ) => {
    if (jobId) {
      setStepData(getMappingStorageKey(), mappings)
    }
  }

  const savePopulationsToStore = (populations: {
    targetPopulation: string
    sourcePopulation: string
  }) => {
    if (jobId) {
      setStepData(getPopulationStorageKey(), populations)
    }
  }

  const loadMappingsFromStore = (): Record<
    string,
    Record<string, FileInfo | null>
  > => {
    if (jobId && stepData[getMappingStorageKey()]) {
      return stepData[getMappingStorageKey()]
    }
    return {}
  }

  const loadPopulationsFromStore = (): {
    targetPopulation: string
    sourcePopulation: string
  } => {
    if (jobId && stepData[getPopulationStorageKey()]) {
      return stepData[getPopulationStorageKey()]
    }
    return { targetPopulation: "", sourcePopulation: "" }
  }

  // Initialize active tab to first selected tool
  useEffect(() => {
    if (selectedTools.length > 0 && !activeTab) {
      setActiveTab(selectedTools[0])
    }
  }, [selectedTools, activeTab])

  // Load saved data from store when component mounts or jobId changes
  useEffect(() => {
    if (jobId) {
      // Load saved mappings
      const savedMappings = loadMappingsFromStore()
      if (Object.keys(savedMappings).length > 0) {
        setToolMappings(savedMappings)
      }

      // Load saved population names
      const savedPopulations = loadPopulationsFromStore()
      if (
        savedPopulations.targetPopulation ||
        savedPopulations.sourcePopulation
      ) {
        setPopulationNames(savedPopulations)
        // If populations are already set, close the form
        if (
          savedPopulations.targetPopulation &&
          savedPopulations.sourcePopulation
        ) {
          setIsPopulationFormOpen(false)
        }
      }
    }
  }, [jobId])

  // Save population names to store whenever they change
  useEffect(() => {
    if (
      jobId &&
      (populationNames.targetPopulation || populationNames.sourcePopulation)
    ) {
      savePopulationsToStore(populationNames)
    }
  }, [populationNames, jobId])

  // Initialize mappings for each tool
  useEffect(() => {
    const newMappings: Record<string, Record<string, FileInfo | null>> = {}
    selectedTools.forEach((tool: string) => {
      // First try to load from store, then fall back to data prop, then initialize empty
      if (toolMappings[tool]) {
        newMappings[tool] = toolMappings[tool]
      } else if (data?.toolMappings?.[tool]) {
        newMappings[tool] = data.toolMappings[tool]
      } else {
        const fields = getToolMappingFields(tool)
        newMappings[tool] = Object.fromEntries(
          fields.map((field) => [field.id, null])
        )
      }
    })
    setToolMappings(newMappings)
  }, [selectedTools, data?.toolMappings])

  useEffect(() => {
    // DEMO MODE: Commented out test data for demo flow
    // TODO: Uncomment this section when returning to test mode

    /*
    const testData = {
      job_id: "dc0973dd-5a18-44e5-8b16-625e530e58b4",
      status: "uploaded",
      dataset_structure: {
        directories: [
          {
            name: "h3gwas_data",
            path: "h3gwas_data",
            file_count: 1,
            total_size: 1473958444,
            total_size_formatted: "1.4 GB",
          },
          {
            name: "1000G_5P",
            path: "h3gwas_data\\1000G_5P",
            file_count: 72,
            total_size: 7781479906,
            total_size_formatted: "7.2 GB",
          },
          {
            name: "geno",
            path: "h3gwas_data\\geno",
            file_count: 3,
            total_size: 6171262,
            total_size_formatted: "5.9 MB",
          },
          {
            name: "pheno",
            path: "h3gwas_data\\pheno",
            file_count: 2,
            total_size: 21657,
            total_size_formatted: "21.1 KB",
          },
          {
            name: "sumstats",
            path: "h3gwas_data\\sumstats",
            file_count: 0,
            total_size: 0,
            total_size_formatted: "0.0 B",
          },
          {
            name: "AFR",
            path: "h3gwas_data\\sumstats\\AFR",
            file_count: 1,
            total_size: 4837307,
            total_size_formatted: "4.6 MB",
          },
          {
            name: "EUR",
            path: "h3gwas_data\\sumstats\\EUR",
            file_count: 1,
            total_size: 3507188,
            total_size_formatted: "3.3 MB",
          },
        ],
        files: [
          {
            name: "1000G_5P.tar.gz",
            path: "h3gwas_data\\1000G_5P.tar.gz",
            size: 1473958444,
            size_formatted: "1.4 GB",
            file_type: "binary",
            is_previewable: false,
            last_modified: "2025-08-11T09:23:25.340576",
          },
          {
            name: "AFR_IDS.txt",
            path: "h3gwas_data\\1000G_5P\\AFR_IDS.txt",
            size: 10576,
            size_formatted: "10.3 KB",
            file_type: "text",
            is_previewable: true,
            last_modified: "2025-08-11T09:23:25.341852",
          },
          {
            name: "AMR_IDS.txt",
            path: "h3gwas_data\\1000G_5P\\AMR_IDS.txt",
            size: 5552,
            size_formatted: "5.4 KB",
            file_type: "text",
            is_previewable: true,
            last_modified: "2025-08-11T09:23:25.343240",
          },
          {
            name: "EAS_IDS.txt",
            path: "h3gwas_data\\1000G_5P\\EAS_IDS.txt",
            size: 8064,
            size_formatted: "7.9 KB",
            file_type: "text",
            is_previewable: true,
            last_modified: "2025-08-11T09:24:02.306235",
          },
          {
            name: "EUR_IDS.txt",
            path: "h3gwas_data\\1000G_5P\\EUR_IDS.txt",
            size: 8048,
            size_formatted: "7.9 KB",
            file_type: "text",
            is_previewable: true,
            last_modified: "2025-08-11T09:24:02.307732",
          },
          {
            name: "SAS_IDS.txt",
            path: "h3gwas_data\\1000G_5P\\SAS_IDS.txt",
            size: 7824,
            size_formatted: "7.6 KB",
            file_type: "text",
            is_previewable: true,
            last_modified: "2025-08-11T09:24:02.310280",
          },
          {
            name: "chr1.bed",
            path: "h3gwas_data\\1000G_5P\\chr1.bed",
            size: 571354585,
            size_formatted: "544.9 MB",
            file_type: "text",
            is_previewable: false,
            last_modified: "2025-08-11T09:23:28.123828",
          },
          {
            name: "chr1.bim",
            path: "h3gwas_data\\1000G_5P\\chr1.bim",
            size: 26153244,
            size_formatted: "24.9 MB",
            file_type: "text",
            is_previewable: false,
            last_modified: "2025-08-11T09:23:28.280067",
          },
          {
            name: "chr1.fam",
            path: "h3gwas_data\\1000G_5P\\chr1.fam",
            size: 62600,
            size_formatted: "61.1 KB",
            file_type: "text",
            is_previewable: true,
            last_modified: "2025-08-11T09:23:28.281057",
          },
          {
            name: "geno.bed",
            path: "h3gwas_data\\geno\\geno.bed",
            size: 4995378,
            size_formatted: "4.8 MB",
            file_type: "text",
            is_previewable: false,
            last_modified: "2025-08-11T09:24:03.135555",
          },
          {
            name: "geno.bim",
            path: "h3gwas_data\\geno\\geno.bim",
            size: 1162884,
            size_formatted: "1.1 MB",
            file_type: "text",
            is_previewable: true,
            last_modified: "2025-08-11T09:24:03.142981",
          },
          {
            name: "geno.fam",
            path: "h3gwas_data\\geno\\geno.fam",
            size: 13000,
            size_formatted: "12.7 KB",
            file_type: "text",
            is_previewable: true,
            last_modified: "2025-08-11T09:24:03.143982",
          },
          {
            name: "pheno_test.AFR",
            path: "h3gwas_data\\pheno\\pheno_test.AFR",
            size: 12230,
            size_formatted: "11.9 KB",
            file_type: "unknown",
            is_previewable: false,
            last_modified: "2025-08-11T09:24:03.144984",
          },
          {
            name: "pheno_test.EUR",
            path: "h3gwas_data\\pheno\\pheno_test.EUR",
            size: 9427,
            size_formatted: "9.2 KB",
            file_type: "unknown",
            is_previewable: false,
            last_modified: "2025-08-11T09:24:03.146358",
          },
          {
            name: "AFR_sumstats.txt",
            path: "h3gwas_data\\sumstats\\AFR\\AFR_sumstats.txt",
            size: 4837307,
            size_formatted: "4.6 MB",
            file_type: "text",
            is_previewable: true,
            last_modified: "2025-08-11T09:24:03.175250",
          },
          {
            name: "EUR_sumstats.txt",
            path: "h3gwas_data\\sumstats\\EUR\\EUR_sumstats.txt",
            size: 3507188,
            size_formatted: "3.3 MB",
            file_type: "text",
            is_previewable: true,
            last_modified: "2025-08-11T09:24:03.192749",
          },
        ],
        total_files: 80,
        total_directories: 7,
        extracted_size: "8.6 GB",
        root_path:
          "benchmark_jobs\\dc0973dd-5a18-44e5-8b16-625e530e58b4\\dataset",
      },
      message: null,
    }

    // Set the test data directly
    setDatasetStructure(testData.dataset_structure)
    setLoading(false)
    console.log("📁 Using test dataset structure:", testData.dataset_structure)
    */

    // DEMO MODE: Check for existing job and load data if available

    if (jobId) {
      checkStatusAndLoadData()
    } else {
      setLoading(false)
    }
  }, [])

  const checkJobStatus = async () => {
    try {
      if (!jobId) {
        throw new Error("No job ID found")
      }

      const response = await axios.get<JobStatusResponse>(
        getBenchmarkJobStatusUrl(jobId)
      )

      console.log("📊 Job status response:", response.data)
      setJobStatus(response.data)
      return response.data
    } catch (err) {
      console.error("❌ Failed to fetch job status:", err)
      throw err
    }
  }

  const checkStatusAndLoadData = async () => {
    setLoading(true)
    setError(null)

    try {
      // First check job status
      const statusData = await checkJobStatus()
      console.log("Status data:", statusData)

      // If status is uploaded, fetch dataset structure
      if (statusData.status && statusData.status.toLowerCase() === "uploaded") {
        console.log("Fetching dataset structure")
        await fetchDatasetStructure()
      } else {
        // Show status message but don't load dataset structure
        setLoading(false)
      }
    } catch (err) {
      console.error("❌ Failed to check status:", err)
      setError(
        err instanceof Error ? err.message : "Failed to check job status"
      )
      setLoading(false)
    }
  }

  const fetchDatasetStructure = async () => {
    try {
      if (!jobId) {
        throw new Error("No job ID found. Please upload files first.")
      }

      const response = await axios.get<ExploreResponse>(
        `${getBenchmarkUploadUrl().replace("/upload", "")}/${jobId}/explore`
      )

      console.log("📁 Dataset structure response:", response.data)
      setDatasetStructure(response.data.dataset_structure)
      setLoading(false)
    } catch (err) {
      console.error("❌ Failed to fetch dataset structure:", err)
      setError(
        err instanceof Error ? err.message : "Failed to fetch dataset structure"
      )
      toast.error("Failed to fetch dataset structure")
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsCheckingStatus(true)
    try {
      await checkStatusAndLoadData()
      toast.success("Status refreshed successfully")
    } catch (err) {
      console.error("Failed to refresh:", err)
    } finally {
      setIsCheckingStatus(false)
    }
  }

  // File selection handlers
  const handleFileSelect = (file: FileInfo) => {
    setSelectedFile(file)
    console.log("Selected file for mapping:", file)
  }

  const clearSelectedFile = () => {
    setSelectedFile(null)
  }

  // Mapping handlers
  const mapFileToField = (fieldId: string) => {
    if (!selectedFile) return

    const newMappings = {
      ...toolMappings,
      [activeTab]: {
        ...toolMappings[activeTab],
        [fieldId]: selectedFile,
      },
    }

    setToolMappings(newMappings)
    saveMappingsToStore(newMappings) // Save to store
    setSelectedFile(null)
    toast.success(`Mapped ${selectedFile.name} to ${fieldId}`)
  }

  const removeMapping = (fieldId: string) => {
    const newMappings = {
      ...toolMappings,
      [activeTab]: {
        ...toolMappings[activeTab],
        [fieldId]: null,
      },
    }

    setToolMappings(newMappings)
    saveMappingsToStore(newMappings) // Save to store
  }

  const selectFileFromDropdown = (fieldId: string, filePath: string) => {
    const file = datasetStructure?.files.find((f) => f.path === filePath)
    if (file) {
      const newMappings = {
        ...toolMappings,
        [activeTab]: {
          ...toolMappings[activeTab],
          [fieldId]: file,
        },
      }

      setToolMappings(newMappings)
      saveMappingsToStore(newMappings) // Save to store
      toast.success(`Mapped ${file.name} to ${fieldId}`)
    }
  }

  // Drag and drop handlers
  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result

    if (!destination) {
      return
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const file = findFileById(draggableId)
    if (file) {
      const newMappings = {
        ...toolMappings,
        [activeTab]: {
          ...toolMappings[activeTab],
          [destination.droppableId]: file,
        },
      }

      setToolMappings(newMappings)
      saveMappingsToStore(newMappings) // Save to store
      toast.success(`Mapped ${file.name} to ${destination.droppableId}`)
    }
  }

  const findFileById = (id: string): FileInfo | null => {
    if (!datasetStructure) return null
    return datasetStructure.files.find((file) => file.path === id) || null
  }

  const isValidFileForField = (file: FileInfo, field: MappingField) => {
    // Allow any file format for phenotype fields
    if (field.fieldType === "phenotype_path") {
      return true
    }
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || ""
    return field.acceptedTypes.includes(`.${fileExtension}`)
  }

  const getCompatibleFields = (file: FileInfo) => {
    if (!file) return []
    const fields = getToolMappingFields(activeTab)
    return fields.filter((field) => isValidFileForField(file, field))
  }

  const getEligibleFilesForField = (field: MappingField) => {
    if (!datasetStructure) return []
    return datasetStructure.files.filter((file) =>
      isValidFileForField(file, field)
    )
  }

  const handlePopulationFormSubmit = () => {
    if (
      !populationNames.targetPopulation ||
      !populationNames.sourcePopulation
    ) {
      toast.error("Please provide both target and source population names")
      return
    }

    savePopulationsToStore(populationNames) // Save to store
    setIsPopulationFormOpen(false)
    toast.success("Population names saved! You can now start mapping files.")
  }

  const handleNext = () => {
    if (!datasetStructure) {
      toast.error("Please wait for dataset structure to load")
      return
    }

    if (
      !populationNames.targetPopulation ||
      !populationNames.sourcePopulation
    ) {
      toast.error("Please provide population names first")
      return
    }

    // Validate that all required fields are mapped for each tool
    const unmappedTools: string[] = []

    selectedTools.forEach((tool: string) => {
      const fields = getToolMappingFields(tool)
      const requiredFields = fields.filter((field) => field.required)
      const unmappedRequired = requiredFields.filter(
        (field) => !toolMappings[tool]?.[field.id]
      )

      if (unmappedRequired.length > 0) {
        unmappedTools.push(tool)
      }
    })

    if (unmappedTools.length > 0) {
      toast.error(
        `Please map all required fields for: ${unmappedTools.join(", ")}`
      )
      return
    }

    // Build the config object based on mappings
    const configData: Record<string, any> = {}

    selectedTools.forEach((tool: string) => {
      const toolConfig: ToolConfig = {
        target_population: {
          name: populationNames.targetPopulation,
          sumstats_path:
            toolMappings[tool]["target_population.sumstats_path"]?.path || "",
          genotype_path:
            toolMappings[tool]["target_population.genotype_path"]?.path || "",
          phenotype_path:
            toolMappings[tool]["target_population.phenotype_path"]?.path || "",
        },
        source_population: {
          name: populationNames.sourcePopulation,
          sumstats_path:
            toolMappings[tool]["source_population.sumstats_path"]?.path || "",
          genotype_path:
            toolMappings[tool]["source_population.genotype_path"]?.path || "",
          phenotype_path:
            toolMappings[tool]["source_population.phenotype_path"]?.path || "",
        },
        // output_dir: `results/preprocessed_data/preprocessed_${tool.toLowerCase()}_output`,
        // column_mappings: {
        //   SNP: "RS",
        //   CHR: "CHR",
        //   BP: "PS",
        //   A1: "ALLELE1",
        //   A2: "ALLELE0",
        //   BETA: "BETA",
        //   P: "P_WALD",
        // },
        // phenotype_config: {
        //   target_population: {
        //     binary_traits: ["PHENOQC_QL"],
        //     quantitative_traits: ["PHENO_QT1"],
        //   },
        //   source_population: {
        //     binary_traits: ["PHENOQC_QL"],
        //     quantitative_traits: ["PHENO_QT1"],
        //   },
        // },
        // genotype_config: {
        //   file_type: "merged",
        //   population_reference: "target_population",
        //   file_patterns: {
        //     bed: "*.bed",
        //     bim: "*.bim",
        //     fam: "*.fam",
        //   },
        // },
        // processing_options: {
        //   process_binary_phenotypes: true,
        //   process_quantitative_phenotypes: true,
        //   skip_missing_columns: false,
        //   overwrite_existing: false,
        // },
      }

      configData[tool] = toolConfig
    })

    onNext({
      toolMappings,
      datasetStructure,
      populationNames,
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
              onClick={checkStatusAndLoadData}
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

  return (
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
      <Collapsible
        open={isPopulationFormOpen}
        onOpenChange={setIsPopulationFormOpen}
      >
        <Card className="border-orange-200 bg-orange-50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer transition-colors hover:bg-orange-100/50">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-orange-900">
                  {isPopulationFormOpen
                    ? "Population Configuration"
                    : "Population Configuration (Completed)"}
                </CardTitle>
                {isPopulationFormOpen ? (
                  <ChevronDown className="h-4 w-4 text-orange-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-orange-600" />
                )}
              </div>
              <CardDescription className="text-orange-700">
                Define your target and source population names before mapping
                files
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="targetPopulation">
                    Target Population Name
                  </Label>
                  <Input
                    id="targetPopulation"
                    placeholder="e.g., AFR, EUR, AMR"
                    value={populationNames.targetPopulation}
                    onChange={(e) =>
                      setPopulationNames((prev) => ({
                        ...prev,
                        targetPopulation: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    The population you want to predict risk for
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sourcePopulation">
                    Source Population Name
                  </Label>
                  <Input
                    id="sourcePopulation"
                    placeholder="e.g., EUR, AFR, AMR"
                    value={populationNames.sourcePopulation}
                    onChange={(e) =>
                      setPopulationNames((prev) => ({
                        ...prev,
                        sourcePopulation: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    The population used to train the risk model
                  </p>
                </div>
              </div>
              <Button
                onClick={handlePopulationFormSubmit}
                disabled={
                  !populationNames.targetPopulation ||
                  !populationNames.sourcePopulation
                }
                className="bg-orange-600 hover:bg-orange-700"
              >
                Save Population Names
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Status Message */}
      {!datasetStructure && jobStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Badge
                  variant={
                    jobStatus.status === "UPLOADED" ? "default" : "outline"
                  }
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
                <p className="mt-2 text-sm text-muted-foreground">
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected File Display */}
      {selectedFile && (
        <Card className="border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <File className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium text-blue-900">
                  {selectedFile.name}
                </div>
                <div className="text-xs text-blue-700">{selectedFile.path}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-blue-700 sm:inline">
                Compatible fields highlighted below
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelectedFile}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content */}
      {datasetStructure && !isPopulationFormOpen && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
            {/* File Explorer */}
            <div className="order-2 lg:order-1 lg:col-span-5">
              <Droppable droppableId="file-explorer" isDropDisabled={true}>
                {(provided: any) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    <FileExplorer
                      datasetStructure={datasetStructure}
                      onFileSelect={handleFileSelect}
                      jobId={jobId}
                      selectedFile={selectedFile}
                    />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Mapping Panel */}
            <div className="order-1 lg:order-2 lg:col-span-7">
              <Card className="flex h-[400px] flex-col lg:h-[600px]">
                <CardHeader className="flex-shrink-0">
                  <CardTitle>Configuration Mapping</CardTitle>
                  <CardDescription>
                    Map files to the configuration structure for{" "}
                    {populationNames.targetPopulation || "target"} and{" "}
                    {populationNames.sourcePopulation || "source"} populations
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col overflow-hidden">
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex h-full flex-col"
                  >
                    <TabsList className="grid h-auto w-full flex-shrink-0 grid-cols-1 border-b border-gray-200 bg-transparent p-0 sm:grid-cols-2">
                      {selectedTools.map((tool: string) => (
                        <TabsTrigger
                          key={tool}
                          value={tool}
                          className="rounded-none border-b-2 border-transparent transition-all duration-200 hover:bg-gray-50/50 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                        >
                          {tool}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {selectedTools.map((tool: string) => (
                      <TabsContent
                        key={tool}
                        value={tool}
                        className="mt-4 flex-1 overflow-hidden"
                      >
                        <div className="h-full space-y-4 overflow-y-auto pr-2">
                          {getToolMappingFields(tool).map((field) => {
                            const isCompatible = selectedFile
                              ? isValidFileForField(selectedFile, field)
                              : false
                            const isMapped = toolMappings[tool]?.[field.id]
                            const eligibleFiles =
                              getEligibleFilesForField(field)

                            return (
                              <Card
                                key={field.id}
                                className={`rounded-md border-2 transition-all ${
                                  isMapped
                                    ? "border-green-500 bg-green-50"
                                    : isCompatible
                                      ? "border-blue-500 bg-blue-50"
                                      : "border-muted"
                                }`}
                              >
                                <CardHeader>
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                      <CardTitle className="text-lg">
                                        {field.label}
                                      </CardTitle>
                                      <CardDescription>
                                        {field.description}
                                      </CardDescription>
                                      <div className="flex flex-wrap gap-1">
                                        {field.acceptedTypes.map((type) => (
                                          <Badge key={type} variant="outline">
                                            {type}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {field.required && (
                                        <Badge
                                          variant="outline"
                                          className="bg-red-100 text-red-800"
                                        >
                                          Required
                                        </Badge>
                                      )}
                                      {isCompatible && (
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            mapFileToField(field.id)
                                          }
                                          className="bg-blue-600 hover:bg-blue-700"
                                        >
                                          <MapPin className="mr-1 h-3 w-3" />
                                          Map
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <Droppable droppableId={field.id}>
                                    {(provided: any, snapshot: any) => (
                                      <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex min-h-[80px] items-center justify-center rounded-md p-4 ${
                                          snapshot.isDraggingOver
                                            ? "bg-blue-100"
                                            : "bg-transparent"
                                        }`}
                                      >
                                        {isMapped ? (
                                          <div className="flex w-full items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <File className="h-4 w-4 text-gray-500" />
                                              <div>
                                                <div className="font-medium">
                                                  {
                                                    toolMappings[tool]?.[
                                                      field.id
                                                    ]?.name
                                                  }
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                  {
                                                    toolMappings[tool]?.[
                                                      field.id
                                                    ]?.path
                                                  }
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex gap-2">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  removeMapping(field.id)
                                                }
                                              >
                                                <X className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="w-full space-y-3">
                                            <div className="text-center text-muted-foreground">
                                              {snapshot.isDraggingOver
                                                ? "Drop file here"
                                                : "Drag file here or use dropdown"}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Label className="text-sm">
                                                Or select:
                                              </Label>
                                              <Select
                                                onValueChange={(value) =>
                                                  selectFileFromDropdown(
                                                    field.id,
                                                    value
                                                  )
                                                }
                                              >
                                                <SelectTrigger className="w-full">
                                                  <SelectValue placeholder="Choose a file..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {eligibleFiles.map((file) => (
                                                    <SelectItem
                                                      key={file.path}
                                                      value={file.path}
                                                    >
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
                          })}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </DragDropContext>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        {onPrevious && (
          <Button variant="outline" onClick={onPrevious}>
            Back
          </Button>
        )}
        <Button
          onClick={handleNext}
          disabled={
            !datasetStructure ||
            !populationNames.targetPopulation ||
            !populationNames.sourcePopulation ||
            selectedTools.some((tool: string) => {
              const fields = getToolMappingFields(tool)
              const requiredFields = fields.filter((field) => field.required)
              return requiredFields.some(
                (field) => !toolMappings[tool]?.[field.id]
              )
            })
          }
        >
          Next
        </Button>
      </div>
    </div>
  )
}
