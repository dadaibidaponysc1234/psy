import type {
  EvaluationType,
  // PRSice
  PrsicePreProcessingConfig,
  PrsicePhenotypePopulationConfig,
  // PRScsx
  PrscsxPreProcessingConfig,
  PrscsxColumnKey,
  // BridgePRS
  BridgeprsPreProcessingConfig,
  BridgeprsColumnKey,
  // SDPRX
  SdprxPreProcessingConfig,
  XpassPreProcessingConfig,
  XpassColumnKey,
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

