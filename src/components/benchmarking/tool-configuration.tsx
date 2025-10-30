"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import axios from "axios"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"
import { getBenchmarkConfigUrl } from "@/lib/config"

import { PrsiceToolConfiguration } from "@/components/benchmarking/tool-configuration/PrsiceToolConfiguration"
import { PrscsxToolConfiguration } from "@/components/benchmarking/tool-configuration/PrscsxToolConfiguration"
import { BridgeprsToolConfiguration } from "@/components/benchmarking/tool-configuration/BridgeprsToolConfiguration"
import { SdprxToolConfiguration } from "@/components/benchmarking/tool-configuration/SdprxToolConfiguration"
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
  BridgeprsPreProcessingConfig,
  BridgeprsColumnKey,
  BridgeprsProcessingState,
  BridgeprsProcessingModeState,
  BridgeprsProcessingPayload,
  SdprxPreProcessingConfig,
  SdprxProcessingState,
  SdprxProcessingModeState,
  SdprxProcessingPayload,
  SdprxColumnKey,
  PrsiceProcessingPayload,
} from "@/components/benchmarking/tool-configuration/types"
import {
  sanitizeBridgeprsConfig,
  sanitizePrsiceConfig,
  sanitizePrscsxConfig,
  sanitizeSdprxConfig,
  buildPrscsxProcessingPayload,
  buildBridgeprsProcessingPayload,
  buildSdprxProcessingPayload,
  buildPrsiceProcessingPayload,
} from "@/components/benchmarking/payload-builders"

interface ToolConfigurationProps {
  onNext: (data: {
    configs: Record<string, ToolPreProcessingConfig>
    processing?: Record<
      string,
      | PrscsxProcessingPayload
      | BridgeprsProcessingPayload
      | SdprxProcessingPayload
      | PrsiceProcessingPayload
    >
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
  sdprx: "SDPRX",
}

const PRSICE_REQUIRED_COLUMNS = ["SNP", "CHR", "BP", "A1", "A2", "BETA", "P"]

const PRSCsx_REQUIRED_COLUMNS: PrscsxColumnKey[] = [
  "SNP",
  "A1",
  "A2",
  "BETA",
  "P",
]

const BRIDGEPRS_REQUIRED_COLUMNS: BridgeprsColumnKey[] = [
  "CHR",
  "ID",
  "PS",
  "A1",
  "REF",
  "BETA",
  "SE",
  "P",
  "N",
]

// SDPRX required columns per new schema
const SDPRX_REQUIRED_COLUMNS: SdprxColumnKey[] = ["SNP", "A1", "A2", "N"]

const DEFAULT_PROCESSING_OPTIONS: ProcessingOptions = {
  evaluation_type: "both",
  process_binary_phenotypes: true,
  process_quantitative_phenotypes: true,
  skip_missing_columns: false,
  overwrite_existing: false,
  sumstats_strict_single: false,
}

const DEFAULT_PRSICE_PHENOTYPE: PrsicePhenotypePopulationConfig = {
  binary_traits: [],
  quantitative_traits: [],
}

const isPrsice = (toolId: string) => toolId.toLowerCase() === "prsice"
const isPrscsx = (toolId: string) => toolId.toLowerCase() === "prscsx"
const isBridgeprs = (toolId: string) => toolId.toLowerCase() === "bridgeprs"
const isSdprx = (toolId: string) => toolId.toLowerCase() === "sdprx"

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
  const [configs, setConfigs] = useState<
    Record<string, ToolPreProcessingConfig>
  >({})
  const [processingConfigs, setProcessingConfigs] = useState<
    Record<string, PrscsxProcessingState>
  >({})
  const [bridgeprsProcessingConfigs, setBridgeprsProcessingConfigs] = useState<
    Record<string, BridgeprsProcessingState>
  >({})
  const [sdprxProcessingConfigs, setSdprxProcessingConfigs] = useState<
    Record<string, SdprxProcessingState>
  >({})
  const [evaluationType, setEvaluationType] = useState<EvaluationType>(
    DEFAULT_PROCESSING_OPTIONS.evaluation_type
  )
  const initializedSignatureRef = useRef<string | null>(null)
  const [debugOpen, setDebugOpen] = useState(false)
  const showDebug = false

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
    if (!processingStorageKey) return {} as Record<string, any>
    return (stepData[processingStorageKey] as Record<string, any>) || {}
  }, [processingStorageKey, stepData])

  const buildInitialConfig = React.useCallback(
    (toolId: string): ToolPreProcessingConfig | null => {
      const key = toolId.toLowerCase()
      const fromData = data?.[key]
      const fromStore = storedConfigs?.[key]
      const mappingConfig = mappingData?.configData?.[key]

      if (isPrsice(key)) {
        if (!mappingConfig) {
          return (fromData as PrsicePreProcessingConfig) ||
            (fromStore as PrsicePreProcessingConfig) ||
            null
        }
        const source = mappingConfig.source_population || {}
        const target = mappingConfig.target_population || {}

        const mappingBase: PrsicePreProcessingConfig = {
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
            target_population: mappingConfig.phenotype_config?.target_population || {
              ...DEFAULT_PRSICE_PHENOTYPE,
            },
            source_population: mappingConfig.phenotype_config?.source_population || {
              ...DEFAULT_PRSICE_PHENOTYPE,
            },
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
          sumstats_file_type: mappingConfig.sumstats_file_type || "merged",
          options: {
            ...DEFAULT_PROCESSING_OPTIONS,
            ...mappingConfig.options,
          },
        }

        const existing =
          (fromData as PrsicePreProcessingConfig) ||
          (fromStore as PrsicePreProcessingConfig)

        if (existing) {
          return {
            ...existing,
            target_population: {
              ...existing.target_population,
              name: mappingBase.target_population.name || existing.target_population?.name || "",
              sumstats_path: mappingBase.target_population.sumstats_path,
              genotype_path: mappingBase.target_population.genotype_path,
              phenotype_path: mappingBase.target_population.phenotype_path,
            },
            source_population: {
              ...existing.source_population,
              name: mappingBase.source_population.name || existing.source_population?.name || "",
              sumstats_path: mappingBase.source_population.sumstats_path,
              genotype_path: mappingBase.source_population.genotype_path,
              phenotype_path: mappingBase.source_population.phenotype_path,
            },
          }
        }

        return mappingBase
      }

      if (isBridgeprs(key)) {
        const preProcessing = mappingConfig?.pre_processing
        if (!preProcessing) {
          return (fromData as BridgeprsPreProcessingConfig) ||
            (fromStore as BridgeprsPreProcessingConfig) ||
            null
        }

        const buildPopulation = (
          pop: any
        ): {
          name: string
          sumstats_path: string
          genotype_path: string
          phenotype_path: string
        } => ({
          name: pop?.name || "",
          sumstats_path: pop?.sumstats_path || "",
          genotype_path: pop?.genotype_path || "",
          phenotype_path: pop?.phenotype_path || "",
        })

        const pop1 = buildPopulation(preProcessing?.pop1)
        const pop2 = buildPopulation(preProcessing?.pop2)

        const columnMappings = BRIDGEPRS_REQUIRED_COLUMNS.reduce(
          (acc, column) => {
            const value = preProcessing?.column_mappings?.[column]
            if (value) {
              acc[column] = value
            }
            return acc
          },
          {} as Partial<Record<BridgeprsColumnKey, string>>
        )

        const mappingBase: BridgeprsPreProcessingConfig = {
          pop1,
          pop2,
          genotype_path: preProcessing?.genotype_path || "",
          output_dir:
            preProcessing?.output_dir ||
            `results/preprocessed_data/preprocessed_${key}_output`,
          column_mappings: columnMappings,
          fixed_N:
            typeof preProcessing?.fixed_N === "number"
              ? preProcessing?.fixed_N
              : null,
          genotype_config: {
            file_type: preProcessing?.genotype_config?.file_type || "merged",
            population_reference:
              preProcessing?.genotype_config?.population_reference === "pop2"
                ? "pop2"
                : "pop1",
            file_patterns: {
              bed:
                preProcessing?.genotype_config?.file_patterns?.bed || "*.bed",
              bim:
                preProcessing?.genotype_config?.file_patterns?.bim || "*.bim",
              fam:
                preProcessing?.genotype_config?.file_patterns?.fam || "*.fam",
            },
          },
          phenotype_config: {
            pop1: {
              binary_traits:
                preProcessing?.phenotype_config?.pop1?.binary_traits?.filter(
                  Boolean
                ) || [],
              quantitative_traits:
                preProcessing?.phenotype_config?.pop1?.quantitative_traits?.filter(
                  Boolean
                ) || [],
            },
            pop2: {
              binary_traits:
                preProcessing?.phenotype_config?.pop2?.binary_traits?.filter(
                  Boolean
                ) || [],
              quantitative_traits:
                preProcessing?.phenotype_config?.pop2?.quantitative_traits?.filter(
                  Boolean
                ) || [],
            },
          },
          sumstats_file_type: preProcessing?.sumstats_file_type || "merged",
          options: {
            ...DEFAULT_PROCESSING_OPTIONS,
            ...(preProcessing?.options ?? {}),
          },
        }

        const existing =
          (fromData as BridgeprsPreProcessingConfig) ||
          (fromStore as BridgeprsPreProcessingConfig)

        if (existing) {
          return {
            ...existing,
            pop1: {
              ...existing.pop1,
              name: mappingBase.pop1.name || existing.pop1?.name || "",
              sumstats_path: mappingBase.pop1.sumstats_path,
              genotype_path: mappingBase.pop1.genotype_path,
              phenotype_path: mappingBase.pop1.phenotype_path,
            },
            pop2: {
              ...existing.pop2,
              name: mappingBase.pop2.name || existing.pop2?.name || "",
              sumstats_path: mappingBase.pop2.sumstats_path,
              genotype_path: mappingBase.pop2.genotype_path,
              phenotype_path: mappingBase.pop2.phenotype_path,
            },
            genotype_path: mappingBase.genotype_path,
          }
        }

        return mappingBase
      }

      if (isPrscsx(key)) {
        const preProcessing = mappingConfig?.pre_processing
        if (!preProcessing) {
          return (fromData as PrscsxPreProcessingConfig) ||
            (fromStore as PrscsxPreProcessingConfig) ||
            null
        }

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
          (
            acc: Record<string, PrsicePhenotypePopulationConfig>,
            population
          ) => {
            acc[population.name] = {
              binary_traits: [],
              quantitative_traits: [],
            }
            return acc
          },
          {} as Record<string, PrsicePhenotypePopulationConfig>
        )

        const mappingBase: PrscsxPreProcessingConfig = {
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
            covariate_id_mapping: preProcessing.phenotype_config?.covariate_id_mapping || {
              fid: "",
              iid: "",
            },
          },
          genotype_config: {
            file_type: preProcessing.genotype_config?.file_type || "merged",
          },
          sumstats_file_type: preProcessing?.sumstats_file_type || "merged",
          options: {
            ...DEFAULT_PROCESSING_OPTIONS,
            ...preProcessing.options,
          },
          output_dir:
            preProcessing.output_dir ||
            `results/preprocessed_data/preprocessed_${key}_output`,
        }

        const existing =
          (fromData as PrscsxPreProcessingConfig) ||
          (fromStore as PrscsxPreProcessingConfig)

        if (existing?.populations?.length) {
          const mergedPopulations = populations.map((pop, idx) => {
            const byName = existing.populations.find((p) => p.name === pop.name)
            const fallback = existing.populations[idx]
            const base = byName || fallback
            return {
              ...(base || {}),
              name: pop.name,
              type: pop.type ?? base?.type,
              sumstats_path: pop.sumstats_path,
              genotype_path: pop.genotype_path,
              phenotype_path: pop.phenotype_path,
              covariate_path: pop.covariate_path,
            }
          })

          return {
            ...existing,
            populations: mergedPopulations,
          }
        }

        return mappingBase
      }

      // SDPRX: build initial config from mapping
      if (isSdprx(key)) {
        const preProcessing = mappingConfig?.pre_processing
        if (!preProcessing) {
          return (fromData as SdprxPreProcessingConfig) ||
            (fromStore as SdprxPreProcessingConfig) ||
            null
        }

        const buildPopulation = (pop: any) => ({
          name: pop?.name || "",
          sumstats_path: pop?.sumstats_path || "",
          genotype_path: pop?.genotype_path || "",
          phenotype_path: pop?.phenotype_path || "",
        })

        const pop1 = buildPopulation(preProcessing?.pop1)
        const pop2 = buildPopulation(preProcessing?.pop2)

        const columnMappings = SDPRX_REQUIRED_COLUMNS.reduce(
          (acc, column) => {
            const value = preProcessing?.column_mappings?.[column]
            if (value) acc[column] = value
            return acc
          },
          {} as Partial<Record<SdprxColumnKey, string>>
        )

        const mappingBase: SdprxPreProcessingConfig = {
          pop1,
          pop2,
          genotype_path: preProcessing?.genotype_path || "",
          output_dir:
            preProcessing?.output_dir ||
            `results/preprocessed_data/preprocessed_${key}_output`,
          column_mappings: columnMappings,
          fixed_N1:
            typeof preProcessing?.fixed_N1 === "string"
              ? preProcessing.fixed_N1
              : undefined,
          fixed_N2:
            typeof preProcessing?.fixed_N2 === "string"
              ? preProcessing.fixed_N2
              : undefined,
          genotype_config: {
            file_type: preProcessing?.genotype_config?.file_type || "merged",
            population_reference:
              preProcessing?.genotype_config?.population_reference === "pop2"
                ? "pop2"
                : "pop1",
            file_patterns: {
              bed:
                preProcessing?.genotype_config?.file_patterns?.bed || "*.bed",
              bim:
                preProcessing?.genotype_config?.file_patterns?.bim || "*.bim",
              fam:
                preProcessing?.genotype_config?.file_patterns?.fam || "*.fam",
            },
          },
          phenotype_config: {
            pop1: {
              binary_traits:
                preProcessing?.phenotype_config?.pop1?.binary_traits?.filter(
                  Boolean
                ) || [],
              quantitative_traits:
                preProcessing?.phenotype_config?.pop1?.quantitative_traits?.filter(
                  Boolean
                ) || [],
            },
            pop2: {
              binary_traits:
                preProcessing?.phenotype_config?.pop2?.binary_traits?.filter(
                  Boolean
                ) || [],
              quantitative_traits:
                preProcessing?.phenotype_config?.pop2?.quantitative_traits?.filter(
                  Boolean
                ) || [],
            },
          },
          sumstats_file_type: preProcessing?.sumstats_file_type || "merged",
          options: {
            ...DEFAULT_PROCESSING_OPTIONS,
            ...(preProcessing?.options ?? {}),
          },
        }

        const existing =
          (fromData as SdprxPreProcessingConfig) ||
          (fromStore as SdprxPreProcessingConfig)

        if (existing) {
          return {
            ...existing,
            pop1: {
              ...existing.pop1,
              name: mappingBase.pop1.name || existing.pop1?.name || "",
              sumstats_path: mappingBase.pop1.sumstats_path,
              genotype_path: mappingBase.pop1.genotype_path,
              phenotype_path: mappingBase.pop1.phenotype_path,
            },
            pop2: {
              ...existing.pop2,
              name: mappingBase.pop2.name || existing.pop2?.name || "",
              sumstats_path: mappingBase.pop2.sumstats_path,
              genotype_path: mappingBase.pop2.genotype_path,
              phenotype_path: mappingBase.pop2.phenotype_path,
            },
            genotype_path: mappingBase.genotype_path,
          }
        }

        return mappingBase
      }

      // No specific builder matched; fall back to input or store
      return (fromData as ToolPreProcessingConfig) ||
        (fromStore as ToolPreProcessingConfig) ||
        null
    },
    [data, storedConfigs, mappingData]
  )

  const buildDefaultPrscsxProcessingState = (
    preProcessing?: PrscsxPreProcessingConfig
  ): PrscsxProcessingState => {
    const populationNames =
      preProcessing?.populations?.map((pop) => pop.name) || []
    const emptyMap = populationNames.reduce(
      (acc, name) => {
        acc[name] = ""
        return acc
      },
      {} as Record<string, string>
    )

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
    const populationNames =
      preProcessing?.populations?.map((pop) => pop.name) || []

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

  // BridgePRS: default processing state (editable values; paths are fixed in the payload builder)
  const buildDefaultBridgeprsProcessingState = (
    preProcessing?: BridgeprsPreProcessingConfig
  ): BridgeprsProcessingState => {
    const defaultQuant: BridgeprsProcessingModeState = {
      // Do not auto-select a default quantitative phenotype; force user selection
      bridgeprs_phenotype: "",
      fst: "0.1",
      sumstats_size_EUR: "",
      sumstats_size_AFR: "",
      bridgeprs_genotype_file: "geno",
    }
    const defaultBin: BridgeprsProcessingModeState = {
      // Do not auto-select a default binary phenotype; force user selection
      bridgeprs_phenotype: "",
      fst: "0.1",
      sumstats_size_EUR: "",
      sumstats_size_AFR: "",
      bridgeprs_genotype_file: "geno",
    }
    return {
      binary: defaultBin,
      quantitative: defaultQuant,
    }
  }

  const buildInitialBridgeprsProcessingConfig = (
    toolId: string,
    preProcessing?: BridgeprsPreProcessingConfig
  ): BridgeprsProcessingState => {
    const base = buildDefaultBridgeprsProcessingState(preProcessing)
    const fromStore = storedProcessingConfigs?.[toolId] as
      | Partial<BridgeprsProcessingState>
      | undefined
    if (!fromStore) return base
    return {
      binary: {
        bridgeprs_phenotype:
          fromStore.binary?.bridgeprs_phenotype ||
          base.binary.bridgeprs_phenotype,
        fst: fromStore.binary?.fst || base.binary.fst,
        sumstats_size_EUR:
          fromStore.binary?.sumstats_size_EUR || base.binary.sumstats_size_EUR,
        sumstats_size_AFR:
          fromStore.binary?.sumstats_size_AFR || base.binary.sumstats_size_AFR,
        bridgeprs_genotype_file:
          fromStore.binary?.bridgeprs_genotype_file ||
          base.binary.bridgeprs_genotype_file,
      },
      quantitative: {
        bridgeprs_phenotype:
          fromStore.quantitative?.bridgeprs_phenotype ||
          base.quantitative.bridgeprs_phenotype,
        fst: fromStore.quantitative?.fst || base.quantitative.fst,
        sumstats_size_EUR:
          fromStore.quantitative?.sumstats_size_EUR ||
          base.quantitative.sumstats_size_EUR,
        sumstats_size_AFR:
          fromStore.quantitative?.sumstats_size_AFR ||
          base.quantitative.sumstats_size_AFR,
        bridgeprs_genotype_file:
          fromStore.quantitative?.bridgeprs_genotype_file ||
          base.quantitative.bridgeprs_genotype_file,
      },
    }
  }

  // SDPRX: default processing state
  const buildDefaultSdprxProcessingState = (
    preProcessing?: SdprxPreProcessingConfig
  ): SdprxProcessingState => {
    const populationRef = preProcessing?.genotype_config?.population_reference
    const genoPath =
      populationRef === "pop2"
        ? preProcessing?.pop2?.genotype_path || ""
        : preProcessing?.pop1?.genotype_path || ""

    const base: SdprxProcessingModeState = {
      ss1: preProcessing?.pop1?.sumstats_path || "",
      ss2: preProcessing?.pop2?.sumstats_path || "",
      // For merged runs, treat sdprx_genotype_file as a basename (default "geno").
      // Multi-chromosome ignores this field; payload builder uses directory.
      sdprx_genotype_file: "geno",
      n1: "",
      n2: "",
      force_shared: false,
      load_ld:
        "C:/Users/CABLE/Downloads/Cable/Code/PRS-sandbox/python_version/chr_22.gz",
      valid: "",
      chrom: "",
      rho: "",
      output_dir: preProcessing?.output_dir || "",
      score_file: "",
      plink_output_prefix: "",
      plink_genotype_prefix: "",
      pheno: "",
      log_dir: "",
    }
    return {
      binary: { ...base },
      quantitative: { ...base },
    }
  }

  const buildInitialSdprxProcessingConfig = (
    toolId: string,
    preProcessing?: SdprxPreProcessingConfig
  ): SdprxProcessingState => {
    const base = buildDefaultSdprxProcessingState(preProcessing)
    const fromStore = storedProcessingConfigs?.[toolId] as
      | Partial<SdprxProcessingState>
      | undefined
    if (!fromStore) return base

    const mergeMode = (
      mode: SdprxProcessingModeState | undefined,
      defaults: SdprxProcessingModeState
    ): SdprxProcessingModeState => ({
      ss1: mode?.ss1 ?? defaults.ss1,
      ss2: mode?.ss2 ?? defaults.ss2,
      sdprx_genotype_file:
        mode?.sdprx_genotype_file ?? defaults.sdprx_genotype_file,
      n1: mode?.n1 ?? defaults.n1,
      n2: mode?.n2 ?? defaults.n2,
      force_shared: mode?.force_shared ?? defaults.force_shared,
      load_ld: mode?.load_ld ?? defaults.load_ld,
      valid: mode?.valid ?? defaults.valid,
      chrom: mode?.chrom ?? defaults.chrom,
      rho: mode?.rho ?? defaults.rho,
      output_dir: mode?.output_dir ?? defaults.output_dir,
      score_file: mode?.score_file ?? defaults.score_file,
      plink_output_prefix:
        mode?.plink_output_prefix ?? defaults.plink_output_prefix,
      pheno: mode?.pheno ?? defaults.pheno,
      log_dir: mode?.log_dir ?? defaults.log_dir,
    })

    return {
      binary: mergeMode(fromStore.binary, base.binary),
      quantitative: mergeMode(fromStore.quantitative, base.quantitative),
    }
  }

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
    const initialBridgeProcessing: Record<string, BridgeprsProcessingState> = {}
    const initialSdprxProcessing: Record<string, SdprxProcessingState> = {}

    normalizedTools.forEach((toolId) => {
      if (isBridgeprs(toolId)) {
        const existing = buildInitialConfig(toolId)
        initialConfigs[toolId] = existing
          ? (existing as BridgeprsPreProcessingConfig)
          : buildDefaultBridgeprsConfig(toolId)
        initialBridgeProcessing[toolId] = buildInitialBridgeprsProcessingConfig(
          toolId,
          initialConfigs[toolId] as BridgeprsPreProcessingConfig
        )
        return
      }

      const existing = buildInitialConfig(toolId)

      if (existing) {
        initialConfigs[toolId] = existing
      } else if (isPrsice(toolId)) {
        initialConfigs[toolId] = buildDefaultPrsiceConfig(toolId)
      } else if (isPrscsx(toolId)) {
        initialConfigs[toolId] = buildDefaultPrscsxConfig(toolId)
      } else if (isSdprx(toolId)) {
        initialConfigs[toolId] = buildDefaultSdprxConfig(toolId)
      }

      if (isPrscsx(toolId)) {
        initialProcessing[toolId] = buildInitialProcessingConfig(
          toolId,
          initialConfigs[toolId] as PrscsxPreProcessingConfig
        )
      }

      if (isSdprx(toolId)) {
        initialSdprxProcessing[toolId] = buildInitialSdprxProcessingConfig(
          toolId,
          initialConfigs[toolId] as SdprxPreProcessingConfig
        )
      }
    })

    setConfigs(initialConfigs)
    setProcessingConfigs(initialProcessing)
    setBridgeprsProcessingConfigs(initialBridgeProcessing)
    setSdprxProcessingConfigs(initialSdprxProcessing)
    initializedSignatureRef.current = signature

    let detectedType: EvaluationType | null = null
    for (const toolId of normalizedTools) {
      const cfg = initialConfigs[toolId]
      if (!cfg) continue
      if (isPrsice(toolId)) {
        detectedType = (cfg as PrsicePreProcessingConfig).options
          .evaluation_type
      } else if (isPrscsx(toolId)) {
        detectedType = (cfg as PrscsxPreProcessingConfig).options
          .evaluation_type
      } else if (isBridgeprs(toolId)) {
        detectedType = (cfg as BridgeprsPreProcessingConfig).options
          .evaluation_type
      } else if (isSdprx(toolId)) {
        detectedType = (cfg as SdprxPreProcessingConfig).options.evaluation_type
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
    const merged = {
      ...processingConfigs,
      ...bridgeprsProcessingConfigs,
      ...sdprxProcessingConfigs,
    }
    if (Object.keys(merged).length === 0) return
    setStepData(processingStorageKey, merged)
  }, [
    processingConfigs,
    bridgeprsProcessingConfigs,
    sdprxProcessingConfigs,
    processingStorageKey,
    jobId,
    setStepData,
  ])
  const buildDefaultBridgeprsConfig = (
    toolId: string
  ): BridgeprsPreProcessingConfig => ({
    pop1: {
      name: "",
      sumstats_path: "",
      genotype_path: "",
      phenotype_path: "",
    },
    pop2: {
      name: "",
      sumstats_path: "",
      genotype_path: "",
      phenotype_path: "",
    },
    genotype_path: "",
    output_dir: `results/preprocessed_data/preprocessed_${toolId}_output`,
    column_mappings: BRIDGEPRS_REQUIRED_COLUMNS.reduce(
      (acc, column) => {
        acc[column] = ""
        return acc
      },
      {} as Partial<Record<BridgeprsColumnKey, string>>
    ),
    fixed_N: null,
    genotype_config: {
      file_type: "merged",
      population_reference: "pop1",
      file_patterns: { bed: "*.bed", bim: "*.bim", fam: "*.fam" },
    },
    phenotype_config: {
      pop1: { binary_traits: [], quantitative_traits: [] },
      pop2: { binary_traits: [], quantitative_traits: [] },
    },
    options: { ...DEFAULT_PROCESSING_OPTIONS },
  })

  const buildDefaultPrsiceConfig = (
    toolId: string
  ): PrsicePreProcessingConfig => ({
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
      chrom: [],
      file_patterns: { bed: "*.bed", bim: "*.bim", fam: "*.fam" },
    },
    options: { ...DEFAULT_PROCESSING_OPTIONS },
  })

  const buildDefaultPrscsxConfig = (
    toolId: string
  ): PrscsxPreProcessingConfig => ({
    populations: [],
    column_mappings: { by_population: {} },
    phenotype_config: {
      by_population: {},
      covariate_id_mapping: { fid: "", iid: "" },
    },
    genotype_config: { file_type: "merged", chrom: [] },
    options: { ...DEFAULT_PROCESSING_OPTIONS },
    output_dir: `results/preprocessed_data/preprocessed_${toolId}_output`,
  })

  const buildDefaultSdprxConfig = (
    toolId: string
  ): SdprxPreProcessingConfig => ({
    pop1: {
      name: "",
      sumstats_path: "",
      genotype_path: "",
      phenotype_path: "",
    },
    pop2: {
      name: "",
      sumstats_path: "",
      genotype_path: "",
      phenotype_path: "",
    },
    genotype_path: "",
    output_dir: `results/preprocessed_data/preprocessed_${toolId}_output`,
    column_mappings: SDPRX_REQUIRED_COLUMNS.reduce(
      (acc, column) => {
        acc[column] = ""
        return acc
      },
      {} as Partial<Record<SdprxColumnKey, string>>
    ),
    fixed_N1: "",
    fixed_N2: "",
    genotype_config: {
      file_type: "merged",
      population_reference: "pop1",
      chrom: [],
      file_patterns: { bed: "*.bed", bim: "*.bim", fam: "*.fam" },
    },
    phenotype_config: {
      pop1: { binary_traits: [], quantitative_traits: [] },
      pop2: { binary_traits: [], quantitative_traits: [] },
    },
    options: { ...DEFAULT_PROCESSING_OPTIONS },
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

  const setBridgeprsProcessingConfigForTool = (
    toolId: string,
    updater: (state: BridgeprsProcessingState) => BridgeprsProcessingState
  ) => {
    if (!isBridgeprs(toolId)) return

    setBridgeprsProcessingConfigs((prev) => {
      const current = prev[toolId]
      const preProcessing = configs[toolId] as
        | BridgeprsPreProcessingConfig
        | undefined
      const base = buildDefaultBridgeprsProcessingState(preProcessing)
      const next = updater(current || base)
      return {
        ...prev,
        [toolId]: next,
      }
    })
  }

  const setSdprxProcessingConfigForTool = (
    toolId: string,
    updater: (state: SdprxProcessingState) => SdprxProcessingState
  ) => {
    if (!isSdprx(toolId)) return

    setSdprxProcessingConfigs((prev) => {
      const current = prev[toolId]
      const preProcessing = configs[toolId] as
        | SdprxPreProcessingConfig
        | undefined
      const base = buildDefaultSdprxProcessingState(preProcessing)
      const next = updater(current || base)
      return {
        ...prev,
        [toolId]: next,
      }
    })
  }

  // Build a debug snapshot mirroring the submit flow without sending
  const buildDebugSnapshot = (): {
    sanitized: Record<string, ToolPreProcessingConfig>
    sanitizedProcessing: Record<
      string,
      | PrscsxProcessingPayload
      | BridgeprsProcessingPayload
      | SdprxProcessingPayload
      | PrsiceProcessingPayload
    >
    requestBody: any
    validationErrors: string[]
  } => {
    const validationErrors: string[] = []
    normalizedTools.forEach((toolId) => {
      const v = validateConfiguration(toolId)
      if (!v.isValid) validationErrors.push(...v.errors)
    })

    const sanitized = normalizedTools.reduce(
      (acc, toolId) => {
        const config = configs[toolId]
        if (!config) return acc
        if (isBridgeprs(toolId)) {
          acc[toolId] = sanitizeBridgeprsConfig(
            config as BridgeprsPreProcessingConfig
          )
        } else if (isPrsice(toolId)) {
          acc[toolId] = sanitizePrsiceConfig(
            config as PrsicePreProcessingConfig
          )
        } else if (isPrscsx(toolId)) {
          acc[toolId] = sanitizePrscsxConfig(
            config as PrscsxPreProcessingConfig
          )
        } else if (isSdprx(toolId)) {
          acc[toolId] = sanitizeSdprxConfig(config as SdprxPreProcessingConfig)
        }
        return acc
      },
      {} as Record<string, ToolPreProcessingConfig>
    )

    const sanitizedProcessing = normalizedTools.reduce(
      (acc, toolId) => {
        if (isPrscsx(toolId)) {
          const preProcessing = sanitized[toolId] as
            | PrscsxPreProcessingConfig
            | undefined
          const processingState = processingConfigs[toolId]
          if (preProcessing && processingState) {
            const payload = buildPrscsxProcessingPayload(
              preProcessing,
              processingState,
              preProcessing.options.evaluation_type || evaluationType
            )
            if (payload.binary || payload.quantitative) {
              acc[toolId] = payload
            }
          }
        } else if (isPrsice(toolId)) {
          const preProcessing = sanitized[toolId] as
            | PrsicePreProcessingConfig
            | undefined
          if (preProcessing) {
            const payload = buildPrsiceProcessingPayload(
              preProcessing,
              preProcessing.options.evaluation_type || evaluationType
            )
            if (payload.binary || payload.quantitative) {
              acc[toolId] = payload
            }
          }
        } else if (isBridgeprs(toolId)) {
          const preProcessing = sanitized[toolId] as
            | BridgeprsPreProcessingConfig
            | undefined
          const processingState = bridgeprsProcessingConfigs[toolId]
          if (preProcessing && processingState) {
            const payload = buildBridgeprsProcessingPayload(
              preProcessing,
              processingState,
              preProcessing.options.evaluation_type || evaluationType
            )
            if (payload.binary || payload.quantitative) {
              acc[toolId] = payload
            }
          }
        } else if (isSdprx(toolId)) {
          const preProcessing = sanitized[toolId] as
            | SdprxPreProcessingConfig
            | undefined
          const processingState = sdprxProcessingConfigs[toolId]
          if (preProcessing && processingState) {
            const payload = buildSdprxProcessingPayload(
              preProcessing,
              processingState,
              preProcessing.options.evaluation_type || evaluationType
            )
            if (payload.binary || payload.quantitative) {
              acc[toolId] = payload
            }
          }
        }
        return acc
      },
      {} as Record<
        string,
        | PrscsxProcessingPayload
        | BridgeprsProcessingPayload
        | SdprxProcessingPayload
      >
    )

    const requestBody = {
      config: {
        tools_to_run: normalizedTools,
        ...Object.fromEntries(
          normalizedTools.map((toolId) => [
            toolId,
            {
              pre_processing: sanitized[toolId],
              ...(sanitizedProcessing[toolId]
                ? { processing: sanitizedProcessing[toolId] }
                : {}),
            },
          ])
        ),
      },
    }

    return { sanitized, sanitizedProcessing, requestBody, validationErrors }
  }

  // Dev-only prefills
  const prefillMinimal = () => {
    setConfigs((prev) => {
      const next = { ...prev }
      normalizedTools.forEach((toolId) => {
        if (isPrsice(toolId)) {
          const base = buildDefaultPrsiceConfig(toolId)
          next[toolId] = {
            ...base,
            target_population: {
              name: "TargetPop",
              sumstats_path: "data/target_sumstats.txt",
              genotype_path: "data/genotypes/target",
              phenotype_path: "data/phenotypes/target.tsv",
            },
            source_population: {
              name: "SourcePop",
              sumstats_path: "data/source_sumstats.txt",
              genotype_path: "data/genotypes/source",
              phenotype_path: "data/phenotypes/source.tsv",
            },
            column_mappings: {
              SNP: "SNP",
              CHR: "CHR",
              BP: "BP",
              A1: "A1",
              A2: "A2",
              BETA: "BETA",
              P: "P",
            },
            phenotype_config: {
              target_population: {
                binary_traits: ["case"],
                quantitative_traits: ["height"],
              },
              source_population: {
                binary_traits: ["case"],
                quantitative_traits: ["height"],
              },
            },
          }
        } else if (isPrscsx(toolId)) {
          const base = buildDefaultPrscsxConfig(toolId)
          next[toolId] = {
            ...base,
            populations: [
              {
                name: "BasePop",
                type: "base",
                sumstats_path: "data/base_sumstats.txt",
                genotype_path: "data/genotypes/base",
                phenotype_path: "data/phenotypes/base.tsv",
                covariate_path: "",
              },
              {
                name: "TargetPop",
                type: "target",
                sumstats_path: "data/target_sumstats.txt",
                genotype_path: "data/genotypes/target",
                phenotype_path: "data/phenotypes/target.tsv",
                covariate_path: "",
              },
            ],
            column_mappings: {
              by_population: {
                BasePop: {
                  SNP: "SNP",
                  A1: "A1",
                  A2: "A2",
                  BETA: "BETA",
                  P: "P",
                },
                TargetPop: {
                  SNP: "SNP",
                  A1: "A1",
                  A2: "A2",
                  BETA: "BETA",
                  P: "P",
                },
              },
            },
            phenotype_config: {
              by_population: {
                BasePop: {
                  binary_traits: ["case"],
                  quantitative_traits: ["height"],
                },
                TargetPop: {
                  binary_traits: ["case"],
                  quantitative_traits: ["height"],
                },
              },
              covariate_id_mapping: { fid: "FID", iid: "IID" },
            },
          }
        } else if (isBridgeprs(toolId)) {
          const base = buildDefaultBridgeprsConfig(toolId)
          next[toolId] = {
            ...base,
            pop1: {
              name: "TargetPop",
              sumstats_path: "data/target_sumstats.txt",
              genotype_path: "data/genotypes/target",
              phenotype_path: "data/phenotypes/target.tsv",
            },
            pop2: {
              name: "BasePop",
              sumstats_path: "data/base_sumstats.txt",
              genotype_path: "data/genotypes/base",
              phenotype_path: "data/phenotypes/base.tsv",
            },
            column_mappings: {
              CHR: "CHR",
              ID: "ID",
              PS: "PS",
              A1: "A1",
              REF: "REF",
              BETA: "BETA",
              SE: "SE",
              P: "P",
              N: "N",
            },
            phenotype_config: {
              pop1: {
                binary_traits: ["case"],
                quantitative_traits: ["height"],
              },
              pop2: {
                binary_traits: ["case"],
                quantitative_traits: ["height"],
              },
            },
          }
        }
      })
      return next
    })

    // Prefill PRScsx processing state
    setProcessingConfigs((prev) => {
      const next = { ...prev }
      normalizedTools.forEach((toolId) => {
        if (!isPrscsx(toolId)) return
        const pre = (configs[toolId] ||
          buildDefaultPrscsxConfig(toolId)) as PrscsxPreProcessingConfig
        const popNames = pre.populations?.map((p) => p.name) || [
          "BasePop",
          "TargetPop",
        ]
        const nMap = popNames.reduce(
          (acc, name) => ({ ...acc, [name]: "100000" }),
          {} as Record<string, string>
        )
        next[toolId] = {
          binary: {
            runPopulation: "TargetPop",
            chrom: "22",
            phi: "1e-2",
            phenoColumn: "case",
            nGwas: nMap,
          },
          quantitative: {
            runPopulation: "TargetPop",
            chrom: "22",
            phi: "1e-2",
            phenoColumn: "height",
            nGwas: nMap,
          },
        }
      })
      return next
    })
  }

  const prefillTransitional = () => {
    // Transitional: missing some mappings and nGwas to simulate validation failures
    setConfigs((prev) => {
      const next = { ...prev }
      normalizedTools.forEach((toolId) => {
        if (isPrsice(toolId)) {
          const base = buildDefaultPrsiceConfig(toolId)
          next[toolId] = {
            ...base,
            target_population: {
              name: "TargetPop",
              sumstats_path: "data/target_sumstats.txt",
              genotype_path: "",
              phenotype_path: "",
            },
            source_population: {
              name: "SourcePop",
              sumstats_path: "",
              genotype_path: "",
              phenotype_path: "",
            },
            column_mappings: { SNP: "SNP", CHR: "CHR" }, // intentionally partial
          }
        } else if (isPrscsx(toolId)) {
          const base = buildDefaultPrscsxConfig(toolId)
          next[toolId] = {
            ...base,
            populations: [
              {
                name: "BasePop",
                type: "base",
                sumstats_path: "data/base_sumstats.txt",
                genotype_path: "",
                phenotype_path: "",
                covariate_path: "",
              },
              {
                name: "TargetPop",
                type: "target",
                sumstats_path: "data/target_sumstats.txt",
                genotype_path: "",
                phenotype_path: "",
                covariate_path: "",
              },
            ],
            column_mappings: {
              by_population: { TargetPop: { SNP: "SNP" } as any },
            },
          }
        } else if (isBridgeprs(toolId)) {
          const base = buildDefaultBridgeprsConfig(toolId)
          next[toolId] = {
            ...base,
            pop1: {
              name: "TargetPop",
              sumstats_path: "data/target_sumstats.txt",
              genotype_path: "",
              phenotype_path: "",
            },
            pop2: {
              name: "BasePop",
              sumstats_path: "",
              genotype_path: "",
              phenotype_path: "",
            },
            column_mappings: { CHR: "CHR", ID: "ID" },
          }
        }
      })
      return next
    })

    setProcessingConfigs((prev) => {
      const next = { ...prev }
      normalizedTools.forEach((toolId) => {
        if (!isPrscsx(toolId)) return
        next[toolId] = {
          binary: {
            runPopulation: "",
            chrom: "",
            phi: "",
            phenoColumn: "",
            nGwas: {},
          },
          quantitative: {
            runPopulation: "",
            chrom: "",
            phi: "",
            phenoColumn: "",
            nGwas: {},
          },
        }
      })
      return next
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
        .filter((population) =>
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
          errors.push(
            `PRScsx ${label}: Select a population to run the calculation`
          )
        } else if (!eligibleNames.includes(state.runPopulation)) {
          errors.push(
            `PRScsx ${label}: ${state.runPopulation} is missing sumstats, genotype, or phenotype paths`
          )
        }

        const traitKey =
          key === "binary" ? "binary_traits" : "quantitative_traits"
        const traits =
          preProcessing.phenotype_config.by_population[
            state.runPopulation || ""
          ]?.[traitKey] || []

        if (state.runPopulation) {
          if (traits.length === 0) {
            errors.push(
              `PRScsx ${label}: No ${key === "binary" ? "binary" : "quantitative"} traits configured for ${state.runPopulation}`
            )
          } else if (
            !state.phenoColumn ||
            !traits.includes(state.phenoColumn)
          ) {
            errors.push(
              `PRScsx ${label}: Choose a phenotype column for ${state.runPopulation}`
            )
          }
        }

        populations.forEach((population) => {
          const value = state.nGwas[population.name]?.trim()
          if (!value) {
            errors.push(`PRScsx ${label}: Provide nGWAS for ${population.name}`)
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

  // SDPRX: processing validation helper
  const getSdprxProcessingErrors = React.useCallback(
    (
      preProcessing: SdprxPreProcessingConfig,
      processingState: SdprxProcessingState | undefined,
      mode: EvaluationType
    ): string[] => {
      const errors: string[] = []
      if (!processingState) {
        errors.push("SDPRX: Configure processing options")
        return errors
      }

      const pop1Name = (preProcessing?.pop1?.name || "").trim()
      const pop2Name = (preProcessing?.pop2?.name || "").trim()

      const hasPop1Paths = Boolean(
        preProcessing?.pop1?.sumstats_path &&
          preProcessing?.pop1?.genotype_path &&
          preProcessing?.pop1?.phenotype_path
      )
      const hasPop2Paths = Boolean(
        preProcessing?.pop2?.sumstats_path &&
          preProcessing?.pop2?.genotype_path &&
          preProcessing?.pop2?.phenotype_path
      )

      if (!pop1Name) {
        errors.push("SDPRX: Provide a name for Population 1")
      }
      if (!pop2Name) {
        errors.push("SDPRX: Provide a name for Population 2")
      }
      if (!hasPop1Paths) {
        errors.push(
          `SDPRX: ${(pop1Name || "Population 1")} is missing sumstats, genotype, or phenotype paths`
        )
      }
      if (!hasPop2Paths) {
        errors.push(
          `SDPRX: ${(pop2Name || "Population 2")} is missing sumstats, genotype, or phenotype paths`
        )
      }

      const requiredModes: Array<keyof SdprxProcessingState> = []
      if (mode === "binary" || mode === "both") requiredModes.push("binary")
      if (mode === "quantitative" || mode === "both")
        requiredModes.push("quantitative")

      requiredModes.forEach((key) => {
        const state = processingState[key]
        const label = key === "binary" ? "Binary" : "Quantitative"

        const n1 = (state.n1 || "").trim()
        const n2 = (state.n2 || "").trim()
        if (!n1) {
          errors.push(
            `SDPRX ${label}: Provide N1 (${pop1Name || "Population 1"} sample size)`
          )
        } else if (!/^\d+$/.test(n1)) {
          errors.push(`SDPRX ${label}: N1 must be a positive integer`)
        }
        if (!n2) {
          errors.push(
            `SDPRX ${label}: Provide N2 (${pop2Name || "Population 2"} sample size)`
          )
        } else if (!/^\d+$/.test(n2)) {
          errors.push(`SDPRX ${label}: N2 must be a positive integer`)
        }

        const chrom = (state.chrom || "").trim()
        if (!chrom) {
          errors.push(`SDPRX ${label}: Provide a chromosome value`)
        } else {
          const c = parseInt(chrom, 10)
          if (!Number.isInteger(c) || c < 1 || c > 22) {
            errors.push(
              `SDPRX ${label}: Chromosome must be an integer between 1 and 22`
            )
          }
        }

        const rho = (state.rho || "").trim()
        if (!rho) {
          errors.push(`SDPRX ${label}: Provide a rho value`)
        } else if (Number.isNaN(Number(rho))) {
          errors.push(`SDPRX ${label}: Rho must be numeric`)
        }

        const et = preProcessing.options?.evaluation_type || mode
        const pop1Traits = preProcessing.phenotype_config?.pop1
        const pop2Traits = preProcessing.phenotype_config?.pop2
        if (et === "binary") {
          const p1Has = Array.isArray(pop1Traits?.binary_traits)
            ? pop1Traits!.binary_traits.length > 0
            : false
          const p2Has = Array.isArray(pop2Traits?.binary_traits)
            ? pop2Traits!.binary_traits.length > 0
            : false
          if (!p1Has) {
            errors.push(
              `SDPRX Binary: Select at least one binary trait for ${pop1Name || "Population 1"}`
            )
          }
          if (!p2Has) {
            errors.push(
              `SDPRX Binary: Select at least one binary trait for ${pop2Name || "Population 2"}`
            )
          }
        } else if (et === "quantitative") {
          const p1Has = Array.isArray(pop1Traits?.quantitative_traits)
            ? pop1Traits!.quantitative_traits.length > 0
            : false
          const p2Has = Array.isArray(pop2Traits?.quantitative_traits)
            ? pop2Traits!.quantitative_traits.length > 0
            : false
          if (!p1Has) {
            errors.push(
              `SDPRX Quantitative: Select at least one quantitative trait for ${pop1Name || "Population 1"}`
            )
          }
          if (!p2Has) {
            errors.push(
              `SDPRX Quantitative: Select at least one quantitative trait for ${pop2Name || "Population 2"}`
            )
          }
        } else if (et === "both" && key === "binary") {
          const p1HasBinary = Array.isArray(pop1Traits?.binary_traits)
            ? pop1Traits!.binary_traits.length > 0
            : false
          const p1HasQuant = Array.isArray(pop1Traits?.quantitative_traits)
            ? pop1Traits!.quantitative_traits.length > 0
            : false
          const p2HasBinary = Array.isArray(pop2Traits?.binary_traits)
            ? pop2Traits!.binary_traits.length > 0
            : false
          const p2HasQuant = Array.isArray(pop2Traits?.quantitative_traits)
            ? pop2Traits!.quantitative_traits.length > 0
            : false

          if (!p1HasBinary) {
            errors.push(
              `SDPRX Both: Select at least one binary trait for ${pop1Name || "Population 1"}`
            )
          }
          if (!p1HasQuant) {
            errors.push(
              `SDPRX Both: Select at least one quantitative trait for ${pop1Name || "Population 1"}`
            )
          }
          if (!p2HasBinary) {
            errors.push(
              `SDPRX Both: Select at least one binary trait for ${pop2Name || "Population 2"}`
            )
          }
          if (!p2HasQuant) {
            errors.push(
              `SDPRX Both: Select at least one quantitative trait for ${pop2Name || "Population 2"}`
            )
          }
        }
      })

      // Removed: output_dir requirement per specification
      return errors
    },
    []
  )

  // BridgePRS: processing validation helper
  const getBridgeprsProcessingErrors = React.useCallback(
    (
      preProcessing: BridgeprsPreProcessingConfig,
      processingState: BridgeprsProcessingState | undefined,
      mode: EvaluationType
    ): string[] => {
      const errors: string[] = []
      if (!processingState) {
        errors.push("BridgePRS: Configure processing options")
        return errors
      }

      const requiredModes: Array<keyof BridgeprsProcessingState> = []
      if (mode === "binary" || mode === "both") requiredModes.push("binary")
      if (mode === "quantitative" || mode === "both")
        requiredModes.push("quantitative")

      requiredModes.forEach((key) => {
        const state = processingState[key]
        const label = key === "binary" ? "Binary" : "Quantitative"
        const baseName = preProcessing?.pop2?.name || "Population 2"
        const targetName = preProcessing?.pop1?.name || "Population 1"

        const phenotype = (state.bridgeprs_phenotype || "").trim()
        const fst = (state.fst || "").trim()
        const nBase = (state.sumstats_size_EUR || "").trim()
        const nTarget = (state.sumstats_size_AFR || "").trim()

        if (!phenotype) {
          errors.push(`BridgePRS ${label}: Select a phenotype column`)
        }
        if (!fst) {
          errors.push(`BridgePRS ${label}: Provide FST`)
        } else if (isNaN(Number(fst))) {
          errors.push(`BridgePRS ${label}: FST must be numeric`)
        }
        if (!nBase) {
          errors.push(`BridgePRS ${label}: Provide sumstats size (${baseName})`)
        } else if (isNaN(Number(nBase))) {
          errors.push(`BridgePRS ${label}: Sumstats size (${baseName}) must be numeric`)
        }
        if (!nTarget) {
          errors.push(`BridgePRS ${label}: Provide sumstats size (${targetName})`)
        } else if (isNaN(Number(nTarget))) {
          errors.push(
            `BridgePRS ${label}: Sumstats size (${targetName}) must be numeric`
          )
        }

        // If genotype type is merged, require a non-empty genotype prefix (basename)
        const genotypeType = preProcessing?.genotype_config?.file_type || "merged"
        if (genotypeType === "merged") {
          const basename = (state as any)?.bridgeprs_genotype_file
            ? String((state as any).bridgeprs_genotype_file).trim()
            : ""
          if (!basename) {
            errors.push(
              `BridgePRS ${label}: Provide genotype prefix (basename) for merged runs`
            )
          }
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

          const targetBinaryNeedsClear =
            !allowBinary && target.binary_traits.length > 0
          const targetQuantNeedsClear =
            !allowQuant && target.quantitative_traits.length > 0
          const sourceBinaryNeedsClear =
            !allowBinary && source.binary_traits.length > 0
          const sourceQuantNeedsClear =
            !allowQuant && source.quantitative_traits.length > 0

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
                quantitative_traits: allowQuant
                  ? target.quantitative_traits
                  : [],
              },
              source_population: {
                binary_traits: allowBinary ? source.binary_traits : [],
                quantitative_traits: allowQuant
                  ? source.quantitative_traits
                  : [],
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

        if (isBridgeprs(toolId)) {
          const bridgeConfig = cfg as BridgeprsPreProcessingConfig
          const pop1 = bridgeConfig.phenotype_config?.pop1 || {
            binary_traits: [],
            quantitative_traits: [],
          }
          const pop2 = bridgeConfig.phenotype_config?.pop2 || {
            binary_traits: [],
            quantitative_traits: [],
          }

          const optionsNeedUpdate =
            bridgeConfig.options.evaluation_type !== evaluationType ||
            bridgeConfig.options.process_binary_phenotypes !== allowBinary ||
            bridgeConfig.options.process_quantitative_phenotypes !== allowQuant

          const pop1BinaryNeedsClear =
            !allowBinary && pop1.binary_traits.length > 0
          const pop1QuantNeedsClear =
            !allowQuant && pop1.quantitative_traits.length > 0
          const pop2BinaryNeedsClear =
            !allowBinary && pop2.binary_traits.length > 0
          const pop2QuantNeedsClear =
            !allowQuant && pop2.quantitative_traits.length > 0

          if (
            !optionsNeedUpdate &&
            !pop1BinaryNeedsClear &&
            !pop1QuantNeedsClear &&
            !pop2BinaryNeedsClear &&
            !pop2QuantNeedsClear
          ) {
            return [toolId, cfg] as const
          }

          changed = true
          const nextConfig: BridgeprsPreProcessingConfig = {
            ...bridgeConfig,
            phenotype_config: {
              pop1: {
                binary_traits: allowBinary ? pop1.binary_traits : [],
                quantitative_traits: allowQuant ? pop1.quantitative_traits : [],
              },
              pop2: {
                binary_traits: allowBinary ? pop2.binary_traits : [],
                quantitative_traits: allowQuant ? pop2.quantitative_traits : [],
              },
            },
            options: {
              ...bridgeConfig.options,
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
          const sanitizedByPopulation: Record<
            string,
            PrsicePhenotypePopulationConfig
          > = {}

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
      const hasColumns = PRSICE_REQUIRED_COLUMNS.every((column) =>
        Boolean(prsiceConfig.column_mappings[column])
      )

      const hasPaths = Boolean(
        prsiceConfig.target_population.sumstats_path &&
          prsiceConfig.target_population.genotype_path &&
          prsiceConfig.target_population.phenotype_path &&
          prsiceConfig.source_population.sumstats_path &&
          prsiceConfig.source_population.genotype_path &&
          prsiceConfig.source_population.phenotype_path
      )

      const et = prsiceConfig.options?.evaluation_type || evaluationType
      const targetTraits = prsiceConfig.phenotype_config.target_population
      const sourceTraits = prsiceConfig.phenotype_config.source_population

      let hasTraits = true
      if (hasPaths) {
        const requiresBinary = et === "binary" || et === "both"
        const requiresQuant = et === "quantitative" || et === "both"

        if (
          requiresBinary &&
          (targetTraits.binary_traits.length === 0 ||
            sourceTraits.binary_traits.length === 0)
        ) {
          hasTraits = false
        }

        if (
          requiresQuant &&
          (targetTraits.quantitative_traits.length === 0 ||
            sourceTraits.quantitative_traits.length === 0)
        ) {
          hasTraits = false
        }
      }

      return hasColumns && hasPaths && hasTraits
    }

    if (isPrscsx(toolId)) {
      const prscsxConfig = config as PrscsxPreProcessingConfig
      const populations = prscsxConfig.populations ?? []
      if (populations.length === 0) return false
      const hasMappings = populations.every((population) =>
        PRSCsx_REQUIRED_COLUMNS.every((column) =>
          Boolean(
            prscsxConfig.column_mappings.by_population[population.name]?.[
              column
            ]
          )
        )
      )
      if (!hasMappings) return false

      const processingState = processingConfigs[toolId]
      return (
        getPrscsxProcessingErrors(prscsxConfig, processingState, evaluationType)
          .length === 0
      )
    }

    if (isBridgeprs(toolId)) {
      const bridgeConfig = config as BridgeprsPreProcessingConfig
      const hasPopulationData = Boolean(
        bridgeConfig.pop1?.name &&
          bridgeConfig.pop1.sumstats_path &&
          bridgeConfig.pop1.phenotype_path &&
          bridgeConfig.pop1.genotype_path &&
          bridgeConfig.pop2?.name &&
          bridgeConfig.pop2.sumstats_path &&
          bridgeConfig.pop2.phenotype_path &&
          bridgeConfig.pop2.genotype_path
      )

      const hasPaths = Boolean(
        bridgeConfig.genotype_path?.trim() && bridgeConfig.output_dir?.trim()
      )

      const missingColumns = BRIDGEPRS_REQUIRED_COLUMNS.filter((column) => {
        const value = bridgeConfig.column_mappings?.[column]
        return !value || value.trim() === ""
      })

      const hasPatterns = [
        bridgeConfig.genotype_config?.file_patterns?.bed,
        bridgeConfig.genotype_config?.file_patterns?.bim,
        bridgeConfig.genotype_config?.file_patterns?.fam,
      ].every((value) => Boolean(value && value.trim()))

      const hasOptions = Boolean(bridgeConfig.options?.evaluation_type)

      // Require a valid population reference (pop1 or pop2)
      const populationReference =
        bridgeConfig.genotype_config?.population_reference
      const hasValidPopulationRef =
        populationReference === "pop1" || populationReference === "pop2"

      // Phenotype traits must be selected according to evaluation type
      const et = bridgeConfig.options?.evaluation_type
      const pop1 = bridgeConfig.phenotype_config?.pop1
      const pop2 = bridgeConfig.phenotype_config?.pop2
      let hasTraits = false
      if (et === "binary") {
        const p1 = Array.isArray(pop1?.binary_traits) ? pop1!.binary_traits : []
        const p2 = Array.isArray(pop2?.binary_traits) ? pop2!.binary_traits : []
        hasTraits = p1.length > 0 && p2.length > 0
      } else if (et === "quantitative") {
        const p1 = Array.isArray(pop1?.quantitative_traits)
          ? pop1!.quantitative_traits
          : []
        const p2 = Array.isArray(pop2?.quantitative_traits)
          ? pop2!.quantitative_traits
          : []
        hasTraits = p1.length > 0 && p2.length > 0
      } else if (et === "both") {
        const p1HasBinary =
          Array.isArray(pop1?.binary_traits) && pop1!.binary_traits.length > 0
        const p1HasQuant =
          Array.isArray(pop1?.quantitative_traits) &&
          pop1!.quantitative_traits.length > 0
        const p2HasBinary =
          Array.isArray(pop2?.binary_traits) && pop2!.binary_traits.length > 0
        const p2HasQuant =
          Array.isArray(pop2?.quantitative_traits) &&
          pop2!.quantitative_traits.length > 0
        // When evaluation_type is both, require at least one binary AND one quantitative trait in each population
        hasTraits = p1HasBinary && p1HasQuant && p2HasBinary && p2HasQuant
      } else {
        hasTraits = false
      }

      const processingErrors = getBridgeprsProcessingErrors(
        bridgeConfig,
        bridgeprsProcessingConfigs[toolId] as
          | BridgeprsProcessingState
          | undefined,
        bridgeConfig.options?.evaluation_type || evaluationType
      )

      return (
        hasPopulationData &&
        hasPaths &&
        missingColumns.length === 0 &&
        hasPatterns &&
        hasOptions &&
        hasValidPopulationRef &&
        hasTraits &&
        processingErrors.length === 0
      )
    }

    // SDPRX completion check
    if (isSdprx(toolId)) {
      const sdprxConfig = config as SdprxPreProcessingConfig

      const hasPopulationData = Boolean(
        sdprxConfig.pop1?.name &&
          sdprxConfig.pop1.sumstats_path &&
          sdprxConfig.pop1.phenotype_path &&
          sdprxConfig.pop1.genotype_path &&
          sdprxConfig.pop2?.name &&
          sdprxConfig.pop2.sumstats_path &&
          sdprxConfig.pop2.phenotype_path &&
          sdprxConfig.pop2.genotype_path
      )

      const missingColumns = SDPRX_REQUIRED_COLUMNS.filter((column) => {
        const value = sdprxConfig.column_mappings?.[column]
        return !value || value.trim() === ""
      })

      const hasPatterns = [
        sdprxConfig.genotype_config?.file_patterns?.bed,
        sdprxConfig.genotype_config?.file_patterns?.bim,
        sdprxConfig.genotype_config?.file_patterns?.fam,
      ].every((value) => Boolean(value && value.trim()))

      const hasOptions = Boolean(sdprxConfig.options?.evaluation_type)

      const processingErrors = getSdprxProcessingErrors(
        sdprxConfig,
        sdprxProcessingConfigs[toolId] as SdprxProcessingState | undefined,
        sdprxConfig.options?.evaluation_type || evaluationType
      )

      return (
        hasPopulationData &&
        missingColumns.length === 0 &&
        hasPatterns &&
        hasOptions &&
        processingErrors.length === 0
      )
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
      const bridgeConfig = config as BridgeprsPreProcessingConfig
      const pop1Name = bridgeConfig.pop1?.name || "Population 1"
      const pop2Name = bridgeConfig.pop2?.name || "Population 2"

      if (!bridgeConfig.pop1?.sumstats_path) {
        errors.push(`BridgePRS: Missing sumstats path (${pop1Name})`)
      }
      if (!bridgeConfig.pop1?.phenotype_path) {
        errors.push(`BridgePRS: Missing phenotype path (${pop1Name})`)
      }
      if (!bridgeConfig.pop1?.genotype_path) {
        errors.push(`BridgePRS: Missing genotype path (${pop1Name})`)
      }
      if (!bridgeConfig.pop2?.sumstats_path) {
        errors.push(`BridgePRS: Missing sumstats path (${pop2Name})`)
      }
      if (!bridgeConfig.pop2?.phenotype_path) {
        errors.push(`BridgePRS: Missing phenotype path (${pop2Name})`)
      }
      if (!bridgeConfig.pop2?.genotype_path) {
        errors.push(`BridgePRS: Missing genotype path (${pop2Name})`)
      }

      if (!bridgeConfig.genotype_path?.trim()) {
        errors.push("BridgePRS: Specify a genotype directory")
      }

      if (!bridgeConfig.output_dir?.trim()) {
        errors.push("BridgePRS: Specify an output directory")
      }

      const missingColumns = BRIDGEPRS_REQUIRED_COLUMNS.filter((column) => {
        const value = bridgeConfig.column_mappings?.[column]
        return !value || value.trim() === ""
      })
      if (missingColumns.length > 0) {
        errors.push(
          `BridgePRS: Missing column mappings for ${missingColumns.join(", ")}`
        )
      }

      const patterns = bridgeConfig.genotype_config?.file_patterns || {}
      if (
        !patterns.bed?.trim() ||
        !patterns.bim?.trim() ||
        !patterns.fam?.trim()
      ) {
        errors.push(
          "BridgePRS: Provide file patterns for BED, BIM, and FAM files"
        )
      }

      const populationReference =
        bridgeConfig.genotype_config?.population_reference
      if (populationReference !== "pop1" && populationReference !== "pop2") {
        errors.push("BridgePRS: Population reference must be one of the configured populations")
      }

      if (!bridgeConfig.options?.evaluation_type) {
        errors.push(
          "BridgePRS: Select an evaluation type in processing options"
        )
      }

      // Phenotype selection validation based on evaluation type
      const et = bridgeConfig.options?.evaluation_type
      const pop1 = bridgeConfig.phenotype_config?.pop1
      const pop2 = bridgeConfig.phenotype_config?.pop2
      if (et === "binary") {
        const p1 = Array.isArray(pop1?.binary_traits) ? pop1!.binary_traits : []
        const p2 = Array.isArray(pop2?.binary_traits) ? pop2!.binary_traits : []
        if (p1.length === 0) {
          errors.push(`BridgePRS: Select at least one binary trait for ${pop1Name}`)
        }
        if (p2.length === 0) {
          errors.push(`BridgePRS: Select at least one binary trait for ${pop2Name}`)
        }
      } else if (et === "quantitative") {
        const p1 = Array.isArray(pop1?.quantitative_traits)
          ? pop1!.quantitative_traits
          : []
        const p2 = Array.isArray(pop2?.quantitative_traits)
          ? pop2!.quantitative_traits
          : []
        if (p1.length === 0) {
          errors.push(
            `BridgePRS: Select at least one quantitative trait for ${pop1Name}`
          )
        }
        if (p2.length === 0) {
          errors.push(
            `BridgePRS: Select at least one quantitative trait for ${pop2Name}`
          )
        }
      } else if (et === "both") {
        const p1HasBinary = Array.isArray(pop1?.binary_traits)
          ? pop1!.binary_traits.length > 0
          : false
        const p1HasQuant = Array.isArray(pop1?.quantitative_traits)
          ? pop1!.quantitative_traits.length > 0
          : false
        const p2HasBinary = Array.isArray(pop2?.binary_traits)
          ? pop2!.binary_traits.length > 0
          : false
        const p2HasQuant = Array.isArray(pop2?.quantitative_traits)
          ? pop2!.quantitative_traits.length > 0
          : false
        if (!p1HasBinary) {
          errors.push(`BridgePRS: Select at least one binary trait for ${pop1Name}`)
        }
        if (!p1HasQuant) {
          errors.push(
            `BridgePRS: Select at least one quantitative trait for ${pop1Name}`
          )
        }
        if (!p2HasBinary) {
          errors.push(`BridgePRS: Select at least one binary trait for ${pop2Name}`)
        }
        if (!p2HasQuant) {
          errors.push(
            `BridgePRS: Select at least one quantitative trait for ${pop2Name}`
          )
        }
      }

      // Processing options validation must also be satisfied
      const processingErrors = getBridgeprsProcessingErrors(
        bridgeConfig,
        bridgeprsProcessingConfigs[toolId] as
          | BridgeprsProcessingState
          | undefined,
        bridgeConfig.options?.evaluation_type || evaluationType
      )
      errors.push(...processingErrors)

      return { isValid: errors.length === 0, errors }
    }

    if (isPrsice(toolId)) {
      const prsiceConfig = config as PrsicePreProcessingConfig
      const targetName = prsiceConfig.target_population.name || "Population 1"
      const sourceName = prsiceConfig.source_population.name || "Population 2"

      if (!prsiceConfig.target_population.sumstats_path) {
        errors.push(`PRSice: Missing sumstats path (${targetName})`)
      }
      if (!prsiceConfig.target_population.genotype_path) {
        errors.push(`PRSice: Missing genotype path (${targetName})`)
      }
      if (!prsiceConfig.target_population.phenotype_path) {
        errors.push(`PRSice: Missing phenotype path (${targetName})`)
      }
      if (!prsiceConfig.source_population.sumstats_path) {
        errors.push(`PRSice: Missing sumstats path (${sourceName})`)
      }
      if (!prsiceConfig.source_population.genotype_path) {
        errors.push(`PRSice: Missing genotype path (${sourceName})`)
      }
      if (!prsiceConfig.source_population.phenotype_path) {
        errors.push(`PRSice: Missing phenotype path (${sourceName})`)
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

      const requiresBinary =
        evaluationType === "binary" || evaluationType === "both"
      const requiresQuant =
        evaluationType === "quantitative" || evaluationType === "both"
      const targetHasPhenotype = Boolean(
        prsiceConfig.target_population.phenotype_path
      )
      const sourceHasPhenotype = Boolean(
        prsiceConfig.source_population.phenotype_path
      )

      if (requiresBinary && targetHasPhenotype && targetTraits.binary_traits.length === 0) {
        errors.push(`PRSice: Select at least one binary trait for ${targetName}`)
      }
      if (requiresBinary && sourceHasPhenotype && sourceTraits.binary_traits.length === 0) {
        errors.push(`PRSice: Select at least one binary trait for ${sourceName}`)
      }

      if (requiresQuant && targetHasPhenotype && targetTraits.quantitative_traits.length === 0) {
        errors.push(`PRSice: Select at least one quantitative trait for ${targetName}`)
      }
      if (requiresQuant && sourceHasPhenotype && sourceTraits.quantitative_traits.length === 0) {
        errors.push(`PRSice: Select at least one quantitative trait for ${sourceName}`)
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
        const traits = prscsxConfig.phenotype_config.by_population[
          population.name
        ] || {
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
      const requiresCovariates = populations.some((population) =>
        Boolean(population.covariate_path)
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

    // SDPRX validation
    if (isSdprx(toolId)) {
      const sdprxConfig = config as SdprxPreProcessingConfig

      // Ensure population names are provided (aligns with completion check)
      if (!sdprxConfig.pop1?.name || !sdprxConfig.pop1.name.trim()) {
        errors.push("SDPRX: Missing Pop1 name")
      }
      if (!sdprxConfig.pop2?.name || !sdprxConfig.pop2.name.trim()) {
        errors.push("SDPRX: Missing Pop2 name")
      }

      if (!sdprxConfig.pop1?.sumstats_path) {
        errors.push("SDPRX: Missing Pop1 sumstats path")
      }
      if (!sdprxConfig.pop1?.phenotype_path) {
        errors.push("SDPRX: Missing Pop1 phenotype path")
      }
      if (!sdprxConfig.pop1?.genotype_path) {
        errors.push("SDPRX: Missing Pop1 genotype path")
      }
      if (!sdprxConfig.pop2?.sumstats_path) {
        errors.push("SDPRX: Missing Pop2 sumstats path")
      }
      if (!sdprxConfig.pop2?.phenotype_path) {
        errors.push("SDPRX: Missing Pop2 phenotype path")
      }
      if (!sdprxConfig.pop2?.genotype_path) {
        errors.push("SDPRX: Missing Pop2 genotype path")
      }

      // Top-level genotype_path is no longer required; rely on per-population genotype paths

      // Removed: output_dir validation per specification

      const missingColumns = SDPRX_REQUIRED_COLUMNS.filter((column) => {
        const value = sdprxConfig.column_mappings?.[column]
        return !value || value.trim() === ""
      })
      if (missingColumns.length > 0) {
        errors.push(
          `SDPRX: Missing column mappings for ${missingColumns.join(", ")}`
        )
      }

      const patterns = sdprxConfig.genotype_config?.file_patterns || {}
      if (
        !patterns.bed?.trim() ||
        !patterns.bim?.trim() ||
        !patterns.fam?.trim()
      ) {
        errors.push("SDPRX: Provide file patterns for BED, BIM, and FAM files")
      }

      const populationReference =
        sdprxConfig.genotype_config?.population_reference
      if (!populationReference) {
        errors.push("SDPRX: Select a population reference (pop1 or pop2)")
      } else if (
        populationReference !== "pop1" &&
        populationReference !== "pop2"
      ) {
        errors.push(
          "SDPRX: Population reference must be pop1 or pop2 (Target or Base Population)"
        )
      }

      if (!sdprxConfig.options?.evaluation_type) {
        errors.push("SDPRX: Select an evaluation type in processing options")
      }

      // Phenotype selection validation based on evaluation type
      const et = sdprxConfig.options?.evaluation_type || evaluationType
      const pop1 = sdprxConfig.phenotype_config?.pop1
      const pop2 = sdprxConfig.phenotype_config?.pop2
      if (et === "binary") {
        const p1 = Array.isArray(pop1?.binary_traits) ? pop1!.binary_traits : []
        const p2 = Array.isArray(pop2?.binary_traits) ? pop2!.binary_traits : []
        if (p1.length === 0) {
          errors.push("SDPRX: Select at least one binary trait for pop1")
        }
        if (p2.length === 0) {
          errors.push("SDPRX: Select at least one binary trait for pop2")
        }
      } else if (et === "quantitative") {
        const p1 = Array.isArray(pop1?.quantitative_traits)
          ? pop1!.quantitative_traits
          : []
        const p2 = Array.isArray(pop2?.quantitative_traits)
          ? pop2!.quantitative_traits
          : []
        if (p1.length === 0) {
          errors.push("SDPRX: Select at least one quantitative trait for pop1")
        }
        if (p2.length === 0) {
          errors.push("SDPRX: Select at least one quantitative trait for pop2")
        }
      } else if (et === "both") {
        const p1HasBinary = Array.isArray(pop1?.binary_traits)
          ? pop1!.binary_traits.length > 0
          : false
        const p1HasQuant = Array.isArray(pop1?.quantitative_traits)
          ? pop1!.quantitative_traits.length > 0
          : false
        const p2HasBinary = Array.isArray(pop2?.binary_traits)
          ? pop2!.binary_traits.length > 0
          : false
        const p2HasQuant = Array.isArray(pop2?.quantitative_traits)
          ? pop2!.quantitative_traits.length > 0
          : false
        if (!p1HasBinary) {
          errors.push("SDPRX: Select at least one binary trait for pop1")
        }
        if (!p1HasQuant) {
          errors.push("SDPRX: Select at least one quantitative trait for pop1")
        }
        if (!p2HasBinary) {
          errors.push("SDPRX: Select at least one binary trait for pop2")
        }
        if (!p2HasQuant) {
          errors.push("SDPRX: Select at least one quantitative trait for pop2")
        }
      }

      // Processing state validation
      const sdprxProcessing =
        (sdprxProcessingConfigs[toolId] as SdprxProcessingState) || undefined
      const processingErrors = getSdprxProcessingErrors(
        sdprxConfig,
        sdprxProcessing,
        et
      )
      errors.push(...processingErrors)

      return { isValid: errors.length === 0, errors }
    }

    return { isValid: errors.length === 0, errors }
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
        const config = configs[toolId]
        if (!config) return acc
        if (isBridgeprs(toolId)) {
          acc[toolId] = sanitizeBridgeprsConfig(
            config as BridgeprsPreProcessingConfig
          )
        } else if (isPrsice(toolId)) {
          acc[toolId] = sanitizePrsiceConfig(
            config as PrsicePreProcessingConfig
          )
        } else if (isPrscsx(toolId)) {
          acc[toolId] = sanitizePrscsxConfig(
            config as PrscsxPreProcessingConfig
          )
        } else if (isSdprx(toolId)) {
          acc[toolId] = sanitizeSdprxConfig(config as SdprxPreProcessingConfig)
        }
        return acc
      },
      {} as Record<string, ToolPreProcessingConfig>
    )

    const sanitizedForStore = sanitized

    const sanitizedProcessing = normalizedTools.reduce(
      (acc, toolId) => {
        if (isPrscsx(toolId)) {
          const preProcessing = sanitized[toolId] as
            | PrscsxPreProcessingConfig
            | undefined
          const processingState = processingConfigs[toolId]
          if (preProcessing && processingState) {
            const payload = buildPrscsxProcessingPayload(
              preProcessing,
              processingState,
              preProcessing.options.evaluation_type || evaluationType
            )
            if (payload.binary || payload.quantitative) {
              acc[toolId] = payload
            }
          }
        } else if (isPrsice(toolId)) {
          const preProcessing = sanitized[toolId] as
            | PrsicePreProcessingConfig
            | undefined
          if (preProcessing) {
            const payload = buildPrsiceProcessingPayload(
              preProcessing,
              preProcessing.options.evaluation_type || evaluationType
            )
            if (payload.binary || payload.quantitative) {
              acc[toolId] = payload
            }
          }
        } else if (isBridgeprs(toolId)) {
          const preProcessing = sanitized[toolId] as
            | BridgeprsPreProcessingConfig
            | undefined
          const processingState = bridgeprsProcessingConfigs[toolId]
          if (preProcessing && processingState) {
            const payload = buildBridgeprsProcessingPayload(
              preProcessing,
              processingState,
              preProcessing.options.evaluation_type || evaluationType
            )
            if (payload.binary || payload.quantitative) {
              acc[toolId] = payload
            }
          }
        } else if (isSdprx(toolId)) {
          const preProcessing = sanitized[toolId] as
            | SdprxPreProcessingConfig
            | undefined
          const processingState = sdprxProcessingConfigs[toolId]
          if (preProcessing && processingState) {
            const payload = buildSdprxProcessingPayload(
              preProcessing,
              processingState,
              preProcessing.options.evaluation_type || evaluationType
            )
            if (payload.binary || payload.quantitative) {
              acc[toolId] = payload
            }
          }
        }

        return acc
      },
      {} as Record<
        string,
        | PrscsxProcessingPayload
        | BridgeprsProcessingPayload
        | SdprxProcessingPayload
      >
    )

    const requestBody = {
      config: {
        tools_to_run: normalizedTools,
        ...Object.fromEntries(
          normalizedTools.map((toolId) => [
            toolId,
            {
              pre_processing: sanitized[toolId],
              ...(sanitizedProcessing[toolId]
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

  const stepBadge = <Badge variant="outline">Step 5</Badge>
  const allToolsConfigured = normalizedTools.every(isToolComplete)
  const isNextDisabled = normalizedTools.length === 0 || !allToolsConfigured
  const debugErrors = isNextDisabled
    ? normalizedTools
        .flatMap((toolId) => validateConfiguration(toolId).errors)
        .slice(0, 8)
    : []

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
        {isNextDisabled && debugErrors.length > 0 && (
          <div className="mt-3 text-sm text-red-600">
            <p className="font-medium">Resolve the following to enable Next:</p>
            <ul className="mt-1 list-disc pl-5">
              {debugErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  const renderToolConfiguration = (toolId: string) => {
    const config = configs[toolId]

    if (isSdprx(toolId)) {
      return (
        <SdprxToolConfiguration
          key={toolId}
          toolId={toolId}
          config={config as SdprxPreProcessingConfig}
          jobId={jobId}
          onConfigChange={(nextConfig) => setConfigForTool(toolId, nextConfig)}
          stepBadge={stepBadge}
          evaluationType={evaluationType}
          processingConfig={sdprxProcessingConfigs[toolId]}
          onProcessingChange={(updater) =>
            setSdprxProcessingConfigForTool(toolId, updater)
          }
        />
      )
    }

    if (!config) return null

    if (isBridgeprs(toolId)) {
      return (
        <BridgeprsToolConfiguration
          key={toolId}
          toolId={toolId}
          config={config as BridgeprsPreProcessingConfig}
          jobId={jobId}
          onConfigChange={(nextConfig) => setConfigForTool(toolId, nextConfig)}
          stepBadge={stepBadge}
          evaluationType={evaluationType}
          processingConfig={bridgeprsProcessingConfigs[toolId]}
          onProcessingChange={(updater) =>
            setBridgeprsProcessingConfigForTool(toolId, updater)
          }
        />
      )
    }

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
          Configure preprocessing settings and column mappings for each selected
          tool.
        </p>
      </div>

      {/* Debug actions moved to Global Debug Drawer */}

      <div className="rounded-lg border p-4">
        <h4 className="font-medium">Evaluation Type</h4>
        <p className="text-sm text-muted-foreground">
          Applies to all selected tools. Trait selection is enabled only for the
          chosen evaluation type.
        </p>
        <div className="mt-3 flex flex-wrap gap-6">
          {(["both", "binary", "quantitative"] as EvaluationType[]).map(
            (value) => (
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
            )
          )}
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

      {isNextDisabled && debugErrors.length > 0 && (
        <div className="mt-2 text-sm text-red-600">
          <p className="font-medium">
            Cannot continue. Please fix the following:
          </p>
          <ul className="mt-1 list-disc pl-5">
            {debugErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Debug previews moved to Global Debug Drawer */}
    </div>
  )
}
