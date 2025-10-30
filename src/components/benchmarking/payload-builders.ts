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
} from "@/components/benchmarking/tool-configuration/types"

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

export const sanitizeChromArray = (input: unknown): number[] => {
  const toNums = (vals: (string | number)[]) =>
    vals
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && Number.isInteger(n) && n >= 1 && n <= 22)
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

  const sanitizedColumns = BRIDGEPRS_REQUIRED_COLUMNS.reduce((acc, column) => {
    const value = config.column_mappings?.[column]?.trim()
    if (value) acc[column] = value
    return acc
  }, {} as Partial<Record<BridgeprsColumnKey, string>>)

  const sanitizedOptions = {
    ...DEFAULT_PROCESSING_OPTIONS,
    ...(config.options ?? {}),
  }

  const nextEvaluation = (sanitizedOptions.evaluation_type || "both") as EvaluationType
  sanitizedOptions.evaluation_type = nextEvaluation
  sanitizedOptions.process_binary_phenotypes =
    nextEvaluation === "quantitative" ? false : Boolean(sanitizedOptions.process_binary_phenotypes)
  sanitizedOptions.process_quantitative_phenotypes =
    nextEvaluation === "binary" ? false : Boolean(sanitizedOptions.process_quantitative_phenotypes)
  sanitizedOptions.skip_missing_columns = Boolean(sanitizedOptions.skip_missing_columns)
  sanitizedOptions.overwrite_existing = Boolean(sanitizedOptions.overwrite_existing)

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
    fixed_N: typeof config.fixed_N === "number" && Number.isFinite(config.fixed_N) ? config.fixed_N : null,
    column_mappings: sanitizedColumns,
    genotype_config: {
      ...existingGenotypeConfig,
      population_reference: existingGenotypeConfig.population_reference === "pop2" ? "pop2" : "pop1",
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

  const sanitizePopulation = (population: "target_population" | "source_population") => {
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
      process_binary_phenotypes: evaluationType === "binary" || evaluationType === "both",
      process_quantitative_phenotypes: evaluationType === "quantitative" || evaluationType === "both",
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

  const filteredTraits = populations.reduce((acc, population) => {
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
  }, {} as Record<string, PrsicePhenotypePopulationConfig>)

  const columnMappings = populations.reduce((acc, population) => {
    const mappings = config.column_mappings.by_population[population.name] || {}
    const cleaned = PRSCsx_REQUIRED_COLUMNS.reduce((inner, column) => {
      const value = mappings[column]
      if (value) inner[column] = value
      return inner
    }, {} as Record<PrscsxColumnKey, string>)
    acc[population.name] = cleaned
    return acc
  }, {} as Record<string, Record<PrscsxColumnKey, string>>)

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
      process_binary_phenotypes: evaluationType === "binary" || evaluationType === "both",
      process_quantitative_phenotypes: evaluationType === "quantitative" || evaluationType === "both",
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

  const sanitizePopulation = (traits: { binary_traits: string[]; quantitative_traits: string[] }) => ({
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
        // @ts-expect-error migrating schema
        (config.phenotype_config as any).pop1 || config.phenotype_config.target_population
      ),
      pop2: sanitizePopulation(
        // @ts-expect-error migrating schema
        (config.phenotype_config as any).pop2 || config.phenotype_config.base_population
      ),
    },
    options: {
      ...config.options,
      evaluation_type: evaluationType,
      process_binary_phenotypes: evaluationType === "binary" || evaluationType === "both",
      process_quantitative_phenotypes: evaluationType === "quantitative" || evaluationType === "both",
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
    // Ensure optional Z column is present (blank) for server payload compatibility
    column_mappings: {
      ...(config.column_mappings || {}),
      Z: (config.column_mappings as any)?.Z ?? "",
    },
  }
}

// ----- Processing payload builders (moved from tool-configuration.tsx) -----

type ProcessingModeKey = "binary" | "quantitative"

export const buildPrscsxProcessingPayload = (
  preProcessing: PrscsxPreProcessingConfig,
  processingState: PrscsxProcessingState,
  mode: EvaluationType
): PrscsxProcessingPayload => {
  const populations = preProcessing.populations || []
  const populationNames = populations.map((population) => population.name)
  const baseOutputDir = preProcessing.output_dir

  const basePlaceholder = "{base_pop}"
  const targetPlaceholder = "{target_pop}"
  const targetPopulationName = populations.find((population) => population.type === "target")?.name || ""

  const sstFiles = [
    `${baseOutputDir}/sumstats/${basePlaceholder}/${basePlaceholder}_sumstats.txt`,
    `${baseOutputDir}/sumstats/${targetPlaceholder}/${targetPlaceholder}_sumstats.txt`,
  ]
  const populationsString = `${basePlaceholder},${targetPlaceholder}`

  const result: PrscsxProcessingPayload = {}

  const buildModePayload = (key: ProcessingModeKey) => {
    const state = processingState[key]
    if (!state?.runPopulation) return null

    const nGwasList = populationNames.map((name) => state.nGwas[name]?.trim() || "")
    if (nGwasList.some((value) => !value)) return null

    const chromValue = (state.chrom || "").trim()
    const phiValue = (state.phi || "").trim()
    if (!chromValue || !phiValue) return null

    const phenoColumn = state.phenoColumn
    if (!phenoColumn) return null

    const runPopulation = state.runPopulation
    const selectedPopulation = populations.find((population) => population.name === runPopulation)
    const selectedType = selectedPopulation?.type || (runPopulation === targetPopulationName ? "target" : "base")
    const scoringPlaceholder = selectedType === "target" ? targetPlaceholder : basePlaceholder
    const evaluationLabel = key === "binary" ? "bin" : "quant"
    const genotypePrefix = `${baseOutputDir}/genotypes/${scoringPlaceholder}/geno`
    const phenoFile = `${baseOutputDir}/phenotypes/pheno_${evaluationLabel}_${scoringPlaceholder}.txt`
    const plinkOutputPrefix = `results/prs_results/prscsx_plink/${scoringPlaceholder}_test_${scoringPlaceholder}_result`
    const outName = `${basePlaceholder}_${targetPlaceholder}`

    const payload = {
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
  const preOutDir = normalize(preProcessing?.output_dir) || "results/preprocessed_data/preprocessed_sdprx_output"
  const populationReference = preProcessing?.genotype_config?.population_reference || "pop1"
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
    const mergedPrefixBasename = mergedPrefixRaw
      .replace(/\\+/g, "/")
      .split("/")
      .filter(Boolean)
      .pop() || "geno"
    const multiChromGenoDir = `${preOutDir}/genotypes/${scoringPop}/`
    const isMergedGenotype = genotypeFileType !== "multi_chromosome"
    const genopath = isMergedGenotype
      ? `${preOutDir}/genotypes/${scoringPop}/${mergedPrefixBasename}`
      : multiChromGenoDir
    const valid = isMergedGenotype ? `${genopath}.bim` : multiChromGenoDir
    const pheno = isBinary
      ? `${preOutDir}/phenotypes/pheno_bin_${scoringPop}.txt`
      : `${preOutDir}/phenotypes/pheno_quant_${scoringPop}.txt`
    const outDir = isBinary ? "results/prs_results_binary/sdprx" : "results/prs_results/sdprx"
    const plinkOutputPrefix = isBinary
      ? `results/prs_results_binary/sdprx_plink/${scoringPop}_test_${scoringPop}_result`
      : `results/prs_results/sdprx_plink/${scoringPop}_test_${scoringPop}_result`
    const scoreFile = "results_2.txt"
    const logDir = isBinary ? "results/log_files_binary/sdprx_log" : "results/log_files/sdprx_log"

    const required = [pop1, pop2, ss1, ss2, genopath, outDir, n1, n2, chrom, rho, pheno]
    if (required.some((v) => !v)) return null

    const payload: any = {
      ss1,
      ss2,
      sdprx_genotype_file: genopath,
      n1,
      n2,
      force_shared: forceShared,
      load_ld: "C:/Users/CABLE/Downloads/Cable/Code/PRS-sandbox/python_version/chr_22.gz",
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
  const preOutDir = normalize(preProcessing?.output_dir) || "results/preprocessed_data/preprocessed_bridgeprs_output"

  const buildModePayload = (key: keyof BridgeprsProcessingState) => {
    const state = processingState[key]
    if (!state) return null

    const isBinary = key === "binary"

    const phenotype = (state.bridgeprs_phenotype || "").trim()
    const fst = (state.fst || "").trim()
    const nBase = (state.sumstats_size_EUR || "").trim()
    const nTarget = (state.sumstats_size_AFR || "").trim()

    const preprocessedInputs = `${preOutDir}`
    const ldrefBridgeprs = "C:\\Users\\CABLE\\Downloads\\Cable\\Code\\PRS-backend\\reference\\h3gwas_data"

    const sumstatsPrefixBase = `${preOutDir}/sumstats/${pop2}/`
    const sumstatsPrefixTarget = `${preOutDir}/sumstats/${pop1}/`

    // Genotype: merged uses user-provided BASENAME; multi-chromosome uses the population folder (no basename)
    const genotypeFileType = preProcessing?.genotype_config?.file_type || "merged"
    const isMergedGenotype = genotypeFileType === "merged"
    const mergedPrefixRaw = (state as any).bridgeprs_genotype_file
      ? String((state as any).bridgeprs_genotype_file)
      : ""
    const mergedPrefixBasename = mergedPrefixRaw
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

    const outDir = isBinary ? "results/prs_results_binary/bridgeprs" : "results/prs_results/bridgeprs"
    const inputBridgeprsData = `${outDir}/config_files`
    const logDir = isBinary ? "results/log_files_binary/bridgeprs_log" : "results/log_files/bridgeprs_log"

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
  const preOutDir = normalize(preProcessing?.output_dir) ||
    "results/preprocessed_data/preprocessed_prsice_output"
  const sumstatsFileType = preProcessing?.sumstats_file_type || "merged"

  const result: PrsiceProcessingPayload = {}

  const buildQuant = (): PrsiceProcessingModePayload | null => {
    const sumstats =
      sumstatsFileType === "multi_chromosome"
        ? `${preOutDir}/sumstats/${target}/`
        : `${preOutDir}/sumstats/${target}/${target}_sumstats.txt`
    const targetData = `${preOutDir}/genotypes/${target}`
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
    const targetData = `${preOutDir}/genotypes/${target}`
    const pheno = `${preOutDir}/phenotypes/pheno_bin_${base}.txt`
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

// Convenience: given tool id and sanitized configs, build processing payload
export function buildProcessingForTool(
  toolId: string,
  sanitizedConfig: ToolPreProcessingConfig | undefined,
  processingState: any,
  evaluationType: EvaluationType
): PrscsxProcessingPayload | BridgeprsProcessingPayload | SdprxProcessingPayload | PrsiceProcessingPayload | undefined {
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
  if (toolId === "prsice") {
    return buildPrsiceProcessingPayload(
      sanitizedConfig as PrsicePreProcessingConfig,
      evaluationType
    )
  }
  return undefined
}