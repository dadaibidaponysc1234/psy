import type {
  EvaluationType,
  ToolPreProcessingConfig,
  // PRSice
  PrsicePreProcessingConfig,
  PrsicePhenotypePopulationConfig,
  PrsiceProcessingModePayload,
  PrsiceProcessingPayload,
  // PRScsx
  PrscsxPreProcessingConfig,
  PrscsxProcessingState,
  PrscsxProcessingPayload,
  PrscsxColumnKey,
  // BridgePRS
  BridgeprsPreProcessingConfig,
  BridgeprsProcessingState,
  BridgeprsProcessingPayload,
  BridgeprsColumnKey,
  // SDPRX
  SdprxPreProcessingConfig,
  SdprxProcessingState,
  SdprxProcessingPayload,
  XpassPreProcessingConfig,
  XpassProcessingState,
  XpassProcessingPayload,
  XpassColumnKey,
} from "@/components/benchmarking/tool-configuration/types"
import { REFERENCE_PATHS } from "@/lib/config"

// ----- Shared sanitizers (moved from tool-configuration.tsx) -----

const DEFAULT_PROCESSING_OPTIONS = {
  evaluation_type: "both" as EvaluationType,
  process_binary_phenotypes: true,
  process_quantitative_phenotypes: true,
  skip_missing_columns: false,
  overwrite_existing: false,
}

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

const PRSCsx_REQUIRED_COLUMNS: PrscsxColumnKey[] = [
  "SNP",
  "A1",
  "A2",
  "BETA",
  "P",
]

// XPASS required/recognized column keys
// Z is optional; keep it recognized but not required
const XPASS_REQUIRED_COLUMNS: XpassColumnKey[] = ["SNP", "A1", "A2", "N"]
const XPASS_OPTIONAL_COLUMNS: XpassColumnKey[] = ["Z"]
const XPASS_ALL_COLUMNS: XpassColumnKey[] = [
  ...XPASS_REQUIRED_COLUMNS,
  ...XPASS_OPTIONAL_COLUMNS,
]

export const sanitizeChromArray = (input: unknown): number[] => {
  const toNums = (vals: (string | number)[]) =>
    vals
      .map((v) => Number(v))
      .filter(
        (n) => Number.isFinite(n) && Number.isInteger(n) && n >= 1 && n <= 22
      )
  if (Array.isArray(input)) {
    const nums = toNums(input)
    return Array.from(new Set(nums)).sort((a, b) => a - b)
  }
  if (typeof input === "string") {
    const tokens = input
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
    const nums = toNums(tokens)
    return Array.from(new Set(nums)).sort((a, b) => a - b)
  }
  return []
}

export const sanitizeBridgeprsConfig = (
  config: BridgeprsPreProcessingConfig
): BridgeprsPreProcessingConfig => {
  const existingGenotypeConfig = config.genotype_config ?? {
    file_type: "merged" as const,
    population_reference: "pop1" as const,
    file_patterns: { bed: "", bim: "", fam: "" },
  }
  const existingPatterns = existingGenotypeConfig.file_patterns ?? {
    bed: "",
    bim: "",
    fam: "",
  }

  const existingPhenotypeConfig = config.phenotype_config ?? {
    pop1: { binary_traits: [], quantitative_traits: [] },
    pop2: { binary_traits: [], quantitative_traits: [] },
  }
  const pop1 = config.pop1 ?? {
    name: "",
    sumstats_path: "",
    genotype_path: "",
    phenotype_path: "",
  }
  const pop2 = config.pop2 ?? {
    name: "",
    sumstats_path: "",
    genotype_path: "",
    phenotype_path: "",
  }

  const sanitizeTraits = (traits: {
    binary_traits: string[]
    quantitative_traits: string[]
  }) => ({
    binary_traits: traits.binary_traits.filter(Boolean),
    quantitative_traits: traits.quantitative_traits.filter(Boolean),
  })

  const sanitizedColumns = BRIDGEPRS_REQUIRED_COLUMNS.reduce(
    (acc, column) => {
      const value = config.column_mappings?.[column]?.trim()
      if (value) acc[column] = value
      return acc
    },
    {} as Partial<Record<BridgeprsColumnKey, string>>
  )

  const sanitizedOptions = {
    ...DEFAULT_PROCESSING_OPTIONS,
    ...(config.options ?? {}),
  }

  const nextEvaluation = (sanitizedOptions.evaluation_type ||
    "both") as EvaluationType
  sanitizedOptions.evaluation_type = nextEvaluation
  sanitizedOptions.process_binary_phenotypes =
    nextEvaluation === "quantitative"
      ? false
      : Boolean(sanitizedOptions.process_binary_phenotypes)
  sanitizedOptions.process_quantitative_phenotypes =
    nextEvaluation === "binary"
      ? false
      : Boolean(sanitizedOptions.process_quantitative_phenotypes)
  sanitizedOptions.skip_missing_columns = Boolean(
    sanitizedOptions.skip_missing_columns
  )
  sanitizedOptions.overwrite_existing = Boolean(
    sanitizedOptions.overwrite_existing
  )

  return {
    ...config,
    pop1: {
      name: pop1.name?.trim() || "",
      sumstats_path: pop1.sumstats_path?.trim() || "",
      genotype_path: pop1.genotype_path?.trim() || "",
      phenotype_path: pop1.phenotype_path?.trim() || "",
    },
    pop2: {
      name: pop2.name?.trim() || "",
      sumstats_path: pop2.sumstats_path?.trim() || "",
      genotype_path: pop2.genotype_path?.trim() || "",
      phenotype_path: pop2.phenotype_path?.trim() || "",
    },
    genotype_path: config.genotype_path?.trim() || "",
    output_dir: config.output_dir?.trim() || "",
    fixed_N:
      typeof config.fixed_N === "number" && Number.isFinite(config.fixed_N)
        ? config.fixed_N
        : null,
    column_mappings: sanitizedColumns,
    genotype_config: {
      ...existingGenotypeConfig,
      population_reference:
        existingGenotypeConfig.population_reference === "pop2"
          ? "pop2"
          : "pop1",
      file_patterns: {
        bed: existingPatterns.bed?.trim() || "",
        bim: existingPatterns.bim?.trim() || "",
        fam: existingPatterns.fam?.trim() || "",
      },
    },
    phenotype_config: {
      pop1: sanitizeTraits(existingPhenotypeConfig.pop1),
      pop2: sanitizeTraits(existingPhenotypeConfig.pop2),
    },
    options: sanitizedOptions,
  }
}

export const sanitizePrsiceConfig = (
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
      sumstats_strict_single: Boolean(config.options.sumstats_strict_single),
    },
    genotype_config: {
      ...config.genotype_config,
      file_patterns: {
        bed: (config.genotype_config.file_patterns.bed || "").trim(),
        bim: (config.genotype_config.file_patterns.bim || "").trim(),
        fam: (config.genotype_config.file_patterns.fam || "").trim(),
      },
      chrom: sanitizeChromArray(config.genotype_config.chrom),
    },
  }
}

export const sanitizePrscsxConfig = (
  config: PrscsxPreProcessingConfig
): PrscsxPreProcessingConfig => {
  const evaluationType = config.options.evaluation_type || "both"
  const populations = config.populations ?? []

  const filteredTraits = populations.reduce(
    (acc, population) => {
      const traits = config.phenotype_config.by_population[population.name] || {
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
      sumstats_strict_single: Boolean(config.options.sumstats_strict_single),
    },
    genotype_config: {
      ...(config.genotype_config || { file_type: "merged" as const }),
      chrom: sanitizeChromArray(config.genotype_config?.chrom),
    },
  }
}

export const sanitizeSdprxConfig = (
  config: SdprxPreProcessingConfig
): SdprxPreProcessingConfig => {
  const evaluationType = config.options.evaluation_type || "both"

  const sanitizePopulation = (traits: {
    binary_traits: string[]
    quantitative_traits: string[]
  }) => ({
    binary_traits:
      evaluationType === "binary" || evaluationType === "both"
        ? (traits.binary_traits || []).filter(Boolean)
        : [],
    quantitative_traits:
      evaluationType === "quantitative" || evaluationType === "both"
        ? (traits.quantitative_traits || []).filter(Boolean)
        : [],
  })

  return {
    ...config,
    phenotype_config: {
      pop1: sanitizePopulation(
        (config.phenotype_config as any).pop1 ||
          (config.phenotype_config as any).target_population
      ),
      pop2: sanitizePopulation(
        (config.phenotype_config as any).pop2 ||
          (config.phenotype_config as any).base_population
      ),
    },
    options: {
      ...config.options,
      evaluation_type: evaluationType,
      process_binary_phenotypes:
        evaluationType === "binary" || evaluationType === "both",
      process_quantitative_phenotypes:
        evaluationType === "quantitative" || evaluationType === "both",
      sumstats_strict_single: Boolean(config.options.sumstats_strict_single),
    },
    genotype_config: {
      ...config.genotype_config,
      file_patterns: {
        bed: (config.genotype_config.file_patterns.bed || "").trim(),
        bim: (config.genotype_config.file_patterns.bim || "").trim(),
        fam: (config.genotype_config.file_patterns.fam || "").trim(),
      },
      chrom: sanitizeChromArray(config.genotype_config.chrom),
    },
  }
}

export const sanitizeXpassConfig = (
  config: XpassPreProcessingConfig
): XpassPreProcessingConfig => {
  // Normalize options
  const sanitizedOptions = {
    ...DEFAULT_PROCESSING_OPTIONS,
    ...(config.options ?? {}),
  }
  const nextEvaluation = (sanitizedOptions.evaluation_type ||
    "both") as EvaluationType
  sanitizedOptions.evaluation_type = nextEvaluation
  sanitizedOptions.process_binary_phenotypes =
    nextEvaluation === "quantitative"
      ? false
      : Boolean(sanitizedOptions.process_binary_phenotypes)
  sanitizedOptions.process_quantitative_phenotypes =
    nextEvaluation === "binary"
      ? false
      : Boolean(sanitizedOptions.process_quantitative_phenotypes)
  sanitizedOptions.skip_missing_columns = Boolean(
    sanitizedOptions.skip_missing_columns
  )
  sanitizedOptions.overwrite_existing = Boolean(
    sanitizedOptions.overwrite_existing
  )

  // Populations: trim and filter to allowed types
  const populations = Array.isArray((config as any).populations)
    ? ((config as any).populations as any[])
        .map((p) => ({
          name: (p?.name || "").trim(),
          type:
            p?.type === "auxiliary" || p?.type === "validation"
              ? p.type
              : "target",
          sumstats_path: (p?.sumstats_path || "").trim(),
          genotype_path: (p?.genotype_path || "").trim(),
        }))
        .filter((p) => p.name.length > 0)
    : []

  // Column mappings by population: only keep recognized keys and non-empty values
  const byPopulationRaw = (config as any)?.column_mappings?.by_population || {}
  const byPopulationSanitized: Record<
    string,
    Partial<Record<XpassColumnKey, string>>
  > = {}
  Object.keys(byPopulationRaw || {}).forEach((popName) => {
    const raw = byPopulationRaw[popName] || {}
    const mapped: Partial<Record<XpassColumnKey, string>> = {}
    XPASS_ALL_COLUMNS.forEach((key) => {
      const candidate =
        raw[key] ?? raw[key.toLowerCase()] ?? raw[key.toUpperCase()]
      const value =
        typeof candidate === "string"
          ? candidate.trim()
          : candidate != null
            ? String(candidate).trim()
            : ""
      if (value) mapped[key] = value
    })
    if (Object.keys(mapped).length > 0) {
      byPopulationSanitized[popName] = mapped
    }
  })

  // Genotype config
  const existingGenotypeConfig = (config as any)?.genotype_config || {
    file_type: "merged" as const,
    chrom: [],
    file_patterns: { bed: "", bim: "", fam: "" },
  }
  const patterns = existingGenotypeConfig.file_patterns || {
    bed: "",
    bim: "",
    fam: "",
  }

  return {
    populations,
    column_mappings: { by_population: byPopulationSanitized },
    fixed_N1: ((config as any)?.fixed_N1 || "").trim() || undefined,
    fixed_N2: ((config as any)?.fixed_N2 || "").trim() || undefined,
    fixed_N3: ((config as any)?.fixed_N3 || "").trim() || undefined,
    genotype_config: {
      file_type:
        existingGenotypeConfig.file_type === "multi_chromosome"
          ? "multi_chromosome"
          : "merged",
      file_patterns: {
        bed: (patterns.bed || "").trim(),
        bim: (patterns.bim || "").trim(),
        fam: (patterns.fam || "").trim(),
      },
      chrom: sanitizeChromArray(existingGenotypeConfig.chrom),
    },
    sumstats_file_type: ((config as any)?.sumstats_file_type ||
      "merged") as any,
    covariate_config: {
      target_population: (
        ((config as any)?.covariate_config?.target_population || "") as string
      ).trim(),
      auxiliary_population: (
        ((config as any)?.covariate_config?.auxiliary_population ||
          "") as string
      ).trim(),
      validation_population: (
        ((config as any)?.covariate_config?.validation_population ||
          "") as string
      ).trim(),
    },
    options: sanitizedOptions,
    output_dir: (((config as any)?.output_dir || "") as string).trim(),
  }
}

// ----- Processing payload builders (moved from tool-configuration.tsx) -----

type ProcessingModeKey = "binary" | "quantitative"

export const buildPrscsxProcessingPayload = (
  preProcessing: PrscsxPreProcessingConfig,
  processingState: PrscsxProcessingState,
  mode: EvaluationType
): PrscsxProcessingPayload => {
  const normalize = (value?: string) => (value || "").replace(/\\/g, "/")
  const populations = preProcessing.populations || []
  const populationNames = populations.map((population) => population.name)
  const baseOutputDir =
    normalize(preProcessing.output_dir) ||
    "results/preprocessed_data/preprocessed_prscsx_output"
  const sumstatsFileType = preProcessing.sumstats_file_type || "merged"
  const genotypeFileType = preProcessing.genotype_config?.file_type || "merged"
  const isMultiChromSumstats = sumstatsFileType === "multi_chromosome"
  const isMultiChromGenotype = genotypeFileType === "multi_chromosome"

  const basePlaceholder = "{base_pop}"
  const targetPlaceholder = "{target_pop}"
  const targetPopulationName =
    populations.find((population) => population.type === "target")?.name || ""

  const sumstatsBasePath = isMultiChromSumstats
    ? `${baseOutputDir}/sumstats/${basePlaceholder}/`
    : `${baseOutputDir}/sumstats/${basePlaceholder}/${basePlaceholder}_sumstats.txt`
  const sumstatsTargetPath = isMultiChromSumstats
    ? `${baseOutputDir}/sumstats/${targetPlaceholder}/`
    : `${baseOutputDir}/sumstats/${targetPlaceholder}/${targetPlaceholder}_sumstats.txt`

  const sstFiles = [sumstatsBasePath, sumstatsTargetPath]
  const populationsString = `${basePlaceholder},${targetPlaceholder}`

  const result: PrscsxProcessingPayload = {}

  const buildModePayload = (key: ProcessingModeKey) => {
    const state = processingState[key]
    if (!state?.runPopulation) return null

    const nGwasList = populationNames.map(
      (name) => state.nGwas[name]?.trim() || ""
    )
    if (nGwasList.some((value) => !value)) return null

    const chromValue = (state.chrom || "").trim()
    const phiValue = (state.phi || "").trim()
    if (!chromValue || !phiValue) return null

    const phenoColumn = state.phenoColumn
    if (!phenoColumn) return null

    const runPopulation = state.runPopulation
    const selectedPopulation = populations.find(
      (population) => population.name === runPopulation
    )
    const selectedType =
      selectedPopulation?.type ||
      (runPopulation === targetPopulationName ? "target" : "base")
    const scoringPlaceholder =
      selectedType === "target" ? targetPlaceholder : basePlaceholder
    const evaluationLabel = key === "binary" ? "bin" : "quant"
    const genotypeRoot = `${baseOutputDir}/genotypes/${scoringPlaceholder}`
    const multiChromGenotype = `${genotypeRoot}/`
    const resolvedBasename = (state.genotypeBasename || "").trim() || "geno"
    const mergedGenotype = `${genotypeRoot}/${resolvedBasename}`
    const genotypePrefix = isMultiChromGenotype
      ? multiChromGenotype
      : mergedGenotype
    const phenoFile = `${baseOutputDir}/phenotypes/pheno_${evaluationLabel}_${scoringPlaceholder}.txt`
    const plinkOutputPrefix =
      key === "binary"
        ? `results/prs_results_binary/prscsx_plink/${basePlaceholder}_test_${targetPlaceholder}_result`
        : `results/prs_results/prscsx_plink/${scoringPlaceholder}_test_${scoringPlaceholder}_result`
    const outName = `${basePlaceholder}_${targetPlaceholder}`
    const logDir =
      key === "binary"
        ? "results/log_files_binary/prscsx_log"
        : "results/log_files/prscsx_log"
    const output_dir =
      key === "binary"
        ? "results/prs_results_binary/prscsx"
        : "results/prs_results/prscsx"

    const payload = {
      ldref_folder: "ld_ref",
      bim_prefix: genotypePrefix,
      sst_files: sstFiles,
      n_gwas: nGwasList.join(","),
      populations: populationsString,
      chrom: chromValue,
      phi: phiValue,
      out_name: outName,
      output_dir: output_dir,
      plink_genotype_prefix: genotypePrefix,
      score_choice: "base",
      pheno: phenoFile,
      pheno_column_name: phenoColumn,
      plink_output_prefix: plinkOutputPrefix,
      log_dir: logDir,
      scoring_population: runPopulation,
      scoring_population_type: selectedType as any,
      population_order: populationNames,
    }

    return payload
  }

  if (mode === "binary" || mode === "both") {
    const payload = buildModePayload("binary")
    if (payload) {
      result.binary = payload as any
    }
  }

  if (mode === "quantitative" || mode === "both") {
    const payload = buildModePayload("quantitative")
    if (payload) {
      result.quantitative = payload as any
    }
  }

  return result
}

export const buildSdprxProcessingPayload = (
  preProcessing: SdprxPreProcessingConfig,
  processingState: SdprxProcessingState,
  mode: EvaluationType
): SdprxProcessingPayload => {
  const result: SdprxProcessingPayload = {}

  const normalize = (p: string | undefined) => (p || "").replace(/\\/g, "/")

  const pop1 = (preProcessing?.pop1?.name || "").trim()
  const pop2 = (preProcessing?.pop2?.name || "").trim()
  const preOutDir =
    normalize(preProcessing?.output_dir) ||
    "results/preprocessed_data/preprocessed_sdprx_output"
  const populationReference =
    preProcessing?.genotype_config?.population_reference || "pop1"
  const scoringPop = populationReference === "pop1" ? pop1 : pop2
  const sumstatsFileType = preProcessing?.sumstats_file_type || "merged"
  const genotypeFileType = preProcessing?.genotype_config?.file_type || "merged"

  const buildModePayload = (key: keyof SdprxProcessingState) => {
    const state = processingState[key]
    if (!state) return null

    const isBinary = key === "binary"

    const n1 = (state.n1 || "").trim()
    const n2 = (state.n2 || "").trim()
    const chrom = (state.chrom || "").trim()
    const rho = (state.rho || "").trim()
    const forceShared = Boolean(state.force_shared)

    // Sumstats: file vs directory based on sumstats_file_type
    const ss1 =
      sumstatsFileType === "multi_chromosome"
        ? `${preOutDir}/sumstats/${pop2}/`
        : `${preOutDir}/sumstats/${pop2}/${pop2}_sumstats.txt`
    const ss2 =
      sumstatsFileType === "multi_chromosome"
        ? `${preOutDir}/sumstats/${pop1}/`
        : `${preOutDir}/sumstats/${pop1}/${pop1}_sumstats.txt`

    // Genotype: merged uses user-provided BASENAME; multi-chromosome uses directory
    // Users provide only the basename (no directory). We construct the full path
    // by replacing the previous fixed "geno" basename in the standard location.
    const mergedPrefixRaw = (state.sdprx_genotype_file || "geno").trim()
    const mergedPrefixBasename =
      mergedPrefixRaw.replace(/\\+/g, "/").split("/").filter(Boolean).pop() ||
      "geno"
    const multiChromGenoDir = `${preOutDir}/genotypes/${scoringPop}/`
    const isMergedGenotype = genotypeFileType !== "multi_chromosome"
    const genopath = isMergedGenotype
      ? `${preOutDir}/genotypes/${scoringPop}/${mergedPrefixBasename}`
      : multiChromGenoDir
    const valid = isMergedGenotype ? `${genopath}.bim` : multiChromGenoDir
    const pheno = isBinary
      ? `${preOutDir}/phenotypes/pheno_bin_${scoringPop}.txt`
      : `${preOutDir}/phenotypes/pheno_quant_${scoringPop}.txt`
    const outDir = isBinary
      ? "results/prs_results_binary/sdprx"
      : "results/prs_results/sdprx"
    const plinkOutputPrefix = isBinary
      ? `results/prs_results_binary/sdprx_plink/${scoringPop}_test_${scoringPop}_result`
      : `results/prs_results/sdprx_plink/${scoringPop}_test_${scoringPop}_result`
    const scoreFile = "results_2.txt"
    const logDir = isBinary
      ? "results/log_files_binary/sdprx_log"
      : "results/log_files/sdprx_log"

    const required = [
      pop1,
      pop2,
      ss1,
      ss2,
      genopath,
      outDir,
      n1,
      n2,
      chrom,
      rho,
      pheno,
    ]
    if (required.some((v) => !v)) return null

    const payload: any = {
      ss1,
      ss2,
      sdprx_genotype_file: genopath,
      n1,
      n2,
      force_shared: forceShared,
      load_ld: REFERENCE_PATHS.SDPRX_LD_REF,
      valid,
      chrom,
      rho,
      output_dir: outDir,
      score_file: scoreFile,
      plink_output_prefix: plinkOutputPrefix,
      pheno,
      log_dir: logDir,
    }

    // For per-chromosome runs, surface a plink_genotype_prefix pointing to the geno directory
    if (!isMergedGenotype) {
      payload.plink_genotype_prefix = multiChromGenoDir
    }

    return payload
  }

  if (mode === "binary" || mode === "both") {
    const payload = buildModePayload("binary")
    if (payload) {
      result.binary = payload as any
    }
  }

  if (mode === "quantitative" || mode === "both") {
    const payload = buildModePayload("quantitative")
    if (payload) {
      result.quantitative = payload as any
    }
  }

  return result
}

export const buildBridgeprsProcessingPayload = (
  preProcessing: BridgeprsPreProcessingConfig,
  processingState: BridgeprsProcessingState,
  mode: EvaluationType
): BridgeprsProcessingPayload => {
  const result: BridgeprsProcessingPayload = {}

  const normalize = (p: string | undefined) => (p || "").replace(/\\/g, "/")

  const pop1 = (preProcessing?.pop1?.name || "").trim()
  const pop2 = (preProcessing?.pop2?.name || "").trim()
  const preOutDir =
    normalize(preProcessing?.output_dir) ||
    "results/preprocessed_data/preprocessed_bridgeprs_output"

  const buildModePayload = (key: keyof BridgeprsProcessingState) => {
    const state = processingState[key]
    if (!state) return null

    const isBinary = key === "binary"

    const phenotype = (state.bridgeprs_phenotype || "").trim()
    const fst = (state.fst || "").trim()
    const nBase = (state.sumstats_size_EUR || "").trim()
    const nTarget = (state.sumstats_size_AFR || "").trim()

    const preprocessedInputs = `${preOutDir}`
    const ldrefBridgeprs = REFERENCE_PATHS.BRIDGEPRS_LD_REF

    const sumstatsPrefixBase = `${preOutDir}/sumstats/${pop2}/`
    const sumstatsPrefixTarget = `${preOutDir}/sumstats/${pop1}/`

    // Genotype: merged uses user-provided BASENAME; multi-chromosome uses the population folder (no basename)
    const genotypeFileType =
      preProcessing?.genotype_config?.file_type || "merged"
    const isMergedGenotype = genotypeFileType === "merged"
    const mergedPrefixRaw = (state as any).bridgeprs_genotype_file
      ? String((state as any).bridgeprs_genotype_file)
      : ""
    const mergedPrefixBasename =
      mergedPrefixRaw
        .trim()
        .replace(/\\+/g, "/")
        .split("/")
        .filter(Boolean)
        .pop() || ""

    // For merged runs, if basename is missing, leave geno prefixes empty so required-check returns null
    const genoPrefixBase = isMergedGenotype
      ? mergedPrefixBasename
        ? `${preOutDir}/genotypes/${pop2}/${mergedPrefixBasename}`
        : ""
      : `${preOutDir}/genotypes/${pop2}/`
    const genoPrefixTarget = isMergedGenotype
      ? mergedPrefixBasename
        ? `${preOutDir}/genotypes/${pop1}/${mergedPrefixBasename}`
        : ""
      : `${preOutDir}/genotypes/${pop1}/`

    const phenoFileBase = isBinary
      ? `${preOutDir}/phenotypes/pheno_bin_${pop2}.txt`
      : `${preOutDir}/phenotypes/pheno_quant_${pop2}.txt`
    const phenoFileTarget = isBinary
      ? `${preOutDir}/phenotypes/pheno_bin_${pop1}.txt`
      : `${preOutDir}/phenotypes/pheno_quant_${pop1}.txt`

    const outDir = isBinary
      ? "results/prs_results_binary/bridgeprs"
      : "results/prs_results/bridgeprs"
    const inputBridgeprsData = `${outDir}/config_files`
    const logDir = isBinary
      ? "results/log_files_binary/bridgeprs_log"
      : "results/log_files/bridgeprs_log"

    const required = [
      pop1,
      pop2,
      phenotype,
      fst,
      nBase,
      nTarget,
      sumstatsPrefixBase,
      sumstatsPrefixTarget,
      genoPrefixBase,
      genoPrefixTarget,
      phenoFileBase,
      phenoFileTarget,
      outDir,
      inputBridgeprsData,
      logDir,
    ]
    if (required.some((v) => !v)) return null

    const payload = {
      bridgeprs_phenotype: phenotype,
      fst,
      preprocessed_inputs: preprocessedInputs,
      ldref_bridgeprs: ldrefBridgeprs,
      sumstats_prefix_EUR: sumstatsPrefixBase,
      sumstats_size_EUR: nBase,
      genotype_prefix_EUR: genoPrefixBase,
      phenotype_file_EUR: phenoFileBase,
      sumstats_prefix_AFR: sumstatsPrefixTarget,
      sumstats_size_AFR: nTarget,
      genotype_prefix_AFR: genoPrefixTarget,
      phenotype_file_AFR: phenoFileTarget,
      bridgeprs_output_dir: outDir,
      input_bridgeprs_data: inputBridgeprsData,
      log_dir: logDir,
    }

    return payload
  }

  if (mode === "binary" || mode === "both") {
    const payload = buildModePayload("binary")
    if (payload) {
      result.binary = payload as any
    }
  }

  if (mode === "quantitative" || mode === "both") {
    const payload = buildModePayload("quantitative")
    if (payload) {
      result.quantitative = payload as any
    }
  }

  return result
}

export const buildPrsiceProcessingPayload = (
  preProcessing: PrsicePreProcessingConfig,
  mode: EvaluationType
): PrsiceProcessingPayload => {
  const normalize = (p: string | undefined) => (p || "").replace(/\\/g, "/")

  const target = (preProcessing?.target_population?.name || "").trim()
  const base = (preProcessing?.source_population?.name || "").trim()
  const preOutDir =
    normalize(preProcessing?.output_dir) ||
    "results/preprocessed_data/preprocessed_prsice_output"
  const sumstatsFileType = preProcessing?.sumstats_file_type || "merged"

  const result: PrsiceProcessingPayload = {}

  const buildQuant = (): PrsiceProcessingModePayload | null => {
    const sumstats =
      sumstatsFileType === "multi_chromosome"
        ? `${preOutDir}/sumstats/${target}/`
        : `${preOutDir}/sumstats/${target}/${target}_sumstats.txt`
    const targetData = `${preOutDir}/genotypes/${target}/`
    const pheno = `${preOutDir}/phenotypes/pheno_quant_${target}.txt`
    const required = [target, base, sumstats, targetData, pheno]
    if (required.some((v) => !v)) return null
    return {
      input_prsice_data: preOutDir,
      sumstats,
      target_data: targetData,
      pheno,
      threads: 1,
      stat: "BETA",
      binary_target: "F",
      output_dir: "results/prs_results/prsice",
      log_dir: "results/log_files/prsice_log",
    }
  }

  const buildBinary = (): PrsiceProcessingModePayload | null => {
    const sumstats =
      sumstatsFileType === "multi_chromosome"
        ? `${preOutDir}/sumstats/${target}/`
        : `${preOutDir}/sumstats/${target}/${target}_sumstats.txt`
    const targetData = `${preOutDir}/genotypes/${target}/`
    const pheno = `${preOutDir}/phenotypes/pheno_bin_${target}.txt`
    const required = [target, base, sumstats, targetData, pheno]
    if (required.some((v) => !v)) return null
    return {
      input_prsice_data: preOutDir,
      sumstats,
      target_data: targetData,
      pheno,
      threads: 1,
      stat: "BETA",
      binary_target: "T",
      output_dir: "results/prs_results_binary/prsice",
      log_dir: "results/log_files_binary/prsice_log",
    }
  }

  if (mode === "quantitative" || mode === "both") {
    const payload = buildQuant()
    if (payload) result.quantitative = payload
  }
  if (mode === "binary" || mode === "both") {
    const payload = buildBinary()
    if (payload) result.binary = payload
  }

  return result
}

export const buildXpassProcessingPayload = (
  preProcessing: XpassPreProcessingConfig,
  processingState?: XpassProcessingState,
  mode?: EvaluationType
): XpassProcessingPayload => {
  const normalize = (value?: string) => (value || "").replace(/\\/g, "/").trim()

  const target = preProcessing.populations.find((p) => p.type === "target")
  const auxiliary = preProcessing.populations.find(
    (p) => p.type === "auxiliary"
  )
  const validation = preProcessing.populations.find(
    (p) => p.type === "validation"
  )

  const preOutDir =
    normalize(preProcessing.output_dir) ||
    "results/preprocessed_data/preprocessed_xpass_output"
  const sumstatsType = preProcessing.sumstats_file_type || "merged"
  const genotypeType = preProcessing.genotype_config?.file_type || "merged"

  const sumstatsPathFor = (populationName: string) =>
    sumstatsType === "multi_chromosome"
      ? `${preOutDir}/sumstats/${populationName}/`
      : `${preOutDir}/sumstats/${populationName}/${populationName}_sumstats.txt`

  const genotypePathFor = (populationName: string) =>
    genotypeType === "multi_chromosome"
      ? `${preOutDir}/genotypes/${populationName}/`
      : `${preOutDir}/genotypes/${populationName}/geno`

  const targetData = target ? sumstatsPathFor(target.name) : ""
  const auxiliaryData = auxiliary ? sumstatsPathFor(auxiliary.name) : ""
  const refPop1Path = target ? genotypePathFor(target.name) : ""
  const refPop2Path = auxiliary ? genotypePathFor(auxiliary.name) : ""
  // For XPASS, test data should use Pop1 (target) genotype directory for now, you can check back to validation later
  const testDataPath = refPop1Path

  const compPRS = processingState?.compPRS ?? "T"
  const compPosMean = processingState?.compPosMean ?? "T"
  const sdMethod = normalize(processingState?.sd_method) || "LD_block"
  const outputName = normalize(processingState?.outputName) || "xpass"
  const xpassPop1 = normalize(processingState?.xpass_pop1) || target?.name || ""

  // Build base payload (shared between binary and quantitative)
  // Note: clump_params and use_pop_snps are XPASS+ only features (added in buildXpassPlusProcessingPayload)
  const buildModePayload = (isBinary: boolean) => {
    const outputDir = isBinary
      ? "results/prs_results_binary/xpass"
      : normalize(processingState?.output_dir) || "results/prs_results/xpass"
    const logDir = isBinary
      ? "results/log_files_binary/xpass"
      : normalize(processingState?.log_dir) || "results/log_files/xpass"

    return {
      target_data: targetData,
      auxillary_data: auxiliaryData,
      ref_pop1: refPop1Path,
      ref_pop2: refPop2Path,
      test_data: testDataPath,
      compPRS,
      sd_method: sdMethod,
      compPosMean,
      outputName,
      xpass_pop1: xpassPop1,
      output_dir: outputDir,
      log_dir: logDir,
    }
  }

  const result: XpassProcessingPayload = {}
  const evalMode = mode || "both"

  if (evalMode === "quantitative" || evalMode === "both") {
    result.quantitative = buildModePayload(false) as any
  }
  if (evalMode === "binary" || evalMode === "both") {
    result.binary = buildModePayload(true) as any
  }

  return result
}

// XPASS+ processing payload builder: mirrors XPASS but with distinct defaults
// XPASS+ includes clump_params and use_pop_snps options that XPASS doesn't have
export const buildXpassPlusProcessingPayload = (
  preProcessing: XpassPreProcessingConfig,
  processingState?: XpassProcessingState,
  mode?: EvaluationType
): XpassProcessingPayload => {
  // Reuse XPASS builder with XPASS+ flavored defaults
  // Note: output_dir and log_dir in mergedState are for quantitative mode
  // The buildXpassProcessingPayload will handle binary dirs automatically
  const mergedState: XpassProcessingState = {
    // compPRS is always true for XPASS+
    compPRS: "T",
    // sd_method and output naming/dirs are fixed for XPASS+
    sd_method: "LD_block",
    compPosMean: processingState?.compPosMean ?? "T",
    outputName: "xpass_plus",
    chrom: processingState?.chrom,
    output_dir: "results/prs_results/xpass+", // quantitative default
    log_dir: "results/log_files/xpass+", // quantitative default
    // XPASS+ specific options (these are NOT passed to base XPASS builder)
    clump_params: processingState?.clump_params,
    use_pop1_snps: processingState?.use_pop1_snps,
    use_pop2_snps: processingState?.use_pop2_snps,
  }

  // Get target population for ref_pop1
  const target = preProcessing.populations.find((p) => p.type === "target")
  const normalize = (value?: string) => (value || "").replace(/\\/g, "/").trim()
  const preOutDir =
    normalize(preProcessing.output_dir) ||
    "results/preprocessed_data/preprocessed_xpass_output"
  const genotypeType = preProcessing.genotype_config?.file_type || "merged"
  const genotypePathFor = (populationName: string) =>
    genotypeType === "multi_chromosome"
      ? `${preOutDir}/genotypes/${populationName}/`
      : `${preOutDir}/genotypes/${populationName}/geno`
  const refPop1Path = target ? genotypePathFor(target.name) : ""

  // Build the result with XPASS+ specific paths
  const result: XpassProcessingPayload = {}
  const evalMode = mode || "both"

  // Delegate to XPASS builder for base payload generation
  const basePayload = buildXpassProcessingPayload(
    preProcessing,
    mergedState,
    mode
  )

  // XPASS+ specific additions: clump_params and use_pop_snps
  const clumpParams = processingState?.clump_params
  const usePop1Snps = processingState?.use_pop1_snps
  const usePop2Snps = processingState?.use_pop2_snps

  const xpassPlusExtras = {
    ...(clumpParams
      ? {
          clump_params: {
            pop1: {
              kb: Number(clumpParams.pop1?.kb ?? 1000),
              r2: Number(clumpParams.pop1?.r2 ?? 0.1),
              p: Number(clumpParams.pop1?.p ?? 0.05),
            },
            pop2: {
              kb: Number(clumpParams.pop2?.kb ?? 1000),
              r2: Number(clumpParams.pop2?.r2 ?? 0.1),
              p: Number(clumpParams.pop2?.p ?? 0.05),
            },
          },
        }
      : {}),
    ...(usePop1Snps != null ? { use_pop1_snps: Boolean(usePop1Snps) } : {}),
    ...(usePop2Snps != null ? { use_pop2_snps: Boolean(usePop2Snps) } : {}),
  }

  // Apply XPASS+ specific modifications
  if (evalMode === "quantitative" || evalMode === "both") {
    if (basePayload.quantitative) {
      result.quantitative = {
        ...basePayload.quantitative,
        test_data: refPop1Path, // XPASS+ uses ref_pop1 for test_data
        outputName: "xpass_plus",
        output_dir: "results/prs_results/xpass+",
        log_dir: "results/log_files/xpass+",
        ...xpassPlusExtras,
      }
    }
  }
  if (evalMode === "binary" || evalMode === "both") {
    if (basePayload.binary) {
      result.binary = {
        ...basePayload.binary,
        test_data: refPop1Path, // XPASS+ uses ref_pop1 for test_data
        outputName: "xpass_plus",
        output_dir: "results/prs_results_binary/xpass+",
        log_dir: "results/log_files_binary/xpass+",
        ...xpassPlusExtras,
      }
    }
  }

  return result
}

// Convenience: given tool id and sanitized configs, build processing payload
export function buildProcessingForTool(
  toolId: string,
  sanitizedConfig: ToolPreProcessingConfig | undefined,
  processingState: any,
  evaluationType: EvaluationType
):
  | PrscsxProcessingPayload
  | BridgeprsProcessingPayload
  | SdprxProcessingPayload
  | PrsiceProcessingPayload
  | XpassProcessingPayload
  | undefined {
  if (!sanitizedConfig) return undefined
  if (toolId === "prscsx") {
    return buildPrscsxProcessingPayload(
      sanitizedConfig as PrscsxPreProcessingConfig,
      processingState as PrscsxProcessingState,
      evaluationType
    )
  }
  if (toolId === "bridgeprs") {
    return buildBridgeprsProcessingPayload(
      sanitizedConfig as BridgeprsPreProcessingConfig,
      processingState as BridgeprsProcessingState,
      evaluationType
    )
  }
  if (toolId === "sdprx") {
    return buildSdprxProcessingPayload(
      sanitizedConfig as SdprxPreProcessingConfig,
      processingState as SdprxProcessingState,
      evaluationType
    )
  }
  if (toolId === "xpass" || toolId === "xpass+") {
    if (toolId === "xpass+") {
      return buildXpassPlusProcessingPayload(
        sanitizedConfig as XpassPreProcessingConfig,
        processingState as XpassProcessingState,
        evaluationType
      )
    }
    return buildXpassProcessingPayload(
      sanitizedConfig as XpassPreProcessingConfig,
      processingState as XpassProcessingState,
      evaluationType
    )
  }
  if (toolId === "prsice") {
    return buildPrsiceProcessingPayload(
      sanitizedConfig as PrsicePreProcessingConfig,
      evaluationType
    )
  }
  return undefined
}
