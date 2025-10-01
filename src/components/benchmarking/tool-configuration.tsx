"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import axios from "axios"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  useBenchmarkingStore,
} from "@/stores/benchmarking-store"
import { getBenchmarkConfigUrl } from "@/lib/config"

import {
  PrsiceToolConfiguration,
} from "@/components/benchmarking/tool-configuration/PrsiceToolConfiguration"
import {
  PrscsxToolConfiguration,
} from "@/components/benchmarking/tool-configuration/PrscsxToolConfiguration"
import type {
  PrsicePreProcessingConfig,
  PrscsxPreProcessingConfig,
  ToolPreProcessingConfig,
  PrsicePhenotypePopulationConfig,
  ProcessingOptions,
  PrscsxColumnKey,
  EvaluationType,
  PrscsxProcessingState,
  PrscsxProcessingPayload,
} from "@/components/benchmarking/tool-configuration/types"

interface ToolConfigurationProps {
  onNext: (data: {
    configs: Record<string, ToolPreProcessingConfig>
    submitted: boolean
    jobId: string
    timestamp: string
  }) => void
  onPrevious?: () => void
  data?: Record<string, ToolPreProcessingConfig>
  toolsData?: any
  mappingData?: any
}

const TOOL_LABELS: Record<string, string> = {
  prsice: "PRSice",
  prscsx: "PRScsx",
  bridgeprs: "BridgePRS",
}

const PRSICE_REQUIRED_COLUMNS = [
  "SNP",
  "CHR",
  "BP",
  "A1",
  "A2",
  "BETA",
  "P",
]

const PRSCsx_REQUIRED_COLUMNS: PrscsxColumnKey[] = [
  "SNP",
  "A1",
  "A2",
  "BETA",
  "P",
]

const DEFAULT_PROCESSING_OPTIONS: ProcessingOptions = {
  evaluation_type: "both",
  process_binary_phenotypes: true,
  process_quantitative_phenotypes: true,
  skip_missing_columns: false,
  overwrite_existing: false,
}

const DEFAULT_PRSICE_PHENOTYPE: PrsicePhenotypePopulationConfig = {
  binary_traits: [],
  quantitative_traits: [],
}

const isPrsice = (toolId: string) => toolId.toLowerCase() === "prsice"
const isPrscsx = (toolId: string) => toolId.toLowerCase() === "prscsx"
const isBridgeprs = (toolId: string) => toolId.toLowerCase() === "bridgeprs"

type ProcessingModeKey = keyof PrscsxProcessingState

const safeStringify = (value: unknown) => {
  try {
    return JSON.stringify(value)
  } catch (error) {
    return ""
  }
}

export function ToolConfiguration({
  onNext,
  onPrevious,
  data,
  toolsData,
  mappingData,
}: ToolConfigurationProps) {
  const { jobId, stepData, setStepData } = useBenchmarkingStore()

  const selectedTools: string[] = useMemo(() => {
    const fromTools = toolsData?.selectedTools
    const fromStore = stepData["tools"]?.selectedTools
    return (fromTools ?? fromStore ?? []) as string[]
  }, [toolsData, stepData])

  const normalizedTools = useMemo(
    () => selectedTools.map((tool) => tool.toLowerCase()),
    [selectedTools]
  )

  const [activeTab, setActiveTab] = useState<string>(normalizedTools[0] || "")
  const [configs, setConfigs] = useState<Record<string, ToolPreProcessingConfig>>({})
  const [processingConfigs, setProcessingConfigs] =
    useState<Record<string, PrscsxProcessingState>>({})
  const [evaluationType, setEvaluationType] = useState<EvaluationType>(
    DEFAULT_PROCESSING_OPTIONS.evaluation_type
  )
  const initializedSignatureRef = useRef<string | null>(null)

  const initializationSignature = useMemo(() => {
    const toolsKey = normalizedTools.join("|") || "__none__"
    const jobKey = jobId ?? "__no_job__"
    const dataKey = safeStringify(data ?? {})
    const mappingKey = safeStringify(mappingData?.configData ?? {})
    return `${jobKey}::${toolsKey}::${dataKey}::${mappingKey}`
  }, [normalizedTools, jobId, data, mappingData])

  useEffect(() => {
    if (normalizedTools.length > 0 && !normalizedTools.includes(activeTab)) {
      setActiveTab(normalizedTools[0])
    }
  }, [normalizedTools, activeTab])

  const configStorageKey = jobId ? `tool_config_${jobId}` : undefined
  const processingStorageKey = jobId
    ? `tool_processing_config_${jobId}`
    : undefined

  const storedConfigs = useMemo(() => {
    if (!configStorageKey) return {} as Record<string, ToolPreProcessingConfig>
    return (
      (stepData[configStorageKey] as Record<string, ToolPreProcessingConfig>) ||
      {}
    )
  }, [configStorageKey, stepData])

  const storedProcessingConfigs = useMemo(() => {
    if (!processingStorageKey)
      return {} as Record<string, PrscsxProcessingState>
    return (
      (stepData[processingStorageKey] as Record<string, PrscsxProcessingState>) ||
      {}
    )
  }, [processingStorageKey, stepData])

  const buildInitialConfig = React.useCallback(
    (toolId: string): ToolPreProcessingConfig | null => {
      const key = toolId.toLowerCase()
      const fromData = data?.[key]
      const fromStore = storedConfigs?.[key]

      if (fromData) return fromData
      if (fromStore) return fromStore

      const mappingConfig = mappingData?.configData?.[key]

      if (isPrsice(key)) {
        if (!mappingConfig) return null
        const source = mappingConfig.source_population || {}
        const target = mappingConfig.target_population || {}

        const base: PrsicePreProcessingConfig = {
          target_population: {
            name: target.name || "",
            sumstats_path: target.sumstats_path || "",
            genotype_path: target.genotype_path || "",
            phenotype_path: target.phenotype_path || "",
          },
          source_population: {
            name: source.name || "",
            sumstats_path: source.sumstats_path || "",
            genotype_path: source.genotype_path || "",
            phenotype_path: source.phenotype_path || "",
          },
          output_dir: `results/preprocessed_data/preprocessed_${key}_output`,
          column_mappings: mappingConfig.column_mappings || {},
          phenotype_config: {
            target_population:
              mappingConfig.phenotype_config?.target_population ||
              { ...DEFAULT_PRSICE_PHENOTYPE },
            source_population:
              mappingConfig.phenotype_config?.source_population ||
              { ...DEFAULT_PRSICE_PHENOTYPE },
          },
          genotype_config: {
            file_type: mappingConfig.genotype_config?.file_type || "merged",
            population_reference:
              mappingConfig.genotype_config?.population_reference ||
              "target_population",
            file_patterns: {
              bed: mappingConfig.genotype_config?.file_patterns?.bed || "*.bed",
              bim: mappingConfig.genotype_config?.file_patterns?.bim || "*.bim",
              fam: mappingConfig.genotype_config?.file_patterns?.fam || "*.fam",
            },
          },
          options: {
            ...DEFAULT_PROCESSING_OPTIONS,
            ...mappingConfig.options,
          },
        }

        return base
      }

      if (isPrscsx(key)) {
        const preProcessing = mappingConfig?.pre_processing
        if (!preProcessing) return null

        const populations = Array.isArray(preProcessing.populations)
          ? preProcessing.populations.map((population: any) => ({
              name: population.name || "",
              type: population.type,
              sumstats_path: population.sumstats_path || "",
              genotype_path: population.genotype_path || "",
              phenotype_path: population.phenotype_path || "",
              covariate_path: population.covariate_path || "",
            }))
          : []

        const defaultPhenotypeConfig = populations.reduce(
          (acc: Record<string, PrsicePhenotypePopulationConfig>, population) => {
            acc[population.name] = {
              binary_traits: [],
              quantitative_traits: [],
            }
            return acc
          },
          {} as Record<string, PrsicePhenotypePopulationConfig>
        )

        const base: PrscsxPreProcessingConfig = {
          populations,
          column_mappings: {
            by_population:
              preProcessing.column_mappings?.by_population ||
              populations.reduce(
                (
                  acc: Record<string, Record<PrscsxColumnKey, string>>,
                  population
                ) => {
                  acc[population.name] = {}
                  return acc
                },
                {} as Record<string, Record<PrscsxColumnKey, string>>
              ),
          },
          phenotype_config: {
            by_population:
              preProcessing.phenotype_config?.by_population ||
              defaultPhenotypeConfig,
            covariate_id_mapping:
              preProcessing.phenotype_config?.covariate_id_mapping || {
                fid: "",
                iid: "",
              },
          },
          genotype_config: {
            file_type: preProcessing.genotype_config?.file_type || "merged",
          },
          options: {
            ...DEFAULT_PROCESSING_OPTIONS,
            ...preProcessing.options,
          },
          output_dir:
            preProcessing.output_dir ||
            `results/preprocessed_data/preprocessed_${key}_output`,
      }

      return base
    }

      if (isBridgeprs(key)) {
        return {} as ToolPreProcessingConfig
      }

      return null
    },
    [data, storedConfigs, mappingData]
  )

  const buildDefaultPrscsxProcessingState = (
    preProcessing?: PrscsxPreProcessingConfig
  ): PrscsxProcessingState => {
    const populationNames = preProcessing?.populations?.map((pop) => pop.name) || []
    const emptyMap = populationNames.reduce((acc, name) => {
      acc[name] = ""
      return acc
    }, {} as Record<string, string>)

    const baseState = {
      runPopulation: "",
      chrom: "22",
      phi: "1e-2",
      phenoColumn: "",
      nGwas: emptyMap,
    }

    return {
      binary: { ...baseState, nGwas: { ...emptyMap } },
      quantitative: { ...baseState, nGwas: { ...emptyMap } },
    }
  }

  const normalizeProcessingState = (
    state: PrscsxProcessingState | undefined,
    preProcessing?: PrscsxPreProcessingConfig
  ): PrscsxProcessingState => {
    const populationNames = preProcessing?.populations?.map((pop) => pop.name) || []

    const withDefaults = (
      modeState: PrscsxProcessingState[keyof PrscsxProcessingState] | undefined
    ) => {
      const base = {
        runPopulation: modeState?.runPopulation || "",
        chrom: modeState?.chrom || "22",
        phi: modeState?.phi || "1e-2",
        phenoColumn: modeState?.phenoColumn || "",
        nGwas: {} as Record<string, string>,
      }

      populationNames.forEach((name) => {
        base.nGwas[name] = modeState?.nGwas?.[name] || ""
      })

      return base
    }

    if (!state) {
      return buildDefaultPrscsxProcessingState(preProcessing)
    }

    return {
      binary: withDefaults(state.binary),
      quantitative: withDefaults(state.quantitative),
    }
  }

  const buildInitialProcessingConfig = React.useCallback(
    (
      toolId: string,
      preProcessing?: PrscsxPreProcessingConfig
    ): PrscsxProcessingState => {
      const key = toolId.toLowerCase()
      const fromStore = storedProcessingConfigs?.[key]
      return normalizeProcessingState(fromStore, preProcessing)
    },
    [storedProcessingConfigs]
  )

  useEffect(() => {
    const signature = initializationSignature

    if (initializedSignatureRef.current === signature) {
      return
    }

    if (normalizedTools.length === 0) {
      setConfigs({})
      initializedSignatureRef.current = signature
      return
    }

    const initialConfigs: Record<string, ToolPreProcessingConfig> = {}
    const initialProcessing: Record<string, PrscsxProcessingState> = {}

    normalizedTools.forEach((toolId) => {
      if (isBridgeprs(toolId)) {
        initialConfigs[toolId] =
          buildInitialConfig(toolId) || ({} as ToolPreProcessingConfig)
        return
      }

      const existing = buildInitialConfig(toolId)

      if (existing) {
        initialConfigs[toolId] = existing
      } else if (isPrsice(toolId)) {
        initialConfigs[toolId] = buildDefaultPrsiceConfig(toolId)
      } else if (isPrscsx(toolId)) {
        initialConfigs[toolId] = buildDefaultPrscsxConfig(toolId)
      }

      if (isPrscsx(toolId)) {
        initialProcessing[toolId] = buildInitialProcessingConfig(
          toolId,
          initialConfigs[toolId] as PrscsxPreProcessingConfig
        )
      }
    })

    setConfigs(initialConfigs)
    setProcessingConfigs(initialProcessing)
    initializedSignatureRef.current = signature

    let detectedType: EvaluationType | null = null
    for (const toolId of normalizedTools) {
      const cfg = initialConfigs[toolId]
      if (!cfg) continue
      if (isPrsice(toolId)) {
        detectedType = (cfg as PrsicePreProcessingConfig).options.evaluation_type
      } else if (isPrscsx(toolId)) {
        detectedType = (cfg as PrscsxPreProcessingConfig).options.evaluation_type
      }
      if (detectedType) {
        break
      }
    }

    if (detectedType) {
      setEvaluationType((prev) => (prev === detectedType ? prev : detectedType))
    }
  }, [
    normalizedTools,
    buildInitialConfig,
    buildInitialProcessingConfig,
    initializationSignature,
  ])

  useEffect(() => {
    if (!jobId) return
    if (Object.keys(configs).length === 0) return
    if (configStorageKey) {
      setStepData(configStorageKey, configs)
    }
  }, [configs, configStorageKey, jobId, setStepData])

  useEffect(() => {
    if (!jobId) return
    if (!processingStorageKey) return
    if (Object.keys(processingConfigs).length === 0) return
    setStepData(processingStorageKey, processingConfigs)
  }, [processingConfigs, processingStorageKey, jobId, setStepData])


  const buildDefaultPrsiceConfig = (toolId: string): PrsicePreProcessingConfig => ({
    target_population: {
      name: "",
      sumstats_path: "",
      genotype_path: "",
      phenotype_path: "",
    },
    source_population: {
      name: "",
      sumstats_path: "",
      genotype_path: "",
      phenotype_path: "",
    },
    output_dir: `results/preprocessed_data/preprocessed_${toolId}_output`,
    column_mappings: {},
    phenotype_config: {
      target_population: { ...DEFAULT_PRSICE_PHENOTYPE },
      source_population: { ...DEFAULT_PRSICE_PHENOTYPE },
    },
    genotype_config: {
      file_type: "merged",
      population_reference: "target_population",
      file_patterns: { bed: "*.bed", bim: "*.bim", fam: "*.fam" },
    },
    options: { ...DEFAULT_PROCESSING_OPTIONS },
  })

  const buildDefaultPrscsxConfig = (toolId: string): PrscsxPreProcessingConfig => ({
    populations: [],
    column_mappings: { by_population: {} },
    phenotype_config: {
      by_population: {},
      covariate_id_mapping: { fid: "", iid: "" },
    },
    genotype_config: { file_type: "merged" },
    options: { ...DEFAULT_PROCESSING_OPTIONS },
    output_dir: `results/preprocessed_data/preprocessed_${toolId}_output`,
  })

  const setConfigForTool = (
    toolId: string,
    nextConfig: ToolPreProcessingConfig
  ) => {
    setConfigs((prev) => ({
      ...prev,
      [toolId]: nextConfig,
    }))
  }

  const setProcessingConfigForTool = (
    toolId: string,
    updater: (state: PrscsxProcessingState) => PrscsxProcessingState
  ) => {
    if (!isPrscsx(toolId)) return

    setProcessingConfigs((prev) => {
      const currentConfig = prev[toolId]
      const preProcessing = configs[toolId]
      const baseState = buildDefaultPrscsxProcessingState(
        (preProcessing as PrscsxPreProcessingConfig | undefined) ?? undefined
      )
      const nextState = updater(currentConfig || baseState)
      return {
        ...prev,
        [toolId]: nextState,
      }
    })
  }

  const getPrscsxProcessingErrors = React.useCallback(
    (
      preProcessing: PrscsxPreProcessingConfig,
      processingState: PrscsxProcessingState | undefined,
      mode: EvaluationType
    ): string[] => {
      const errors: string[] = []
      if (!processingState) {
        errors.push("PRScsx: Configure processing options")
        return errors
      }

      const populations = preProcessing.populations || []
      const populationNames = populations.map((population) => population.name)
      const eligibleNames = populations
        .filter(
          (population) =>
            Boolean(
              population.sumstats_path &&
                population.genotype_path &&
                population.phenotype_path
            )
        )
        .map((population) => population.name)

      const requiredModes: ProcessingModeKey[] = []
      if (mode === "binary" || mode === "both") {
        requiredModes.push("binary")
      }
      if (mode === "quantitative" || mode === "both") {
        requiredModes.push("quantitative")
      }

      requiredModes.forEach((key) => {
        const state = processingState[key]
        const label = key === "binary" ? "Binary" : "Quantitative"

        if (!state.runPopulation) {
          errors.push(`PRScsx ${label}: Select a population to run the calculation`)
        } else if (!eligibleNames.includes(state.runPopulation)) {
          errors.push(
            `PRScsx ${label}: ${state.runPopulation} is missing sumstats, genotype, or phenotype paths`
          )
        }

        const traitKey = key === "binary" ? "binary_traits" : "quantitative_traits"
        const traits =
          preProcessing.phenotype_config.by_population[state.runPopulation || ""]?.[
            traitKey
          ] || []

        if (state.runPopulation) {
          if (traits.length === 0) {
            errors.push(
              `PRScsx ${label}: No ${key === "binary" ? "binary" : "quantitative"} traits configured for ${state.runPopulation}`
            )
          } else if (!state.phenoColumn || !traits.includes(state.phenoColumn)) {
            errors.push(
              `PRScsx ${label}: Choose a phenotype column for ${state.runPopulation}`
            )
          }
        }

        populations.forEach((population) => {
          const value = state.nGwas[population.name]?.trim()
          if (!value) {
            errors.push(
              `PRScsx ${label}: Provide nGWAS for ${population.name}`
            )
            return
          }

          if (!/^[0-9]+(\.[0-9]+)?$/.test(value)) {
            errors.push(
              `PRScsx ${label}: nGWAS for ${population.name} must be numeric`
            )
          }
        })

        if (!state.chrom.trim()) {
          errors.push(`PRScsx ${label}: Provide a chromosome value`)
        }
        if (!state.phi.trim()) {
          errors.push(`PRScsx ${label}: Provide a phi value`)
        }
      })

      return errors
    },
    []
  )

  useEffect(() => {
    setConfigs((prev) => {
      if (Object.keys(prev).length === 0) {
        return prev
      }

      const allowBinary = evaluationType !== "quantitative"
      const allowQuant = evaluationType !== "binary"
      let changed = false

      const nextEntries = Object.entries(prev).map(([toolId, cfg]) => {
        if (isPrsice(toolId)) {
          const prsiceConfig = cfg as PrsicePreProcessingConfig
          const target = prsiceConfig.phenotype_config.target_population
          const source = prsiceConfig.phenotype_config.source_population

          const optionsNeedUpdate =
            prsiceConfig.options.evaluation_type !== evaluationType ||
            prsiceConfig.options.process_binary_phenotypes !== allowBinary ||
            prsiceConfig.options.process_quantitative_phenotypes !== allowQuant

          const targetBinaryNeedsClear = !allowBinary && target.binary_traits.length > 0
          const targetQuantNeedsClear = !allowQuant && target.quantitative_traits.length > 0
          const sourceBinaryNeedsClear = !allowBinary && source.binary_traits.length > 0
          const sourceQuantNeedsClear = !allowQuant && source.quantitative_traits.length > 0

          if (
            !optionsNeedUpdate &&
            !targetBinaryNeedsClear &&
            !targetQuantNeedsClear &&
            !sourceBinaryNeedsClear &&
            !sourceQuantNeedsClear
          ) {
            return [toolId, cfg] as const
          }

          changed = true
          const nextConfig: PrsicePreProcessingConfig = {
            ...prsiceConfig,
            phenotype_config: {
              target_population: {
                binary_traits: allowBinary ? target.binary_traits : [],
                quantitative_traits: allowQuant ? target.quantitative_traits : [],
              },
              source_population: {
                binary_traits: allowBinary ? source.binary_traits : [],
                quantitative_traits: allowQuant ? source.quantitative_traits : [],
              },
            },
            options: {
              ...prsiceConfig.options,
              evaluation_type: evaluationType,
              process_binary_phenotypes: allowBinary,
              process_quantitative_phenotypes: allowQuant,
            },
          }

          return [toolId, nextConfig] as const
        }

        if (isPrscsx(toolId)) {
          const prscsxConfig = cfg as PrscsxPreProcessingConfig
          const populations = prscsxConfig.populations ?? []

          let traitsChanged = false
          const sanitizedByPopulation: Record<string, PrsicePhenotypePopulationConfig> = {}

          const currentByPopulation =
            prscsxConfig.phenotype_config.by_population || {}

          for (const [name, traits] of Object.entries(currentByPopulation)) {
            sanitizedByPopulation[name] = {
              binary_traits: allowBinary ? traits.binary_traits : [],
              quantitative_traits: allowQuant ? traits.quantitative_traits : [],
            }

            if (!allowBinary && traits.binary_traits.length > 0) {
              traitsChanged = true
            }
            if (!allowQuant && traits.quantitative_traits.length > 0) {
              traitsChanged = true
            }
          }

          populations.forEach((population) => {
            if (!sanitizedByPopulation[population.name]) {
              sanitizedByPopulation[population.name] = {
                binary_traits: allowBinary ? [] : [],
                quantitative_traits: allowQuant ? [] : [],
              }
              traitsChanged = true
            }
          })

          const optionsNeedUpdate =
            prscsxConfig.options.evaluation_type !== evaluationType ||
            prscsxConfig.options.process_binary_phenotypes !== allowBinary ||
            prscsxConfig.options.process_quantitative_phenotypes !== allowQuant

          if (!optionsNeedUpdate && !traitsChanged) {
            return [toolId, cfg] as const
          }

          changed = true
          const nextConfig: PrscsxPreProcessingConfig = {
            ...prscsxConfig,
            populations,
            phenotype_config: {
              ...prscsxConfig.phenotype_config,
              by_population: sanitizedByPopulation,
            },
            options: {
              ...prscsxConfig.options,
              evaluation_type: evaluationType,
              process_binary_phenotypes: allowBinary,
              process_quantitative_phenotypes: allowQuant,
            },
          }

          return [toolId, nextConfig] as const
        }

        return [toolId, cfg] as const
      })

      return changed ? Object.fromEntries(nextEntries) : prev
    })
  }, [evaluationType])

  const isToolComplete = (toolId: string) => {
    const config = configs[toolId]
    if (!config) return false

    if (isPrsice(toolId)) {
      const prsiceConfig = config as PrsicePreProcessingConfig
      return PRSICE_REQUIRED_COLUMNS.every(
        (column) => Boolean(prsiceConfig.column_mappings[column])
      )
    }

    if (isPrscsx(toolId)) {
      const prscsxConfig = config as PrscsxPreProcessingConfig
      const populations = prscsxConfig.populations ?? []
      if (populations.length === 0) return false
      const hasMappings = populations.every((population) =>
        PRSCsx_REQUIRED_COLUMNS.every((column) =>
          Boolean(
            prscsxConfig.column_mappings.by_population[population.name]?.[column]
          )
        )
      )
      if (!hasMappings) return false

      const processingState = processingConfigs[toolId]
      return (
        getPrscsxProcessingErrors(
          prscsxConfig,
          processingState,
          evaluationType
        ).length === 0
      )
    }

    if (isBridgeprs(toolId)) {
      return true
    }

    return false
  }

  const validateConfiguration = (
    toolId: string
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    const config = configs[toolId]

    if (!config) {
      errors.push(`No configuration found for ${toolId}`)
      return { isValid: false, errors }
    }

    if (isBridgeprs(toolId)) {
      return { isValid: true, errors }
    }

    if (isPrsice(toolId)) {
      const prsiceConfig = config as PrsicePreProcessingConfig

      if (!prsiceConfig.target_population.sumstats_path) {
        errors.push("PRSice: Missing target population sumstats path")
      }
      if (!prsiceConfig.target_population.genotype_path) {
        errors.push("PRSice: Missing target population genotype path")
      }
      if (!prsiceConfig.target_population.phenotype_path) {
        errors.push("PRSice: Missing target population phenotype path")
      }
      if (!prsiceConfig.source_population.sumstats_path) {
        errors.push("PRSice: Missing source population sumstats path")
      }
      if (!prsiceConfig.source_population.genotype_path) {
        errors.push("PRSice: Missing source population genotype path")
      }
      if (!prsiceConfig.source_population.phenotype_path) {
        errors.push("PRSice: Missing source population phenotype path")
      }

      const missingColumns = PRSICE_REQUIRED_COLUMNS.filter(
        (column) => !prsiceConfig.column_mappings[column]
      )
      if (missingColumns.length > 0) {
        errors.push(
          `PRSice: Missing column mappings for ${missingColumns.join(", ")}`
        )
      }

      const evaluationType = prsiceConfig.options.evaluation_type || "both"
      const targetTraits = prsiceConfig.phenotype_config.target_population
      const sourceTraits = prsiceConfig.phenotype_config.source_population

      const requiresBinary = evaluationType === "binary" || evaluationType === "both"
      const requiresQuant = evaluationType === "quantitative" || evaluationType === "both"
      const targetHasPhenotype = Boolean(prsiceConfig.target_population.phenotype_path)
      const sourceHasPhenotype = Boolean(prsiceConfig.source_population.phenotype_path)

      if (
        requiresBinary &&
        targetHasPhenotype &&
        sourceHasPhenotype &&
        (targetTraits.binary_traits.length === 0 ||
          sourceTraits.binary_traits.length === 0)
      ) {
        errors.push(
          "PRSice: Select at least one binary trait for both populations"
        )
      }

      if (
        requiresQuant &&
        targetHasPhenotype &&
        sourceHasPhenotype &&
        (targetTraits.quantitative_traits.length === 0 ||
          sourceTraits.quantitative_traits.length === 0)
      ) {
        errors.push(
          "PRSice: Select at least one quantitative trait for both populations"
        )
      }

      const { bed, bim, fam } = prsiceConfig.genotype_config.file_patterns
      if (!bed || !bim || !fam) {
        errors.push("PRSice: Provide genotype file patterns (bed/bim/fam)")
      }

      if (!prsiceConfig.output_dir) {
        errors.push("PRSice: Specify an output directory")
      }

      return { isValid: errors.length === 0, errors }
    }

    if (isPrscsx(toolId)) {
      const prscsxConfig = config as PrscsxPreProcessingConfig
      const populations = prscsxConfig.populations ?? []

      if (populations.length === 0) {
        errors.push("PRScsx: No populations configured")
      }

      populations.forEach((population) => {
        if (!population.sumstats_path) {
          errors.push(
            `PRScsx: Missing sumstats path for population ${population.name}`
          )
        }
      })

      populations.forEach((population) => {
        const mappings =
          prscsxConfig.column_mappings.by_population[population.name] || {}
        const missing = PRSCsx_REQUIRED_COLUMNS.filter(
          (column) => !mappings[column]
        )
        if (missing.length > 0) {
          errors.push(
            `PRScsx: Missing column mappings for ${population.name} (${missing.join(", ")})`
          )
        }
      })

      const evaluationType = prscsxConfig.options.evaluation_type || "both"
      populations.forEach((population) => {
        const traits =
          prscsxConfig.phenotype_config.by_population[population.name] || {
            binary_traits: [],
            quantitative_traits: [],
          }

        if (
          (evaluationType === "binary" || evaluationType === "both") &&
          population.phenotype_path &&
          traits.binary_traits.length === 0
        ) {
          errors.push(
            `PRScsx: Select at least one binary trait for ${population.name}`
          )
        }

        if (
          (evaluationType === "quantitative" || evaluationType === "both") &&
          population.phenotype_path &&
          traits.quantitative_traits.length === 0
        ) {
          errors.push(
            `PRScsx: Select at least one quantitative trait for ${population.name}`
          )
        }
      })

      const { fid, iid } = prscsxConfig.phenotype_config.covariate_id_mapping
      const requiresCovariates = populations.some(
        (population) => Boolean(population.covariate_path)
      )
      if (requiresCovariates && (!fid || !iid)) {
        errors.push("PRScsx: Provide covariate ID mapping for fid and iid")
      }

      if (!prscsxConfig.output_dir) {
        errors.push("PRScsx: Specify an output directory")
      }

      const processingErrors = getPrscsxProcessingErrors(
        prscsxConfig,
        processingConfigs[toolId],
        evaluationType
      )
      errors.push(...processingErrors)

      return { isValid: errors.length === 0, errors }
    }

    return { isValid: errors.length === 0, errors }
  }

  const sanitizePrsiceConfig = (
    config: PrsicePreProcessingConfig
  ): PrsicePreProcessingConfig => {
    const evaluationType = config.options.evaluation_type || "both"

    const sanitizePopulation = (
      population: "target_population" | "source_population"
    ) => {
      const traits = config.phenotype_config[population]
      return {
        binary_traits:
          evaluationType === "binary" || evaluationType === "both"
            ? traits.binary_traits.filter(Boolean)
            : [],
        quantitative_traits:
          evaluationType === "quantitative" || evaluationType === "both"
            ? traits.quantitative_traits.filter(Boolean)
            : [],
      }
    }

    return {
      ...config,
      phenotype_config: {
        target_population: sanitizePopulation("target_population"),
        source_population: sanitizePopulation("source_population"),
      },
      options: {
        ...config.options,
        evaluation_type: evaluationType,
        process_binary_phenotypes:
          evaluationType === "binary" || evaluationType === "both",
        process_quantitative_phenotypes:
          evaluationType === "quantitative" || evaluationType === "both",
      },
    }
  }

  const sanitizePrscsxConfig = (
    config: PrscsxPreProcessingConfig
  ): PrscsxPreProcessingConfig => {
    const evaluationType = config.options.evaluation_type || "both"
    const populations = config.populations ?? []

    const filteredTraits = populations.reduce(
      (acc, population) => {
        const traits =
          config.phenotype_config.by_population[population.name] || {
            binary_traits: [],
            quantitative_traits: [],
          }

        acc[population.name] = {
          binary_traits:
            evaluationType === "binary" || evaluationType === "both"
              ? traits.binary_traits.filter(Boolean)
              : [],
          quantitative_traits:
            evaluationType === "quantitative" || evaluationType === "both"
              ? traits.quantitative_traits.filter(Boolean)
              : [],
        }
        return acc
      },
      {} as Record<string, PrsicePhenotypePopulationConfig>
    )

    const columnMappings = populations.reduce(
      (acc, population) => {
        const mappings =
          config.column_mappings.by_population[population.name] || {}
        const cleaned = PRSCsx_REQUIRED_COLUMNS.reduce(
          (inner, column) => {
            const value = mappings[column]
            if (value) inner[column] = value
            return inner
          },
          {} as Record<PrscsxColumnKey, string>
        )
        acc[population.name] = cleaned
        return acc
      },
      {} as Record<string, Record<PrscsxColumnKey, string>>
    )

    return {
      ...config,
      populations,
      column_mappings: {
        by_population: columnMappings,
      },
      phenotype_config: {
        by_population: filteredTraits,
        covariate_id_mapping: config.phenotype_config.covariate_id_mapping,
      },
      options: {
        ...config.options,
        evaluation_type: evaluationType,
        process_binary_phenotypes:
          evaluationType === "binary" || evaluationType === "both",
        process_quantitative_phenotypes:
          evaluationType === "quantitative" || evaluationType === "both",
      },
    }
  }

  const buildPrscsxProcessingPayload = (
    preProcessing: PrscsxPreProcessingConfig,
    processingState: PrscsxProcessingState,
    mode: EvaluationType
  ): PrscsxProcessingPayload => {
    const populations = preProcessing.populations || []
    const populationNames = populations.map((population) => population.name)
    const baseOutputDir = preProcessing.output_dir

    const basePlaceholder = "{base_pop}"
    const targetPlaceholder = "{target_pop}"
    const targetPopulationName =
      populations.find((population) => population.type === "target")?.name || ""

    const sstFiles = [
      `${baseOutputDir}/sumstats/${basePlaceholder}/${basePlaceholder}_sumstats.txt`,
      `${baseOutputDir}/sumstats/${targetPlaceholder}/${targetPlaceholder}_sumstats.txt`,
    ]
    const populationsString = `${basePlaceholder},${targetPlaceholder}`

    const result: PrscsxProcessingPayload = {}

    const buildModePayload = (key: ProcessingModeKey) => {
      const state = processingState[key]
      if (!state.runPopulation) return null

      const nGwasList = populationNames.map(
        (name) => state.nGwas[name]?.trim() || ""
      )
      if (nGwasList.some((value) => !value)) return null

      const chromValue = state.chrom.trim()
      const phiValue = state.phi.trim()
      if (!chromValue || !phiValue) return null

      const phenoColumn = state.phenoColumn
      if (!phenoColumn) return null

      const runPopulation = state.runPopulation
      const selectedPopulation = populations.find(
        (population) => population.name === runPopulation
      )
      const selectedType = selectedPopulation?.type ||
        (runPopulation === targetPopulationName ? "target" : "base")
      const scoringPlaceholder =
        selectedType === "target" ? targetPlaceholder : basePlaceholder
      const evaluationLabel = key === "binary" ? "bin" : "quant"
      const genotypePrefix = `${baseOutputDir}/genotypes/${scoringPlaceholder}/geno`
      const phenoFile = `${baseOutputDir}/phenotypes/pheno_${evaluationLabel}_${scoringPlaceholder}.txt`
      const plinkOutputPrefix = `results/prs_results/prscsx_plink/${scoringPlaceholder}_test_${scoringPlaceholder}_result`
      const outName = `${basePlaceholder}_${targetPlaceholder}`

      const payload: PrscsxProcessingModePayload = {
        ldref_folder: "ld_ref",
        bim_prefix: genotypePrefix,
        sst_files: sstFiles,
        n_gwas: nGwasList.join(","),
        populations: populationsString,
        chrom: chromValue,
        phi: phiValue,
        out_name: outName,
        output_dir: "results/prs_results/prscsx",
        plink_genotype_prefix: genotypePrefix,
        score_choice: "base",
        pheno: phenoFile,
        pheno_column_name: phenoColumn,
        plink_output_prefix: plinkOutputPrefix,
        log_dir: "results/log_files/prscsx_log",
        scoring_population: runPopulation,
        scoring_population_type: selectedType,
        population_order: populationNames,
      }

      return payload
    }

    if (mode === "binary" || mode === "both") {
      const payload = buildModePayload("binary")
      if (payload) {
        result.binary = payload
      }
    }

    if (mode === "quantitative" || mode === "both") {
      const payload = buildModePayload("quantitative")
      if (payload) {
        result.quantitative = payload
      }
    }

    return result
  }

  const handleSubmit = async () => {
    const allErrors: string[] = []
    normalizedTools.forEach((toolId) => {
      const validation = validateConfiguration(toolId)
      if (!validation.isValid) {
        allErrors.push(...validation.errors)
      }
    })

    if (allErrors.length > 0) {
      toast.error(allErrors.slice(0, 3).join(". "))
      return
    }

    const sanitized = normalizedTools.reduce(
      (acc, toolId) => {
        if (isBridgeprs(toolId)) {
          acc[toolId] = null
          return acc
        }

        const config = configs[toolId]
        if (!config) return acc
        if (isPrsice(toolId)) {
          acc[toolId] = sanitizePrsiceConfig(config as PrsicePreProcessingConfig)
        } else if (isPrscsx(toolId)) {
          acc[toolId] = sanitizePrscsxConfig(
            config as PrscsxPreProcessingConfig
          )
        }
        return acc
      },
      {} as Record<string, ToolPreProcessingConfig | null>
    )

    const sanitizedForStore = Object.fromEntries(
      Object.entries(sanitized).filter(([toolId]) => !isBridgeprs(toolId))
    ) as Record<string, ToolPreProcessingConfig>

    const sanitizedProcessing = normalizedTools.reduce(
      (acc, toolId) => {
        if (!isPrscsx(toolId)) return acc
        const preProcessing =
          sanitized[toolId] as PrscsxPreProcessingConfig | undefined
        const processingState = processingConfigs[toolId]
        if (!preProcessing || !processingState) return acc

        const payload = buildPrscsxProcessingPayload(
          preProcessing,
          processingState,
          preProcessing.options.evaluation_type || evaluationType
        )

        if (payload.binary || payload.quantitative) {
          acc[toolId] = payload
        }

        return acc
      },
      {} as Record<string, PrscsxProcessingPayload>
    )

    const requestBody = {
      config: {
        tools_to_run: normalizedTools,
        ...Object.fromEntries(
          normalizedTools.map((toolId) => [
            toolId,
            {
              pre_processing: sanitized[toolId],
              ...(isPrscsx(toolId) && sanitizedProcessing[toolId]
                ? { processing: sanitizedProcessing[toolId] }
                : {}),
            },
          ])
        ),
      },
    }

    console.log("[ToolConfiguration] submitting configs", {
      sanitized,
      sanitizedForStore,
      sanitizedProcessing,
      requestBody,
    })

    try {
      if (!jobId) throw new Error("No job ID found")

      await axios.post(getBenchmarkConfigUrl(jobId), requestBody, {
        headers: { "Content-Type": "application/json" },
      })

      toast.success("Configuration submitted! Starting benchmarking...")

      onNext({
        configs: sanitizedForStore,
        processing: sanitizedProcessing,
        submitted: true,
        jobId,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Failed to submit configuration", error)
      toast.error("Failed to submit configuration. Please try again.")
    }
  }

  const handleEvaluationTypeChange = (value: EvaluationType) => {
    if (value === evaluationType) return
    setEvaluationType(value)
  }

  if (normalizedTools.length === 0) {
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

  const stepBadge = <Badge variant="outline">Step 5</Badge>
  const allToolsConfigured = normalizedTools.every(isToolComplete)
  const isNextDisabled = normalizedTools.length === 0 || !allToolsConfigured

  const renderToolConfiguration = (toolId: string) => {
    if (isBridgeprs(toolId)) {
      return (
        <Card className="border-dashed border-slate-300 bg-slate-50">
          <CardContent className="space-y-2 py-6 text-sm text-muted-foreground">
            <p className="font-medium text-slate-700">
              BridgePRS configuration
            </p>
            <p>
              BridgePRS support is in progress. No additional configuration is
              required for this tool yet, so you can proceed to the next step.
            </p>
          </CardContent>
        </Card>
      )
    }

    const config = configs[toolId]
    if (!config) return null

    if (isPrsice(toolId)) {
      return (
        <PrsiceToolConfiguration
          key={toolId}
          toolId={toolId}
          config={config as PrsicePreProcessingConfig}
          jobId={jobId}
          onConfigChange={(nextConfig) => setConfigForTool(toolId, nextConfig)}
          stepBadge={stepBadge}
          evaluationType={evaluationType}
        />
      )
    }

    if (isPrscsx(toolId)) {
      const processingState =
        processingConfigs[toolId] ??
        buildDefaultPrscsxProcessingState(
          configs[toolId] as PrscsxPreProcessingConfig | undefined
        )
      return (
        <PrscsxToolConfiguration
          key={toolId}
          toolId={toolId}
          config={config as PrscsxPreProcessingConfig}
          jobId={jobId}
          onConfigChange={(nextConfig) => setConfigForTool(toolId, nextConfig)}
          stepBadge={stepBadge}
          evaluationType={evaluationType}
          processingConfig={processingState}
          onProcessingChange={(updater) =>
            setProcessingConfigForTool(toolId, updater)
          }
        />
      )
    }

    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xl font-semibold">Tool Configuration</h3>
        <p className="text-muted-foreground">
          Configure preprocessing settings and column mappings for each selected tool.
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <h4 className="font-medium">Evaluation Type</h4>
        <p className="text-sm text-muted-foreground">
          Applies to all selected tools. Trait selection is enabled only for the chosen evaluation type.
        </p>
        <div className="mt-3 flex flex-wrap gap-6">
          {(["both", "binary", "quantitative"] as EvaluationType[]).map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="global_evaluation_type"
                value={value}
                className="h-4 w-4"
                checked={evaluationType === value}
                onChange={() => handleEvaluationTypeChange(value)}
              />
              <span className="capitalize">
                {value === "both"
                  ? "Binary + Quantitative"
                  : value === "binary"
                    ? "Binary"
                    : "Quantitative"}
              </span>
            </label>
          ))}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap border-b border-border bg-transparent p-0">
          {normalizedTools.map((toolId) => {
            const isComplete = isToolComplete(toolId)
            return (
              <TabsTrigger
                key={toolId}
                value={toolId}
                data-complete={isComplete}
                className="group rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-semibold transition-all duration-200 hover:bg-muted/40 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                <span className="flex items-center gap-2">
                  {TOOL_LABELS[toolId] || toolId}
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

        {normalizedTools.map((toolId) => (
          <TabsContent key={toolId} value={toolId} className="space-y-4">
            {renderToolConfiguration(toolId)}
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-between">
        {onPrevious && (
          <Button variant="outline" onClick={onPrevious}>
            Back
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={isNextDisabled}>
          Next
        </Button>
      </div>
    </div>
  )
}
