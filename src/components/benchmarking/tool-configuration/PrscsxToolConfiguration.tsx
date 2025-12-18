"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import axios from "axios"
import { toast } from "react-hot-toast"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { ChromosomeMultiSelect } from "@/components/ui/chromosome-multi-select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getBenchmarkPreviewUrl } from "@/lib/config"
import { ChevronDown, ChevronRight, Eye, Loader2, Info } from "lucide-react"
import { COMMON_COLUMN_ALIASES, aliasMatches } from "./column-aliases"

import type {
  PrscsxPreProcessingConfig,
  PrscsxColumnKey,
  ProcessingOptions,
  PrscsxPopulationConfig,
  EvaluationType,
  PrscsxProcessingState,
} from "./types"

const REQUIRED_COLUMNS: PrscsxColumnKey[] = ["SNP", "A1", "A2", "BETA", "P"]

const COLUMN_ALIASES: Record<PrscsxColumnKey, string[]> = {
  SNP: COMMON_COLUMN_ALIASES.SNP,
  A1: COMMON_COLUMN_ALIASES.A1,
  A2: COMMON_COLUMN_ALIASES.A2,
  BETA: COMMON_COLUMN_ALIASES.BETA,
  P: COMMON_COLUMN_ALIASES.P,
}

interface FilePreview {
  filename: string
  preview_lines: string[]
}

interface PrscsxToolConfigurationProps {
  toolId: string
  config: PrscsxPreProcessingConfig
  jobId: string | null
  onConfigChange: (nextConfig: PrscsxPreProcessingConfig) => void
  stepBadge?: React.ReactNode
  evaluationType: EvaluationType
  processingConfig: PrscsxProcessingState
  onProcessingChange: (
    updater: (state: PrscsxProcessingState) => PrscsxProcessingState
  ) => void
}

export function PrscsxToolConfiguration({
  toolId,
  config,
  jobId,
  onConfigChange,
  stepBadge,
  evaluationType,
  processingConfig,
  onProcessingChange,
}: PrscsxToolConfigurationProps) {
  const populations = useMemo(
    () => (Array.isArray(config.populations) ? config.populations : []),
    [config.populations]
  )
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "column-mapping",
  ])
  const [activePopulation, setActivePopulation] = useState<string>(
    populations[0]?.name || ""
  )
  const [previews, setPreviews] = useState<Record<string, FilePreview | null>>(
    {}
  )
  const [isLoadingPreview, setIsLoadingPreview] = useState<
    Record<string, boolean>
  >({})
  const [previewErrors, setPreviewErrors] = useState<
    Record<string, string | null>
  >({})
  const [phenotypeHeaders, setPhenotypeHeaders] = useState<
    Record<string, string[]>
  >({})
  const [loadingPhenotypes, setLoadingPhenotypes] = useState<
    Record<string, boolean>
  >({})
  const [phenotypeErrors, setPhenotypeErrors] = useState<
    Record<string, string | null>
  >({})

  const allowBinaryTraits =
    evaluationType === "binary" || evaluationType === "both"
  const allowQuantitativeTraits =
    evaluationType === "quantitative" || evaluationType === "both"
  const isMultiChromGenotype =
    config.genotype_config.file_type === "multi_chromosome"

  type ProcessingModeKey = keyof PrscsxProcessingState
  const initialProcessingTab: ProcessingModeKey = allowBinaryTraits
    ? "binary"
    : "quantitative"
  const [processingActiveTab, setProcessingActiveTab] =
    useState<ProcessingModeKey>(initialProcessingTab)
  useEffect(() => {
    const tabs: ProcessingModeKey[] = []
    if (allowBinaryTraits) tabs.push("binary")
    if (allowQuantitativeTraits) tabs.push("quantitative")
    if (!tabs.includes(processingActiveTab)) {
      setProcessingActiveTab(tabs[0] ?? "binary")
    }
  }, [allowBinaryTraits, allowQuantitativeTraits, processingActiveTab])

  const eligiblePopulations = useMemo(
    () =>
      populations.filter((population) =>
        Boolean(
          population.name &&
            population.name.trim() !== "" &&
            population.sumstats_path &&
            population.genotype_path &&
            population.phenotype_path
        )
      ),
    [populations]
  )

  const updateProcessingMode = useCallback(
    (
      mode: ProcessingModeKey,
      updater: (
        state: PrscsxProcessingState[ProcessingModeKey]
      ) => PrscsxProcessingState[ProcessingModeKey]
    ) => {
      onProcessingChange((current) => ({
        ...current,
        [mode]: updater(current[mode]),
      }))
    },
    [onProcessingChange]
  )

  useEffect(() => {
    const modeKeys: ProcessingModeKey[] = ["binary", "quantitative"]
    modeKeys.forEach((mode) => {
      const state = processingConfig[mode]
      const normalizedEntries: Record<string, string> = {}
      let requiresUpdate = false

      populations.forEach((population) => {
        const existing = state.nGwas[population.name]
        normalizedEntries[population.name] = existing ?? ""
        if (!(population.name in state.nGwas)) {
          requiresUpdate = true
        }
      })

      const extraKeys = Object.keys(state.nGwas).filter(
        (key) => !populations.some((population) => population.name === key)
      )
      if (extraKeys.length > 0) {
        requiresUpdate = true
      }

      if (requiresUpdate) {
        updateProcessingMode(mode, (prev) => ({
          ...prev,
          nGwas: normalizedEntries,
        }))
      }
    })
  }, [populations, processingConfig, updateProcessingMode])

  useEffect(() => {
    const modeKeys: ProcessingModeKey[] = ["binary", "quantitative"]
    modeKeys.forEach((mode) => {
      const state = processingConfig[mode]
      const runPopulation = state.runPopulation
      if (!runPopulation) {
        if (state.phenoColumn) {
          updateProcessingMode(mode, (prev) => ({
            ...prev,
            phenoColumn: "",
          }))
        }
        return
      }

      const traitKey =
        mode === "binary" ? "binary_traits" : "quantitative_traits"
      const traits =
        config.phenotype_config.by_population[runPopulation]?.[traitKey] || []

      if (traits.length === 0 && state.phenoColumn) {
        updateProcessingMode(mode, (prev) => ({
          ...prev,
          phenoColumn: "",
        }))
        return
      }

      if (traits.length > 0 && !traits.includes(state.phenoColumn)) {
        updateProcessingMode(mode, (prev) => ({
          ...prev,
          phenoColumn: traits[0] || "",
        }))
      }
    })
  }, [
    processingConfig,
    config.phenotype_config.by_population,
    updateProcessingMode,
  ])

  // Keep processing chrom in sync with genotype_config.chrom (multi-chromosome)
  useEffect(() => {
    const isMultiChrom = config?.genotype_config?.file_type === "multi_chromosome"
    const chromStr = isMultiChrom && Array.isArray(config?.genotype_config?.chrom)
      ? ((config.genotype_config.chrom as number[]) || []).join(",")
      : ""

    const needsUpdate =
      processingConfig.binary.chrom !== chromStr ||
      processingConfig.quantitative.chrom !== chromStr

    if (needsUpdate) {
      onProcessingChange((current) => ({
        ...current,
        binary: { ...current.binary, chrom: chromStr },
        quantitative: { ...current.quantitative, chrom: chromStr },
      }))
    }
  }, [
    config?.genotype_config?.chrom,
    config?.genotype_config?.file_type,
    onProcessingChange,
    processingConfig.binary.chrom,
    processingConfig.quantitative.chrom,
  ])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((item) => item !== section)
        : [...prev, section]
    )
  }

  const updateConfig = (
    updater: (current: PrscsxPreProcessingConfig) => PrscsxPreProcessingConfig
  ) => {
    onConfigChange(updater(config))
  }

  const ensurePhenotypeEntry = (populationName: string) => {
    if (config.phenotype_config.by_population[populationName]) return
    updateConfig((current) => ({
      ...current,
      phenotype_config: {
        ...current.phenotype_config,
        by_population: {
          ...current.phenotype_config.by_population,
          [populationName]: {
            binary_traits: [],
            quantitative_traits: [],
          },
        },
      },
    }))
  }

  const updateOptions = (updates: Partial<ProcessingOptions>) => {
    updateConfig((current) => ({
      ...current,
      options: {
        ...current.options,
        ...updates,
      },
    }))
  }

  const updatePopulationPath = (
    populationName: string,
    field: "sumstats_path" | "phenotype_path" | "genotype_path" | "covariate_path",
    value: string
  ) => {
    updateConfig((current) => ({
      ...current,
      populations: current.populations.map((pop) =>
        pop.name === populationName ? { ...pop, [field]: value } : pop
      ),
    }))
  }

  const setColumnMapping = (
    populationName: string,
    field: PrscsxColumnKey,
    header: string
  ) => {
    updateConfig((current) => {
      const existing =
        current.column_mappings.by_population[populationName] || {}
      return {
        ...current,
        column_mappings: {
          ...current.column_mappings,
          by_population: {
            ...current.column_mappings.by_population,
            [populationName]: {
              ...existing,
              [field]: header,
            },
          },
        },
      }
    })
  }

  const removeColumnMapping = (
    populationName: string,
    field: PrscsxColumnKey
  ) => {
    updateConfig((current) => {
      const { [field]: _removed, ...rest } =
        current.column_mappings.by_population[populationName] || {}
      return {
        ...current,
        column_mappings: {
          ...current.column_mappings,
          by_population: {
            ...current.column_mappings.by_population,
            [populationName]: rest,
          },
        },
      }
    })
  }

  const fetchFilePreview = async (population: PrscsxPopulationConfig) => {
    if (!jobId || !population.sumstats_path) return
    const key = population.name

    if (isLoadingPreview[key]) return

    setIsLoadingPreview((prev) => ({ ...prev, [key]: true }))
    setPreviewErrors((prev) => ({ ...prev, [key]: null }))

    try {
      const sumstatsType = config.sumstats_file_type || "merged"
      const url = getBenchmarkPreviewUrl(jobId, population.sumstats_path, {
        randomPick: sumstatsType === "multi_chromosome",
      })
      console.log("[PRScsx Preview] GET:", url)
      const response = await axios.get(url)
      console.log("[PRScsx Preview] Response:", response?.data)
      const preview: FilePreview = {
        filename:
          population.sumstats_path.split("/").pop() || population.sumstats_path,
        preview_lines: response.data.preview_lines || [],
      }
      setPreviews((prev) => ({ ...prev, [key]: preview }))

      const first = (preview.preview_lines?.[0] || "").trim()
      const headers =
        first.length > 0
          ? first.includes("\t")
            ? first.split("\t").map((h) => h.trim())
            : first.split(/\s+/).map((h) => h.trim())
          : []
      const autoMappings: Partial<Record<PrscsxColumnKey, string>> = {}
      const used = new Set<string>()

      REQUIRED_COLUMNS.forEach((field) => {
        const match = headers.find((header) => {
          if (used.has(header)) return false
          return aliasMatches(field, header)
        })
        if (match) {
          autoMappings[field] = match
          used.add(match)
        }
      })

      if (Object.keys(autoMappings).length > 0) {
        updateConfig((current) => {
          const currentMappings =
            current.column_mappings.by_population[population.name] || {}
          return {
            ...current,
            column_mappings: {
              ...current.column_mappings,
              by_population: {
                ...current.column_mappings.by_population,
                [population.name]: {
                  ...currentMappings,
                  ...autoMappings,
                },
              },
            },
          }
        })
        toast.success(`Auto-mapped PRScsx columns for ${population.name}`)
      }
    } catch (error) {
      console.error("Failed to fetch PRScsx preview", error)
      setPreviewErrors((prev) => ({
        ...prev,
        [key]: "Failed to load file preview",
      }))
    } finally {
      setIsLoadingPreview((prev) => ({ ...prev, [key]: false }))
    }
  }

  // Clear previews when any population sumstats path changes to avoid stale headers
  useEffect(() => {
    // When any sumstats path changes, clear all previews to avoid stale data
    setPreviews({})
    setPreviewErrors({})
  }, [config.populations?.map((p) => `${p.name}:${p.sumstats_path}`).join("|")])

  // Clear phenotype headers when any population phenotype path changes
  useEffect(() => {
    // When any phenotype path changes, clear all phenotype headers to avoid staleness
    setPhenotypeHeaders({})
    setPhenotypeErrors({})
  }, [config.populations?.map((p) => `${p.name}:${p.phenotype_path}`).join("|")])

  const fetchPhenotypePreview = async (population: PrscsxPopulationConfig) => {
    if (!jobId || !population.phenotype_path) return
    const key = population.name

    setLoadingPhenotypes((prev) => ({ ...prev, [key]: true }))
    setPhenotypeErrors((prev) => ({ ...prev, [key]: null }))

    try {
      const url = getBenchmarkPreviewUrl(jobId, population.phenotype_path)
      const response = await axios.get(url)
      const first = (response.data.preview_lines?.[0] || "").trim()
      const headers =
        first.length > 0
          ? first.includes("\t")
            ? first.split("\t").map((h) => h.trim())
            : first.split(/\s+/).map((h) => h.trim())
          : []
      setPhenotypeHeaders((prev) => ({ ...prev, [key]: headers }))
      ensurePhenotypeEntry(population.name)
    } catch (error) {
      console.error("Failed to fetch phenotype preview", error)
      setPhenotypeErrors((prev) => ({
        ...prev,
        [key]: "Failed to load phenotype preview",
      }))
    } finally {
      setLoadingPhenotypes((prev) => ({ ...prev, [key]: false }))
    }
  }

  const toggleTrait = (
    populationName: string,
    traitType: "binary_traits" | "quantitative_traits",
    value: string,
    checked: boolean | string
  ) => {
    if (traitType === "binary_traits" && !allowBinaryTraits) return
    if (traitType === "quantitative_traits" && !allowQuantitativeTraits) return

    ensurePhenotypeEntry(populationName)

    updateConfig((current) => {
      const existing = current.phenotype_config.by_population[
        populationName
      ] ?? {
        binary_traits: [],
        quantitative_traits: [],
      }

      const currentTraits = existing[traitType]
      const next = new Set(currentTraits)
      const isChecked = Boolean(checked)
      if (isChecked) next.add(value)
      else next.delete(value)

      return {
        ...current,
        phenotype_config: {
          ...current.phenotype_config,
          by_population: {
            ...current.phenotype_config.by_population,
            [populationName]: {
              ...existing,
              [traitType]: Array.from(next),
            },
          },
        },
      }
    })
  }

  useEffect(() => {
    if (populations.length === 0) {
      if (activePopulation !== "") {
        setActivePopulation("")
      }
      return
    }

    if (!populations.find((pop) => pop.name === activePopulation)) {
      setActivePopulation(populations[0]?.name || "")
    }
  }, [populations, activePopulation])

  const activePopulationConfig = useMemo(
    () => populations.find((pop) => pop.name === activePopulation),
    [populations, activePopulation]
  )

  const availableHeaders = useMemo(() => {
    if (!activePopulationConfig) return []
    const preview = previews[activePopulationConfig.name]
    if (!preview) return []
    const first = (preview.preview_lines?.[0] || "").trim()
    return first.length > 0
      ? (first.includes("\t") ? first.split("\t") : first.split(/\s+/))
          .map((h) => h.trim())
          .filter((h) => h.length > 0)
      : []
  }, [activePopulationConfig, previews])

  const getAvailableOptions = (field: PrscsxColumnKey) => {
    if (!activePopulationConfig) return []
    const headers = availableHeaders
    const mappings =
      config.column_mappings.by_population[activePopulationConfig.name] || {}
    const mappedValues = Object.entries(mappings)
      .filter(([key]) => key !== field)
      .map(([, value]) => value)
    const aliasSource = COLUMN_ALIASES[field] || []

    const current = mappings[field]
    const error = previewErrors[activePopulationConfig.name]
    if ((!headers || headers.length === 0) && error) {
      return current && !aliasSource.includes(current)
        ? [current, ...aliasSource]
        : aliasSource
    }

    const filtered = headers.filter((header) => {
      if (current === header) return true
      return !mappedValues.includes(header)
    })
    return current && !filtered.includes(current)
      ? [current, ...filtered]
      : filtered
  }

  const phenotypeEntryFor = (populationName: string) => {
    ensurePhenotypeEntry(populationName)
    return (
      config.phenotype_config.by_population[populationName] || {
        binary_traits: [],
        quantitative_traits: [],
      }
    )
  }

  const covariateMapping = useMemo(() => {
    return config.phenotype_config?.covariate_id_mapping || {}
  }, [config.phenotype_config?.covariate_id_mapping])

  const hasAnyCovariateFiles = useMemo(
    () => populations.some((population) => Boolean(population.covariate_path)),
    [populations]
  )

  const renderProcessingMode = (mode: ProcessingModeKey) => {
    const isBinary = mode === "binary"
    const modeEnabled = isBinary ? allowBinaryTraits : allowQuantitativeTraits
    if (!modeEnabled) return null

    const modeState = processingConfig[mode]
    const runPopulation = modeState.runPopulation
    const traitKey = isBinary ? "binary_traits" : "quantitative_traits"
    const traitOptions = runPopulation
      ? config.phenotype_config.by_population[runPopulation]?.[traitKey] || []
      : []

    const handleRunPopulationChange = (value: string) => {
      updateProcessingMode(mode, (prev) => ({
        ...prev,
        runPopulation: value,
      }))
    }

    const handleTraitChange = (value: string) => {
      updateProcessingMode(mode, (prev) => ({
        ...prev,
        phenoColumn: value,
      }))
    }

    const handleChromChange = (value: string) => {
      updateProcessingMode(mode, (prev) => ({
        ...prev,
        chrom: value,
      }))
    }

    const handlePhiChange = (value: string) => {
      updateProcessingMode(mode, (prev) => ({
        ...prev,
        phi: value,
      }))
    }

    const handleGenotypeBasenameChange = (value: string) => {
      updateProcessingMode(mode, (prev) => ({
        ...prev,
        genotypeBasename: value,
      }))
    }

    const handleNgwasChange = (populationName: string, value: string) => {
      updateProcessingMode(mode, (prev) => ({
        ...prev,
        nGwas: {
          ...prev.nGwas,
          [populationName]: value,
        },
      }))
    }

    const modeLabel = isBinary ? "Binary" : "Quantitative"

    return (
      <div className="space-y-4 rounded-lg border p-4" key={mode}>
        <div className="flex items-center justify-between">
          <h5 className="font-medium">{modeLabel} Processing</h5>
          <Badge variant="outline" className="text-xs capitalize">
            {mode}
          </Badge>
        </div>

        {eligiblePopulations.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Configure at least one population with sumstats, genotype, and
            phenotype paths to run PRScsx processing.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase">Population to score</Label>
              <Select
                value={runPopulation || undefined}
                onValueChange={handleRunPopulationChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select population" />
                </SelectTrigger>
                <SelectContent>
                  {eligiblePopulations.map((population) => (
                    <SelectItem key={population.name} value={population.name}>
                      {population.name}
                      {population.type ? ` (${population.type})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase">Chromosome</Label>
              {isMultiChromGenotype ? (
                <Input
                  value={
                    Array.isArray(config?.genotype_config?.chrom)
                      ? ((config?.genotype_config?.chrom as number[]) || []).join(",")
                      : ""
                  }
                  readOnly
                  disabled
                  className="cursor-not-allowed bg-muted text-muted-foreground"
                  placeholder="Chromosomes controlled via Genotype Configuration"
                />
              ) : (
                <Input
                  value={modeState.chrom}
                  onChange={(event) => handleChromChange(event.target.value)}
                  placeholder="e.g. 1,2,22"
                />
              )}
              <p className="text-xs text-muted-foreground">
                {isMultiChromGenotype
                  ? "Controlled via Genotype Configuration; updates in real time."
                  : "Editable for merged genotypes; enter chromosome(s)."}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase">Phi</Label>
              <Input
                value={modeState.phi}
                onChange={(event) => handlePhiChange(event.target.value)}
                placeholder="1e-2"
              />
            </div>

            {!isMultiChromGenotype && (
              <div className="space-y-2">
                <Label className="text-xs uppercase">
                  Genotype prefix (merged)
                </Label>
                <Input
                  value={modeState.genotypeBasename}
                  onChange={(event) =>
                    handleGenotypeBasenameChange(event.target.value)
                  }
                  placeholder="geno"
                />
                <p className="text-xs text-muted-foreground">
                  Sets the PLINK basename used when merged genotype files are
                  preprocessed. Leave blank to keep the default
                  <code className="ml-1">geno</code>.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            GWAS Sample Sizes (nGWAS)
          </p>
          <p className="text-xs text-muted-foreground">
            Provide sample sizes for each population. The order is used when
            generating PRScsx inputs.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {config.populations.map((population) => (
              <div
                key={`${mode}-ngwas-${population.name}`}
                className="space-y-1"
              >
                <Label className="text-xs uppercase">{population.name}</Label>
                <Input
                  value={modeState.nGwas[population.name] || ""}
                  onChange={(event) =>
                    handleNgwasChange(population.name, event.target.value)
                  }
                  placeholder="e.g. 500"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase">Phenotype Column</Label>
          {runPopulation ? (
            traitOptions.length > 0 ? (
              <Select
                value={modeState.phenoColumn || undefined}
                onValueChange={handleTraitChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select phenotype column" />
                </SelectTrigger>
                <SelectContent>
                  {traitOptions.map((trait) => (
                    <SelectItem key={`${mode}-${trait}`} value={trait}>
                      {trait}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground">
                No {isBinary ? "binary" : "quantitative"} traits configured for{" "}
                {runPopulation}. Update the phenotype configuration to continue.
              </p>
            )
          ) : (
            <p className="text-xs text-muted-foreground">
              Select a population to choose a phenotype column.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          PRScsx Configuration
          {stepBadge}
        </CardTitle>
        <CardDescription>
          Configure cross-population preprocessing, mappings, and phenotype
          options for PRScsx
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Collapsible
            open={expandedSections.includes("column-mapping")}
            onOpenChange={() => toggleSection("column-mapping")}
          >
            <CollapsibleTrigger asChild>
              <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div>
                  <h4 className="font-medium">Column Mapping</h4>
                  <p className="text-sm text-muted-foreground">
                    Map sumstats headers for each population used by PRScsx
                  </p>
                </div>
                {expandedSections.includes("column-mapping") ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="space-y-4">
                <Tabs
                  value={activePopulation}
                  onValueChange={setActivePopulation}
                >
                  <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap border-b border-border bg-transparent p-0">
                    {populations.map((population) => {
                      const isActive = activePopulation === population.name
                      const badgeClasses = isActive
                        ? "border-white bg-white text-primary"
                        : "border-orange-200 bg-orange-100 text-orange-700"

                      return (
                        <TabsTrigger
                          key={population.name}
                          value={population.name}
                          className="group rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-semibold transition-all duration-200 hover:bg-muted/40 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-white"
                        >
                          <span className="flex items-center gap-2">
                            {population.name}
                            <Badge
                              variant="outline"
                              className={`hidden border text-xs sm:inline-flex ${badgeClasses}`}
                            >
                              {population.type === "target" ? "Target" : "Base"}
                            </Badge>
                          </span>
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>

                  {populations.map((population) => {
                    const preview = previews[population.name]
                    const loading = isLoadingPreview[population.name]
                    const error = previewErrors[population.name]
                    const mappings =
                      config.column_mappings.by_population[population.name] ||
                      {}

                    return (
                      <TabsContent
                        key={population.name}
                        value={population.name}
                        className="space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Preview your sumstats file to see available
                              columns
                            </p>
                            {config?.sumstats_file_type ===
                              "multi_chromosome" && (
                              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                <Info className="h-3.5 w-3.5 text-orange-500" />
                                Multi-chromosome input: if the path is a
                                directory, preview selects a random file. Ensure
                                headers are uniform across files; if they
                                differ, reload preview or map using a
                                representative file.
                              </p>
                            )}
                            {preview && (
                              <p className="mt-1 text-xs text-green-600">
                                ✓ Headers loaded –{" "}
                                {
                                  (preview.preview_lines?.[0] || "")
                                    .split(/\t|\s+/)
                                    .filter((h) => h).length
                                }{" "}
                                columns available
                              </p>
                            )}
                          </div>
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchFilePreview(population)}
                              disabled={loading || !population.sumstats_path}
                            >
                              {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="mr-2 h-4 w-4" />
                              )}
                              {preview ? "Reload Preview" : "Preview File"}
                            </Button>
                            {population.sumstats_path && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                File: {population.sumstats_path}
                              </div>
                            )}
                          </div>
                        </div>

                        {error && (
                          <>
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                              {error}
                            </div>
                            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <Info className="h-3.5 w-3.5" />
                              Preview failed. Manual mapping is enabled below;
                              choices are limited to known aliases per required
                              column.
                            </p>
                          </>
                        )}

                        {preview && (
                          <div className="rounded-lg border">
                            <div className="border-b bg-muted/50 p-3">
                              <h5 className="text-sm font-medium">
                                File Preview: {preview.filename}
                              </h5>
                              <p className="text-xs text-muted-foreground">
                                First 5 rows of the sumstats file
                              </p>
                            </div>
                            <div className="max-h-60 overflow-auto">
                              <table className="w-full text-xs">
                                <tbody>
                                  {preview.preview_lines
                                    .slice(0, 5)
                                    .map((line, idx) => (
                                      <tr key={idx} className="border-b">
                                        {(() => {
                                          const trimmed = line.trim()
                                          const cells = trimmed.includes("\t")
                                            ? trimmed.split("\t")
                                            : trimmed.length > 0
                                              ? trimmed.split(/\s+/)
                                              : []
                                          return cells.map((cell, cellIdx) => (
                                            <td
                                              key={cellIdx}
                                              className="whitespace-nowrap px-2 py-1"
                                            >
                                              {cell}
                                            </td>
                                          ))
                                        })()}
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {REQUIRED_COLUMNS.map((field) => {
                            const currentValue = mappings[field]
                            const options = getAvailableOptions(field)
                            const isMapped = Boolean(currentValue)

                            return (
                              <div
                                key={field}
                                className="rounded-lg border p-4 shadow-sm transition-colors hover:bg-muted/40"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium">
                                      {field}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {COLUMN_ALIASES[field].join(", ")}
                                    </p>
                                  </div>
                                  {isMapped ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-green-50 text-green-700"
                                    >
                                      Mapped
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="bg-red-50 text-red-700"
                                    >
                                      Required
                                    </Badge>
                                  )}
                                </div>

                                <div className="mt-3 space-y-2">
                                  <Label className="text-xs">
                                    Column Header
                                  </Label>
                                  <Select
                                    value={currentValue || undefined}
                                    onValueChange={(value) => {
                                      if (value === "__remove__") {
                                        removeColumnMapping(
                                          population.name,
                                          field
                                        )
                                      } else {
                                        setColumnMapping(
                                          population.name,
                                          field,
                                          value
                                        )
                                      }
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {isMapped && (
                                        <SelectItem value="__remove__">
                                          Remove mapping
                                        </SelectItem>
                                      )}
                                      {options.length > 0 ? (
                                        options.map((option) => (
                                          <SelectItem
                                            key={option}
                                            value={option}
                                          >
                                            {option}
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <SelectItem value="no-options" disabled>
                                          No available columns
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                  {!isMapped &&
                                    availableHeaders.length === 0 && (
                                      <p className="text-xs text-muted-foreground">
                                        Preview the file to populate headers
                                      </p>
                                    )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </TabsContent>
                    )
                  })}
                </Tabs>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible
            open={expandedSections.includes("phenotype-config")}
            onOpenChange={() => toggleSection("phenotype-config")}
          >
            <CollapsibleTrigger asChild>
              <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div>
                  <h4 className="font-medium">Phenotype Configuration</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure traits per population for evaluation
                  </p>
                </div>
                {expandedSections.includes("phenotype-config") ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="space-y-4">
                {populations.map((population) => {
                  const previewHeaders = phenotypeHeaders[population.name] || []
                  const traits = phenotypeEntryFor(population.name)
                  const hasPhenotypeFile = Boolean(population.phenotype_path)
                  const loading = loadingPhenotypes[population.name]
                  const error = phenotypeErrors[population.name]

                  return (
                    <div
                      key={population.name}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">
                            {population.name}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {population.phenotype_path || "No phenotype file mapped"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchPhenotypePreview(population)}
                          disabled={loading || !hasPhenotypeFile}
                        >
                          {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="mr-2 h-4 w-4" />
                          )}
                          Preview Phenotype
                        </Button>
                      </div>

                      {error && (
                        <p className="mt-2 text-xs text-red-600">{error}</p>
                      )}

                      {!hasPhenotypeFile ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Provide a phenotype path in the mapping step to
                          configure traits for this population.
                        </p>
                      ) : previewHeaders.length === 0 ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Preview the phenotype file to load column headers.
                        </p>
                      ) : (
                        <div className="mt-4 space-y-4">
                          <div className="rounded-lg border border-dashed p-3">
                            <p className="text-xs text-muted-foreground">
                              Evaluation type is set to
                              <span className="ml-1 font-medium capitalize">
                                {evaluationType}
                              </span>
                              .
                            </p>
                            {!allowBinaryTraits && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Enable binary evaluation to select binary traits
                                for this population.
                              </p>
                            )}
                            {!allowQuantitativeTraits && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Enable quantitative evaluation to select
                                quantitative traits for this population.
                              </p>
                            )}
                          </div>
                          {(allowBinaryTraits || allowQuantitativeTraits) && (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              {allowBinaryTraits && (
                                <div>
                                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                                    Binary Traits
                                  </p>
                                  <div className="mt-2 space-y-2">
                                    {previewHeaders.map((header) => (
                                      <label
                                        key={`binary-${population.name}-${header}`}
                                        className="flex items-center gap-2 text-xs"
                                      >
                                        <Checkbox
                                          checked={traits.binary_traits.includes(
                                            header
                                          )}
                                          onCheckedChange={(checked) =>
                                            toggleTrait(
                                              population.name,
                                              "binary_traits",
                                              header,
                                              checked
                                            )
                                          }
                                        />
                                        <span>{header}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {allowQuantitativeTraits && (
                                <div>
                                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                                    Quantitative Traits
                                  </p>
                                  <div className="mt-2 space-y-2">
                                    {previewHeaders.map((header) => (
                                      <label
                                        key={`quant-${population.name}-${header}`}
                                        className="flex items-center gap-2 text-xs"
                                      >
                                        <Checkbox
                                          checked={traits.quantitative_traits.includes(
                                            header
                                          )}
                                          onCheckedChange={(checked) =>
                                            toggleTrait(
                                              population.name,
                                              "quantitative_traits",
                                              header,
                                              checked
                                            )
                                          }
                                        />
                                        <span>{header}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {hasAnyCovariateFiles && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium">
                      Covariate Identifier Mapping
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Map the column identifiers used for individual IDs in
                      covariate files.
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                      {(["fid", "iid"] as const).map((key) => (
                        <div key={key} className="space-y-2">
                          <Label className="text-xs uppercase">{key}</Label>
                          <Input
                            value={covariateMapping[key] || ""}
                            placeholder={key}
                            onChange={(event) =>
                              updateConfig((current) => {
                                const nextPhenotypeConfig =
                                  current.phenotype_config || {
                                    by_population: {},
                                    covariate_id_mapping: {},
                                  }

                                return {
                                  ...current,
                                  phenotype_config: {
                                    ...nextPhenotypeConfig,
                                    covariate_id_mapping: {
                                      ...(nextPhenotypeConfig.covariate_id_mapping ||
                                        {}),
                                      [key]: event.target.value,
                                    },
                                  },
                                }
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible
            open={expandedSections.includes("genotype-config")}
            onOpenChange={() => toggleSection("genotype-config")}
          >
            <CollapsibleTrigger asChild>
              <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div>
                  <h4 className="font-medium">Genotype Configuration</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose genotype handling for PRScsx
                  </p>
                </div>
                {expandedSections.includes("genotype-config") ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              {config.genotype_config.file_type === "multi_chromosome" && (
                <div className="mt-6 space-y-3">
                  <Label className="text-sm">Chromosomes</Label>
                  <ChromosomeMultiSelect
                    value={config.genotype_config.chrom || []}
                    onChange={(next) =>
                      updateConfig((current) => ({
                        ...current,
                        genotype_config: {
                          ...current.genotype_config,
                          chrom: next,
                        },
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Select one or more chromosomes to process. Leave empty to
                    process all.
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible
            open={expandedSections.includes("processing-options")}
            onOpenChange={() => toggleSection("processing-options")}
          >
            <CollapsibleTrigger asChild>
              <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div>
                  <h4 className="font-medium">Preprocessing Options</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure preprocessing behaviour for PRScsx
                  </p>
                </div>
                {expandedSections.includes("processing-options") ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={config.options.skip_missing_columns}
                    onCheckedChange={(checked) =>
                      updateOptions({ skip_missing_columns: Boolean(checked) })
                    }
                  />
                  <span>
                    Skip missing columns
                    <span className="block text-xs text-muted-foreground">
                      Ignore rows where required columns are missing
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={config.options.overwrite_existing}
                    onCheckedChange={(checked) =>
                      updateOptions({ overwrite_existing: Boolean(checked) })
                    }
                  />
                  <span>
                    Overwrite existing outputs
                    <span className="block text-xs text-muted-foreground">
                      Replace previously generated preprocessing outputs
                    </span>
                  </span>
                </label>
                {config?.sumstats_file_type === "multi_chromosome" && (
                  <label className="flex items-start gap-3 text-sm">
                    <Checkbox
                      checked={Boolean(config.options.sumstats_strict_single)}
                      onCheckedChange={(checked) =>
                        updateOptions({
                          sumstats_strict_single: Boolean(checked),
                        })
                      }
                    />
                    <span>
                      Enforce one sumstats file per chromosome
                      <span className="block text-xs text-muted-foreground">
                        Sets strictness for sumstats files. If multiple files
                        exist for the same chromosome, the pipeline fails when
                        enabled; when disabled, one file is auto-selected and the
                        selection criteria is logged.
                      </span>
                    </span>
                  </label>
                )}
                {/* Removed evaluation-type info note per request */}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible
            open={expandedSections.includes("processing-config")}
            onOpenChange={() => toggleSection("processing-config")}
          >
            <CollapsibleTrigger asChild>
              <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div>
                  <h4 className="font-medium">Processing Configuration</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure PRScsx scoring inputs for the selected evaluation
                    type.
                  </p>
                </div>
                {expandedSections.includes("processing-config") ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed p-3">
                  <p className="text-xs text-muted-foreground">
                    Evaluation type is currently set to
                    <span className="ml-1 font-medium capitalize">
                      {evaluationType}
                    </span>
                    .
                  </p>
                  {!allowBinaryTraits && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enable binary evaluation to configure binary processing.
                    </p>
                  )}
                  {!allowQuantitativeTraits && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enable quantitative evaluation to configure quantitative
                      processing.
                    </p>
                  )}
                </div>

                <Tabs
                  value={processingActiveTab}
                  onValueChange={(v) =>
                    setProcessingActiveTab(v as ProcessingModeKey)
                  }
                  className="w-full"
                >
                  <TabsList>
                    {allowBinaryTraits && (
                      <TabsTrigger value="binary" disabled={!allowBinaryTraits}>
                        Binary
                      </TabsTrigger>
                    )}
                    {allowQuantitativeTraits && (
                      <TabsTrigger
                        value="quantitative"
                        disabled={!allowQuantitativeTraits}
                      >
                        Quantitative
                      </TabsTrigger>
                    )}
                  </TabsList>
                  {allowBinaryTraits && (
                    <TabsContent value="binary">
                      {renderProcessingMode("binary")}
                    </TabsContent>
                  )}
                  {allowQuantitativeTraits && (
                    <TabsContent value="quantitative">
                      {renderProcessingMode("quantitative")}
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  )
}
