"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
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
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronRight, Eye, Loader2, Info } from "lucide-react"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"
import axios from "axios"
import { getBenchmarkPreviewUrl, getBenchmarkConfigUrl } from "@/lib/config"
import { toast } from "react-hot-toast"

// Type definitions
interface ColumnMapping {
  [prsField: string]: string
}

interface PhenotypeConfig {
  target_population: {
    binary_traits: string[]
    quantitative_traits: string[]
  }
  source_population: {
    binary_traits: string[]
    quantitative_traits: string[]
  }
}

interface GenotypeConfig {
  file_type: "merged" | "split_by_chromosome"
  population_reference: "target_population" | "source_population"
  file_patterns: {
    bed: string
    bim: string
    fam: string
  }
}

interface ProcessingOptions {
  evaluation_type?: "both" | "binary" | "quantitative"
  process_binary_phenotypes: boolean
  process_quantitative_phenotypes: boolean
  skip_missing_columns: boolean
  overwrite_existing: boolean
}

// Tool-specific processing options configuration
const BASE_PROCESSING_OPTIONS: [keyof ProcessingOptions, string][] = [
  ["skip_missing_columns", "Skip missing columns"],
  ["overwrite_existing", "Overwrite existing outputs"],
]

const TOOL_PROCESSING_OPTIONS: Record<
  string,
  [keyof ProcessingOptions, string][]
> = {
  PRSice: BASE_PROCESSING_OPTIONS,
}

interface ToolConfig {
  target_population: {
    name: string
    sumstats_path: string
    genotype_path: string
    phenotype_path: string
  }
  source_population: {
    name: string
    sumstats_path: string
    genotype_path: string
    phenotype_path: string
  }
  output_dir: string
  column_mappings: ColumnMapping
  phenotype_config: PhenotypeConfig
  genotype_config: GenotypeConfig
  options: ProcessingOptions
}

interface ToolConfigurationProps {
  onNext: (data: {
    configs: Record<string, ToolConfig>
    submitted: boolean
    jobId: string
    timestamp: string
  }) => void
  onPrevious?: () => void
  data?: Record<string, ToolConfig>
  toolsData?: any
  mappingData?: any
}

// Tool-specific column mapping requirements (currently only PRSice)
const TOOL_COLUMN_REQUIREMENTS: Record<string, string[]> = {
  PRSice: ["SNP", "CHR", "BP", "A1", "A2", "BETA", "P"],
}

// Helper function to get requirements case-insensitively
const getToolRequirements = (toolName: string): string[] => {
  const normalizedToolName = Object.keys(TOOL_COLUMN_REQUIREMENTS).find(
    (key) => key.toLowerCase() === toolName.toLowerCase()
  )
  return normalizedToolName ? TOOL_COLUMN_REQUIREMENTS[normalizedToolName] : []
}

// Constants for column mapping auto-selection
const COLUMN_MAPPING: Record<string, string[]> = {
  SNP: ["SNP", "RSID", "RS", "ID", "MARKERNAME", "VARIANT_ID", "SNP_ID"],
  CHR: ["CHR", "CHROMOSOME", "#CHROM", "CHROM"],
  BP: [
    "BP",
    "POS",
    "PS",
    "POSITION",
    "BP_HG19",
    "BP_HG38",
    "CHR_POSB36",
    "BASE_PAIR_LOCATION",
  ],
  A1: ["A1", "ALLELE1", "EFFECT_ALLELE", "ALTERNATE_ALLELE", "ALT"],
  A2: [
    "A2",
    "ALLELE2",
    "ALLELE0",
    "NONEFFECT_ALLELE",
    "REFERENCE_ALLELE",
    "REF",
  ],
  BETA: [
    "BETA",
    "B",
    "EFFECT",
    "LOG_ODDS",
    "ESTIMATE",
    "LOG_ODDS",
    "EFFECT_SIZE",
  ],
  P: ["P", "PVAL", "P_VALUE", "P_DGC", "P_WALD"],
}

// Preview data interface
interface FilePreview {
  filename: string
  preview_lines: string[]
}

export function ToolConfiguration({
  onNext,
  onPrevious,
  data,
  toolsData,
  mappingData,
}: ToolConfigurationProps) {
  const { jobId, stepData, setStepData } = useBenchmarkingStore()

  // Selected tools come from props or fallback to store
  const selectedTools: string[] =
    toolsData?.selectedTools || stepData["tools"]?.selectedTools || []

  const [activeTab, setActiveTab] = useState<string>(selectedTools[0] || "")
  const [configs, setConfigs] = useState<Record<string, ToolConfig>>({})

  // Column mapping state
  const [previews, setPreviews] = useState<Record<string, FilePreview>>({})
  const [loadingPreviews, setLoadingPreviews] = useState<
    Record<string, boolean>
  >({})
  const [previewErrors, setPreviewErrors] = useState<
    Record<string, string | null>
  >({})
  const [expandedSections, setExpandedSections] = useState<
    Record<string, string[]>
  >({})

  // Phenotype preview state: per tool per population
  const [phenotypeHeaders, setPhenotypeHeaders] = useState<
    Record<string, { target: string[]; source: string[] }>
  >({})
  const [loadingPhenotypes, setLoadingPhenotypes] = useState<
    Record<string, { target: boolean; source: boolean }>
  >({})
  const [phenotypeErrors, setPhenotypeErrors] = useState<
    Record<string, { target?: string | null; source?: string | null }>
  >({})

  // Initialize configurations for each tool
  useEffect(() => {
    if (selectedTools.length > 0 && !activeTab) {
      setActiveTab(selectedTools[0])
    }
  }, [selectedTools, activeTab])

  useEffect(() => {
    const initialConfigs: Record<string, ToolConfig> = {}

    selectedTools.forEach((tool: string) => {
      if (data?.[tool]) {
        initialConfigs[tool] = data[tool]
      } else if (mappingData?.configData?.[tool]) {
        const mappingConfig = mappingData.configData[tool]
        initialConfigs[tool] = {
          ...mappingConfig,
          output_dir: `results/preprocessed_data/preprocessed_${tool.toLowerCase()}_output`,
          column_mappings: {},
          phenotype_config: {
            target_population: { binary_traits: [], quantitative_traits: [] },
            source_population: { binary_traits: [], quantitative_traits: [] },
          },
          genotype_config: {
            file_type: "merged",
            population_reference: "target_population",
            file_patterns: { bed: "*.bed", bim: "*.bim", fam: "*.fam" },
          },
          options: {
            evaluation_type: "both",
            process_binary_phenotypes: true,
            process_quantitative_phenotypes: true,
            skip_missing_columns: false,
            overwrite_existing: false,
          },
        }
      } else {
        initialConfigs[tool] = {
          target_population: {
            name: mappingData?.populationNames?.targetPopulation || "",
            sumstats_path: "",
            genotype_path: "",
            phenotype_path: "",
          },
          source_population: {
            name: mappingData?.populationNames?.sourcePopulation || "",
            sumstats_path: "",
            genotype_path: "",
            phenotype_path: "",
          },
          output_dir: `results/preprocessed_data/preprocessed_${tool.toLowerCase()}_output`,
          column_mappings: {},
          phenotype_config: {
            target_population: { binary_traits: [], quantitative_traits: [] },
            source_population: { binary_traits: [], quantitative_traits: [] },
          },
          genotype_config: {
            file_type: "merged",
            population_reference: "target_population",
            file_patterns: { bed: "*.bed", bim: "*.bim", fam: "*.fam" },
          },
          options: {
            process_binary_phenotypes: true,
            process_quantitative_phenotypes: true,
            skip_missing_columns: false,
            overwrite_existing: false,
          },
        }
      }
    })

    setConfigs(initialConfigs)

    const initialExpanded: Record<string, string[]> = {}
    selectedTools.forEach((tool: string) => {
      initialExpanded[tool] = ["column-mapping"]
    })
    setExpandedSections(initialExpanded)
  }, [selectedTools, data, mappingData])

  const getConfigStorageKey = () => `tool_config_${jobId}`

  const saveConfigsToStore = (configs: Record<string, ToolConfig>) => {
    if (jobId) {
      setStepData(getConfigStorageKey(), configs)
    }
  }

  const updateConfig = (
    tool: string,
    section: keyof ToolConfig,
    updates: any
  ) => {
    const currentToolConfig = configs[tool]
    if (!currentToolConfig) return

    const baseSectionValue: any = (currentToolConfig as any)[section]
    const mergedSectionValue =
      baseSectionValue && typeof baseSectionValue === "object"
        ? { ...baseSectionValue, ...updates }
        : updates

    const newConfigs = {
      ...configs,
      [tool]: {
        ...currentToolConfig,
        [section]: mergedSectionValue as any,
      },
    }
    setConfigs(newConfigs)
    saveConfigsToStore(newConfigs)
  }

  // Column mapping functions
  const fetchFilePreview = async (tool: string, filePath: string) => {
    if (!filePath || previews[tool]) return

    setLoadingPreviews((prev) => ({ ...prev, [tool]: true }))
    setPreviewErrors((prev) => ({ ...prev, [tool]: null }))

    try {
      if (!jobId) throw new Error("No job ID found")
      const url = getBenchmarkPreviewUrl(jobId, filePath)
      const response = await axios.get(url)

      const previewData = response.data
      const preview: FilePreview = {
        filename: filePath.split("/").pop() || filePath,
        preview_lines: previewData.preview_lines || [],
      }

      setPreviews((prev) => ({ ...prev, [tool]: preview }))

      const headers = (preview.preview_lines?.[0] || "").split("\t")
      const autoMappings: ColumnMapping = {}
      const usedHeaders = new Set<string>()

      const toolRequirements = getToolRequirements(tool)
      if (toolRequirements) {
        // Single pass: only exact matches (case-insensitive)
        toolRequirements.forEach((requiredField) => {
          const aliases = COLUMN_MAPPING[requiredField] || []
          const exactMatch = headers.find((header) => {
            if (usedHeaders.has(header)) return false
            return aliases.some(
              (alias) => header.toLowerCase() === alias.toLowerCase()
            )
          })

          if (exactMatch) {
            autoMappings[requiredField] = exactMatch
            usedHeaders.add(exactMatch)
            console.log(`Auto-mapped ${requiredField} -> ${exactMatch}`)
          }
        })
      }

      if (Object.keys(autoMappings).length > 0) {
        console.log(`Auto-mapping results for ${tool}:`, autoMappings)
        console.log(`Used headers:`, Array.from(usedHeaders))
        updateConfig(tool, "column_mappings", autoMappings)
      } else {
        console.log(`No auto-mappings found for ${tool}`)
      }
    } catch (error) {
      setPreviewErrors((prev) => ({
        ...prev,
        [tool]: "Failed to load file preview",
      }))
      console.error(`Failed to fetch preview for ${tool}:`, error)
    } finally {
      setLoadingPreviews((prev) => ({ ...prev, [tool]: false }))
    }
  }

  const updateColumnMapping = (tool: string, field: string, header: string) => {
    updateConfig(tool, "column_mappings", { [field]: header })
  }

  // Helper function to get available headers for a specific field
  const getAvailableHeaders = (tool: string, field: string): string[] => {
    const headers = previews[tool]?.preview_lines?.[0]?.split("\t") || []
    const currentMappings = configs[tool]?.column_mappings || {}
    const currentFieldMapping = currentMappings[field] || ""

    // Filter out headers that are already mapped to other fields
    return headers.filter((header) => {
      // Always include the current mapping for this field
      if (header === currentFieldMapping) return true

      // Exclude headers that are mapped to other fields
      return !Object.values(currentMappings).includes(header)
    })
  }

  const toggleSection = (tool: string, section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [tool]: prev[tool]?.includes(section)
        ? prev[tool].filter((s) => s !== section)
        : [...(prev[tool] || []), section],
    }))
  }

  // Phenotype config functions
  const fetchPhenotypePreview = async (
    tool: string,
    population: "target" | "source"
  ) => {
    try {
      if (!jobId) throw new Error("No job ID found")
      const filePath =
        population === "target"
          ? configs[tool]?.target_population?.phenotype_path
          : configs[tool]?.source_population?.phenotype_path

      if (!filePath) return

      setLoadingPhenotypes((prev) => ({
        ...prev,
        [tool]: {
          target: prev[tool]?.target || false,
          source: prev[tool]?.source || false,
          [population]: true,
        } as any,
      }))

      setPhenotypeErrors((prev) => ({
        ...prev,
        [tool]: {
          ...(prev[tool] || {}),
          [population]: null,
        },
      }))

      const url = getBenchmarkPreviewUrl(jobId, filePath)
      const response = await axios.get(url)
      const previewData = response.data

      const headers = (previewData.preview_lines?.[0] || "").split("\t")

      setPhenotypeHeaders((prev) => ({
        ...prev,
        [tool]: {
          target: population === "target" ? headers : prev[tool]?.target || [],
          source: population === "source" ? headers : prev[tool]?.source || [],
        },
      }))
    } catch (error) {
      setPhenotypeErrors((prev) => ({
        ...prev,
        [tool]: {
          ...(prev[tool] || {}),
          [population]: "Failed to load phenotype preview",
        },
      }))
      console.error("Failed to fetch phenotype preview:", error)
    } finally {
      setLoadingPhenotypes((prev) => ({
        ...prev,
        [tool]: {
          target: population === "target" ? false : prev[tool]?.target || false,
          source: population === "source" ? false : prev[tool]?.source || false,
        },
      }))
    }
  }

  const toggleTrait = (
    tool: string,
    population: "target_population" | "source_population",
    traitType: "binary_traits" | "quantitative_traits",
    value: string,
    checked: boolean | string
  ) => {
    const current =
      configs[tool]?.phenotype_config?.[population]?.[traitType] || []
    const next = new Set(current)
    if (checked) next.add(value)
    else next.delete(value)

    updateConfig(tool, "phenotype_config", {
      [population]: {
        ...configs[tool]?.phenotype_config?.[population],
        [traitType]: Array.from(next),
      },
    })
  }

  const isToolComplete = (tool: string) => {
    const config = configs[tool]
    if (!config) return false
    const requirements = getToolRequirements(tool) || []
    const missing = requirements.filter((col) => !config.column_mappings[col])
    return missing.length === 0
  }

  // Validate the complete configuration before proceeding
  const validateConfiguration = (
    tool: string
  ): { isValid: boolean; errors: string[] } => {
    const config = configs[tool]
    const errors: string[] = []

    if (!config) {
      errors.push(`No configuration found for ${tool}`)
      return { isValid: false, errors }
    }

    // Check required file paths
    if (!config.target_population.sumstats_path) {
      errors.push(`${tool}: Missing target population sumstats path`)
    }
    if (!config.target_population.genotype_path) {
      errors.push(`${tool}: Missing target population genotype path`)
    }
    if (!config.target_population.phenotype_path) {
      errors.push(`${tool}: Missing target population phenotype path`)
    }
    if (!config.source_population.sumstats_path) {
      errors.push(`${tool}: Missing source population sumstats path`)
    }
    if (!config.source_population.genotype_path) {
      errors.push(`${tool}: Missing source population genotype path`)
    }
    if (!config.source_population.phenotype_path) {
      errors.push(`${tool}: Missing source population phenotype path`)
    }

    // Check column mappings
    const requirements = getToolRequirements(tool) || []
    const missingColumns = requirements.filter(
      (col) => !config.column_mappings[col]
    )
    if (missingColumns.length > 0) {
      errors.push(
        `${tool}: Missing column mappings: ${missingColumns.join(", ")}`
      )
    }

    // Check phenotype configuration
    const et = config.options.evaluation_type || "both"

    const targetBinaryCount =
      config.phenotype_config.target_population.binary_traits.length
    const targetQuantCount =
      config.phenotype_config.target_population.quantitative_traits.length
    const sourceBinaryCount =
      config.phenotype_config.source_population.binary_traits.length
    const sourceQuantCount =
      config.phenotype_config.source_population.quantitative_traits.length

    if (et === "binary") {
      if (!targetBinaryCount)
        errors.push(`${tool}: No binary traits selected for target population`)
      if (!sourceBinaryCount)
        errors.push(`${tool}: No binary traits selected for source population`)
    } else if (et === "quantitative") {
      if (!targetQuantCount)
        errors.push(
          `${tool}: No quantitative traits selected for target population`
        )
      if (!sourceQuantCount)
        errors.push(
          `${tool}: No quantitative traits selected for source population`
        )
    } else {
      // both
      if (!targetBinaryCount)
        errors.push(`${tool}: No binary traits selected for target population`)
      if (!targetQuantCount)
        errors.push(
          `${tool}: No quantitative traits selected for target population`
        )
      if (!sourceBinaryCount)
        errors.push(`${tool}: No binary traits selected for source population`)
      if (!sourceQuantCount)
        errors.push(
          `${tool}: No quantitative traits selected for source population`
        )
    }

    return { isValid: errors.length === 0, errors }
  }

  const isNextDisabled = selectedTools.some((tool) => !isToolComplete(tool))

  const handleNext = async () => {
    if (isNextDisabled) return

    // Validate all tool configurations
    const allErrors: string[] = []
    selectedTools.forEach((tool) => {
      const validation = validateConfiguration(tool)
      if (!validation.isValid) {
        allErrors.push(...validation.errors)
      }
    })

    if (allErrors.length > 0) {
      console.error("❌ Configuration validation failed:", allErrors)
      toast.error(
        `Configuration errors: ${allErrors.slice(0, 3).join(", ")}${
          allErrors.length > 3 ? "..." : ""
        }`
      )
      return
    }

    // Build sanitized pre-processing configs that strictly follow evaluation_type
    const sanitizedByTool = Object.fromEntries(
      selectedTools.map((tool) => {
        const cfg = configs[tool]
        const et = cfg.options.evaluation_type || "both"

        const sanitizePopulation = (
          pop: "target_population" | "source_population"
        ) => {
          const out: any = {}
          if (et === "binary" || et === "both") {
            out.binary_traits =
              cfg.phenotype_config[pop].binary_traits.filter(Boolean)
          }
          if (et === "quantitative" || et === "both") {
            out.quantitative_traits =
              cfg.phenotype_config[pop].quantitative_traits.filter(Boolean)
          }
          return out
        }

        const sanitizedPhenotype: any = {
          target_population: sanitizePopulation("target_population"),
          source_population: sanitizePopulation("source_population"),
        }

        const sanitizedOptions = {
          ...cfg.options,
          evaluation_type: et,
          process_binary_phenotypes: et === "binary" || et === "both",
          process_quantitative_phenotypes:
            et === "quantitative" || et === "both",
        }

        const sanitized = {
          ...cfg,
          phenotype_config: sanitizedPhenotype,
          options: sanitizedOptions,
        }

        return [tool, sanitized]
      })
    )

    // Log the complete configuration
    console.log("🚀 Submitting tool configuration:", {
      jobId,
      selectedTools,
      configs: sanitizedByTool,
      timestamp: new Date().toISOString(),
    })

    // Log individual tool configs
    selectedTools.forEach((tool) => {
      console.log(`📋 ${tool} Configuration:`, sanitizedByTool[tool])
    })

    // Create the request body (omit unselected trait arrays per evaluation_type)
    const requestBody = {
      config: {
        tools_to_run: selectedTools,
        ...Object.fromEntries(
          selectedTools.map((tool) => [
            tool,
            {
              pre_processing: sanitizedByTool[tool],
            },
          ])
        ),
      },
    }

    // Log the final API request structure
    console.log("📤 Final API request structure:", {
      url: jobId ? getBenchmarkConfigUrl(jobId) : "No job ID",
      method: "POST",
      body: requestBody,
    })

    try {
      // Submit configuration to backend
      if (!jobId) {
        throw new Error("No job ID found")
      }

      console.log("📤 Sending configuration to backend:", {
        url: getBenchmarkConfigUrl(jobId),
        body: requestBody,
      })

      const response = await axios.post(
        getBenchmarkConfigUrl(jobId),
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      console.log("✅ Configuration submitted successfully:", response.data)
      toast.success("Configuration submitted! Starting PRS benchmarking...")

      // Navigate to results page
      onNext({
        configs,
        submitted: true,
        jobId,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("❌ Failed to submit configuration:", error)
      toast.error("Failed to submit configuration. Please try again.")
    }
  }

  if (selectedTools.length === 0) {
    return (
      <div className="space-y-6">
        <h3 className="mb-2 text-xl font-semibold">Tool Configuration</h3>
        <p className="text-muted-foreground">
          No tools selected. Please go back and select tools first.
        </p>
        {onPrevious && (
          <Button variant="outline" onClick={onPrevious}>
            Back
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xl font-semibold">Tool Configuration</h3>
        <p className="text-muted-foreground">
          Configure preprocessing settings and column mappings for each selected
          tool
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full flex-wrap gap-2">
          {selectedTools.map((tool: string) => (
            <TabsTrigger key={tool} value={tool} className="text-sm">
              {tool}
            </TabsTrigger>
          ))}
        </TabsList>

        {selectedTools.map((tool: string) => (
          <TabsContent key={tool} value={tool} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {tool} Configuration
                  <Badge variant="outline">Step 5</Badge>
                </CardTitle>
                <CardDescription>
                  Configure column mappings, phenotype settings, and processing
                  options for {tool}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Column Mapping Section */}
                  <Collapsible
                    open={expandedSections[tool]?.includes("column-mapping")}
                    onOpenChange={() => toggleSection(tool, "column-mapping")}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                        <div>
                          <h4 className="font-medium">Column Mapping</h4>
                          <p className="text-sm text-muted-foreground">
                            Map your file columns to expected PRS fields
                          </p>
                        </div>
                        {expandedSections[tool]?.includes("column-mapping") ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Preview your sumstats file to see available
                              columns
                            </p>
                            {previews[tool] && (
                              <p className="mt-1 text-xs text-green-600">
                                ✓ Headers loaded -{" "}
                                {previews[tool].preview_lines?.[0]?.split("\t")
                                  .length || 0}{" "}
                                columns available
                              </p>
                            )}
                          </div>
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const sumstatsPath =
                                  configs[tool]?.target_population
                                    ?.sumstats_path
                                if (sumstatsPath) {
                                  fetchFilePreview(tool, sumstatsPath)
                                }
                              }}
                              disabled={
                                !configs[tool]?.target_population
                                  ?.sumstats_path || loadingPreviews[tool]
                              }
                            >
                              {loadingPreviews[tool] ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="mr-2 h-4 w-4" />
                              )}
                              {previews[tool]
                                ? "Reload Preview"
                                : "Preview File"}
                            </Button>
                            {configs[tool]?.target_population
                              ?.sumstats_path && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                File:{" "}
                                {configs[tool].target_population.sumstats_path}
                              </div>
                            )}
                          </div>
                        </div>
                        {previewErrors[tool] && (
                          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-red-600">
                                {previewErrors[tool]}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const sumstatsPath =
                                    configs[tool]?.target_population
                                      ?.sumstats_path
                                  if (sumstatsPath) {
                                    setPreviewErrors((prev) => ({
                                      ...prev,
                                      [tool]: null,
                                    }))
                                    fetchFilePreview(tool, sumstatsPath)
                                  }
                                }}
                              >
                                Retry
                              </Button>
                            </div>
                          </div>
                        )}
                        {previews[tool] && (
                          <div className="rounded-lg border">
                            <div className="border-b bg-muted/50 p-3">
                              <h5 className="text-sm font-medium">
                                File Preview: {previews[tool].filename}
                              </h5>
                              <p className="text-xs text-muted-foreground">
                                First 5 rows of your sumstats file
                              </p>
                            </div>
                            <div className="max-h-60 overflow-auto">
                              <div className="border-b">
                                <div className="grid grid-cols-12 gap-2 bg-muted/30 p-2 text-xs font-medium">
                                  {previews[tool].preview_lines[0]
                                    .split("\t")
                                    .map((header, idx) => (
                                      <div key={idx} className="truncate">
                                        {header}
                                      </div>
                                    ))}
                                </div>
                              </div>
                              <div className="divide-y">
                                {previews[tool].preview_lines
                                  .slice(1)
                                  .map((line, rowIdx) => (
                                    <div
                                      key={rowIdx}
                                      className="grid grid-cols-12 gap-2 p-2 text-xs"
                                    >
                                      {line.split("\t").map((cell, cellIdx) => (
                                        <div key={cellIdx} className="truncate">
                                          {cell}
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {previews[tool] && (
                          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                            <p className="text-sm text-green-800">
                              ✓ File preview loaded! The dropdowns below now
                              show the actual column headers from your file for
                              accurate mapping.
                            </p>
                            <div className="mt-2 text-xs text-green-700">
                              <span className="font-medium">
                                Mapping Status:
                              </span>{" "}
                              {
                                Object.keys(
                                  configs[tool]?.column_mappings || {}
                                ).length
                              }{" "}
                              of {getToolRequirements(tool)?.length} fields
                              mapped
                              {Object.keys(configs[tool]?.column_mappings || {})
                                .length > 0 && (
                                <span className="ml-2">
                                  •{" "}
                                  {getToolRequirements(tool)?.length -
                                    Object.keys(
                                      configs[tool]?.column_mappings || {}
                                    ).length}{" "}
                                  remaining
                                </span>
                              )}
                              {Object.keys(configs[tool]?.column_mappings || {})
                                .length > 0 && (
                                <div className="mt-1">
                                  <span className="font-medium">Mapped:</span>{" "}
                                  {Object.entries(
                                    configs[tool]?.column_mappings || {}
                                  ).map(([field, header], idx) => (
                                    <span
                                      key={field}
                                      className="mb-1 mr-1 inline-block rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800"
                                    >
                                      {field} → {header}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-medium">
                              Required Field Mappings
                            </h5>
                            {previews[tool] && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {
                                    Object.keys(
                                      configs[tool]?.column_mappings || {}
                                    ).length
                                  }{" "}
                                  of {getToolRequirements(tool)?.length} mapped
                                </span>
                                {isToolComplete(tool) && (
                                  <Badge variant="default" className="text-xs">
                                    ✓ Complete
                                  </Badge>
                                )}
                              </div>
                            )}
                            {!previews[tool] && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-amber-600">
                                  Using common field aliases
                                </span>
                              </div>
                            )}
                          </div>

                          {!previews[tool] && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                              <p className="text-sm text-amber-800">
                                💡 You can now map columns using common field
                                names below. Click &ldquo;Preview File&rdquo;
                                above to see the actual column headers from your
                                file for more accurate mapping.
                              </p>
                            </div>
                          )}

                          {getToolRequirements(tool)?.map((field) => {
                            const currentMapping =
                              configs[tool]?.column_mappings?.[field] || ""
                            const isMapped = !!currentMapping

                            // Get available headers (excluding already-used ones)
                            const availableOptions = getAvailableHeaders(
                              tool,
                              field
                            )

                            return (
                              <div
                                key={field}
                                className={`grid grid-cols-2 items-center gap-4 rounded-lg border p-3 ${
                                  isMapped
                                    ? "border-green-200 bg-green-50"
                                    : "border-gray-200"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Label className="text-sm font-medium">
                                      {field}
                                    </Label>
                                    {isMapped && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        ✓ Mapped
                                      </Badge>
                                    )}
                                    {!previews[tool] &&
                                      COLUMN_MAPPING[field] && (
                                        <div className="group relative">
                                          <Info className="h-4 w-4 cursor-help text-blue-500" />
                                          <div className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 min-w-[280px] max-w-[400px] transform rounded-lg bg-gray-900 px-4 py-3 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                            <div className="mb-2 font-medium">
                                              Common column names:
                                            </div>
                                            <div className="grid grid-cols-1 gap-y-1.5">
                                              {COLUMN_MAPPING[field].map(
                                                (alias, idx) => (
                                                  <span
                                                    key={idx}
                                                    className="break-words text-blue-200"
                                                  >
                                                    {alias}
                                                  </span>
                                                )
                                              )}
                                            </div>
                                            <div className="absolute left-4 top-full h-0 w-0 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {field === "SNP" && "SNP identifier"}
                                    {field === "CHR" && "Chromosome"}
                                    {field === "BP" && "Base pair"}
                                    {field === "A1" && "Effect allele"}
                                    {field === "A2" && "Other allele"}
                                    {field === "BETA" && "Effect size"}
                                    {field === "P" && "P-value"}
                                  </p>
                                </div>
                                <Select
                                  value={currentMapping}
                                  onValueChange={(value) =>
                                    updateColumnMapping(tool, field, value)
                                  }
                                >
                                  <SelectTrigger
                                    className={
                                      isMapped ? "border-green-300" : ""
                                    }
                                  >
                                    <SelectValue placeholder="Select column" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableOptions.length > 0 ? (
                                      availableOptions.map((option, idx) => (
                                        <SelectItem key={idx} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="no-options" disabled>
                                        No available columns (all headers are
                                        mapped)
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                                {availableOptions.length === 0 && !isMapped && (
                                  <div className="mt-2 text-xs text-amber-600">
                                    💡 All available headers are already mapped.
                                    Unmap another field first to make headers
                                    available.
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Phenotype Configuration Section */}
                  <Collapsible
                    open={expandedSections[tool]?.includes("phenotype-config")}
                    onOpenChange={() => toggleSection(tool, "phenotype-config")}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                        <div>
                          <h4 className="font-medium">
                            Phenotype Configuration
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Configure phenotype settings for target and source
                            populations
                          </p>
                        </div>
                        {expandedSections[tool]?.includes(
                          "phenotype-config"
                        ) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="space-y-6">
                        <div className="flex flex-wrap gap-3">
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                fetchPhenotypePreview(tool, "target")
                              }
                              disabled={
                                loadingPhenotypes[tool]?.target ||
                                !configs[tool]?.target_population
                                  ?.phenotype_path
                              }
                            >
                              {loadingPhenotypes[tool]?.target ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="mr-2 h-4 w-4" />
                              )}
                              Preview Target Phenotype
                            </Button>
                            {configs[tool]?.target_population
                              ?.phenotype_path && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                File:{" "}
                                {configs[tool].target_population.phenotype_path}
                              </div>
                            )}
                          </div>
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                fetchPhenotypePreview(tool, "source")
                              }
                              disabled={
                                loadingPhenotypes[tool]?.source ||
                                !configs[tool]?.source_population
                                  ?.phenotype_path
                              }
                            >
                              {loadingPhenotypes[tool]?.source ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="mr-2 h-4 w-4" />
                              )}
                              Preview Source Phenotype
                            </Button>
                            {configs[tool]?.source_population
                              ?.phenotype_path && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                File:{" "}
                                {configs[tool].source_population.phenotype_path}
                              </div>
                            )}
                          </div>
                        </div>
                        {(phenotypeErrors[tool]?.target ||
                          phenotypeErrors[tool]?.source) && (
                          <div className="text-sm text-red-600">
                            {phenotypeErrors[tool]?.target && (
                              <p>{phenotypeErrors[tool]?.target}</p>
                            )}
                            {phenotypeErrors[tool]?.source && (
                              <p>{phenotypeErrors[tool]?.source}</p>
                            )}
                          </div>
                        )}

                        {/* Evaluation Type Selection */}
                        <div className="rounded-lg border p-3">
                          <Label className="text-sm">Evaluation Type</Label>
                          <div className="mt-2 flex flex-wrap gap-6">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name={`evaluation_type_${tool}`}
                                value="both"
                                className="h-4 w-4"
                                checked={
                                  (configs[tool]?.options?.evaluation_type ||
                                    "both") === "both"
                                }
                                onChange={() =>
                                  updateConfig(tool, "options", {
                                    evaluation_type: "both",
                                    process_binary_phenotypes: true,
                                    process_quantitative_phenotypes: true,
                                  })
                                }
                              />
                              <span>Both</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name={`evaluation_type_${tool}`}
                                value="binary"
                                className="h-4 w-4"
                                checked={
                                  (configs[tool]?.options?.evaluation_type ||
                                    "both") === "binary"
                                }
                                onChange={() =>
                                  updateConfig(tool, "options", {
                                    evaluation_type: "binary",
                                    process_binary_phenotypes: true,
                                    process_quantitative_phenotypes: false,
                                  })
                                }
                              />
                              <span>Binary</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name={`evaluation_type_${tool}`}
                                value="quantitative"
                                className="h-4 w-4"
                                checked={
                                  (configs[tool]?.options?.evaluation_type ||
                                    "both") === "quantitative"
                                }
                                onChange={() =>
                                  updateConfig(tool, "options", {
                                    evaluation_type: "quantitative",
                                    process_binary_phenotypes: false,
                                    process_quantitative_phenotypes: true,
                                  })
                                }
                              />
                              <span>Quantitative</span>
                            </label>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Choose whether to configure binary traits,
                            quantitative traits, or both.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <div className="space-y-3">
                            <h5 className="text-sm font-medium">
                              Target Population
                            </h5>
                            <div
                              className={`rounded-lg border p-3 ${(configs[tool]?.options?.evaluation_type || "both") === "quantitative" ? "hidden" : ""}`}
                            >
                              <Label className="text-sm">Binary Traits</Label>
                              <div className="mt-2 grid max-h-40 grid-cols-2 gap-2 overflow-auto pr-1">
                                {(phenotypeHeaders[tool]?.target || []).map(
                                  (h, idx) => (
                                    <label
                                      key={idx}
                                      className="flex items-center gap-2 text-xs"
                                    >
                                      <Checkbox
                                        checked={
                                          configs[
                                            tool
                                          ]?.phenotype_config?.target_population?.binary_traits?.includes(
                                            h
                                          ) || false
                                        }
                                        onCheckedChange={(checked) =>
                                          toggleTrait(
                                            tool,
                                            "target_population",
                                            "binary_traits",
                                            h,
                                            checked
                                          )
                                        }
                                        id={`t_bin_${tool}_${idx}`}
                                      />
                                      <span>{h}</span>
                                    </label>
                                  )
                                )}
                              </div>
                            </div>
                            <div
                              className={`rounded-lg border p-3 ${(configs[tool]?.options?.evaluation_type || "both") === "binary" ? "hidden" : ""}`}
                            >
                              <Label className="text-sm">
                                Quantitative Traits
                              </Label>
                              <div className="mt-2 grid max-h-40 grid-cols-2 gap-2 overflow-auto pr-1">
                                {(phenotypeHeaders[tool]?.target || []).map(
                                  (h, idx) => (
                                    <label
                                      key={idx}
                                      className="flex items-center gap-2 text-xs"
                                    >
                                      <Checkbox
                                        checked={
                                          configs[
                                            tool
                                          ]?.phenotype_config?.target_population?.quantitative_traits?.includes(
                                            h
                                          ) || false
                                        }
                                        onCheckedChange={(checked) =>
                                          toggleTrait(
                                            tool,
                                            "target_population",
                                            "quantitative_traits",
                                            h,
                                            checked
                                          )
                                        }
                                        id={`t_qt_${tool}_${idx}`}
                                      />
                                      <span>{h}</span>
                                    </label>
                                  )
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h5 className="text-sm font-medium">
                              Source Population
                            </h5>
                            <div
                              className={`rounded-lg border p-3 ${(configs[tool]?.options?.evaluation_type || "both") === "quantitative" ? "hidden" : ""}`}
                            >
                              <Label className="text-sm">Binary Traits</Label>
                              <div className="mt-2 grid max-h-40 grid-cols-2 gap-2 overflow-auto pr-1">
                                {(phenotypeHeaders[tool]?.source || []).map(
                                  (h, idx) => (
                                    <label
                                      key={idx}
                                      className="flex items-center gap-2 text-xs"
                                    >
                                      <Checkbox
                                        checked={
                                          configs[
                                            tool
                                          ]?.phenotype_config?.source_population?.binary_traits?.includes(
                                            h
                                          ) || false
                                        }
                                        onCheckedChange={(checked) =>
                                          toggleTrait(
                                            tool,
                                            "source_population",
                                            "binary_traits",
                                            h,
                                            checked
                                          )
                                        }
                                        id={`s_bin_${tool}_${idx}`}
                                      />
                                      <span>{h}</span>
                                    </label>
                                  )
                                )}
                              </div>
                            </div>
                            <div
                              className={`rounded-lg border p-3 ${(configs[tool]?.options?.evaluation_type || "both") === "binary" ? "hidden" : ""}`}
                            >
                              <Label className="text-sm">
                                Quantitative Traits
                              </Label>
                              <div className="mt-2 grid max-h-40 grid-cols-2 gap-2 overflow-auto pr-1">
                                {(phenotypeHeaders[tool]?.source || []).map(
                                  (h, idx) => (
                                    <label
                                      key={idx}
                                      className="flex items-center gap-2 text-xs"
                                    >
                                      <Checkbox
                                        checked={
                                          configs[
                                            tool
                                          ]?.phenotype_config?.source_population?.quantitative_traits?.includes(
                                            h
                                          ) || false
                                        }
                                        onCheckedChange={(checked) =>
                                          toggleTrait(
                                            tool,
                                            "source_population",
                                            "quantitative_traits",
                                            h,
                                            checked
                                          )
                                        }
                                        id={`s_qt_${tool}_${idx}`}
                                      />
                                      <span>{h}</span>
                                    </label>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Genotype Configuration Section */}
                  <Collapsible
                    open={expandedSections[tool]?.includes("genotype-config")}
                    onOpenChange={() => toggleSection(tool, "genotype-config")}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                        <div>
                          <h4 className="font-medium">
                            Genotype Configuration
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Configure genotype file settings and patterns
                          </p>
                        </div>
                        {expandedSections[tool]?.includes("genotype-config") ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <div className="space-y-3">
                            <Label className="text-sm">
                              Genotype File Type
                            </Label>
                            <Select
                              value={configs[tool]?.genotype_config?.file_type}
                              onValueChange={(value) =>
                                updateConfig(tool, "genotype_config", {
                                  file_type: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select file type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="merged">
                                  Merged (bed, bim, fam)
                                </SelectItem>
                                <SelectItem value="split_by_chromosome">
                                  Split by Chromosome (bed, bim, fam)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-sm">
                              Population Reference
                            </Label>
                            <Select
                              value={
                                configs[tool]?.genotype_config
                                  ?.population_reference
                              }
                              onValueChange={(value) =>
                                updateConfig(tool, "genotype_config", {
                                  population_reference: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select population" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="target_population">
                                  Target Population
                                </SelectItem>
                                <SelectItem value="source_population">
                                  Source Population
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <div className="space-y-3">
                            <Label className="text-sm">
                              File Patterns (bed)
                            </Label>
                            <Input
                              value={
                                configs[tool]?.genotype_config?.file_patterns
                                  ?.bed
                              }
                              onChange={(e) =>
                                updateConfig(tool, "genotype_config", {
                                  file_patterns: {
                                    ...configs[tool]?.genotype_config
                                      ?.file_patterns,
                                    bed: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-sm">
                              File Patterns (bim)
                            </Label>
                            <Input
                              value={
                                configs[tool]?.genotype_config?.file_patterns
                                  ?.bim
                              }
                              onChange={(e) =>
                                updateConfig(tool, "genotype_config", {
                                  file_patterns: {
                                    ...configs[tool]?.genotype_config
                                      ?.file_patterns,
                                    bim: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <div className="space-y-3">
                            <Label className="text-sm">
                              File Patterns (fam)
                            </Label>
                            <Input
                              value={
                                configs[tool]?.genotype_config?.file_patterns
                                  ?.fam
                              }
                              onChange={(e) =>
                                updateConfig(tool, "genotype_config", {
                                  file_patterns: {
                                    ...configs[tool]?.genotype_config
                                      ?.file_patterns,
                                    fam: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Processing Options Section */}
                  <Collapsible
                    open={expandedSections[tool]?.includes(
                      "processing-options"
                    )}
                    onOpenChange={() =>
                      toggleSection(tool, "processing-options")
                    }
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                        <div>
                          <h4 className="font-medium">Processing Options</h4>
                          <p className="text-sm text-muted-foreground">
                            Configure processing behavior and options
                          </p>
                        </div>
                        {expandedSections[tool]?.includes(
                          "processing-options"
                        ) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {(
                          TOOL_PROCESSING_OPTIONS[tool] ||
                          BASE_PROCESSING_OPTIONS
                        ).map(([key, label]) => (
                          <label
                            key={key}
                            className="flex items-center gap-3 rounded-md border p-3"
                          >
                            <Checkbox
                              checked={!!configs[tool]?.options?.[key]}
                              onCheckedChange={(checked) =>
                                updateConfig(tool, "options", {
                                  [key]: Boolean(checked),
                                })
                              }
                              id={`${tool}-${key}`}
                            />
                            <span className="text-sm">{label}</span>
                          </label>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-between border-t pt-6">
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
  )
}
