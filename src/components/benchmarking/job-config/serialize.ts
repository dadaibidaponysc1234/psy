import {
  normalizeChromosomes,
  ruleFor,
  runKinds,
} from "@/components/benchmarking/job-config/defaults"
import { mappableColumns } from "@/components/benchmarking/job-config/requirements"
import type {
  EvaluationType,
  ParamSpec,
  ParamValue,
  ParamValues,
  PathKey,
  PopulationDraft,
  SplitDraft,
  ToolDefinition,
  ToolDraft,
  TraitKind,
  WirePopulation,
  WirePreProcessing,
  WireSplitConfig,
  WireToolBlock,
} from "@/components/benchmarking/job-config/types"
import { getToolDefinition } from "@/components/benchmarking/tools"

/** The files a population provides: its role's required ones plus the optional ones the user included. */
export function providedPaths(
  definition: ToolDefinition,
  population: PopulationDraft
): PathKey[] {
  const rule = ruleFor(definition, population.role)
  if (!rule) return []
  return [
    ...rule.requiredPaths,
    ...rule.optionalPaths.filter((key) =>
      population.included_paths.includes(key)
    ),
  ]
}

/** Whether any population of the tool can take a covariate file. */
export function takesCovariates(definition: ToolDefinition): boolean {
  return definition.populations.some((rule) =>
    [...rule.requiredPaths, ...rule.optionalPaths].includes("covariate_path")
  )
}

/** Whether any population of the tool gives summary statistics; tools fitted on genotypes alone don't. */
export function takesSumstats(definition: ToolDefinition): boolean {
  return definition.populations.some((rule) =>
    [...rule.requiredPaths, ...rule.optionalPaths].includes("sumstats_path")
  )
}

/** The split as the backend reads it; validation has already checked its numbers. */
function buildSplit(split: SplitDraft): WireSplitConfig {
  if (split.method === "column") return { split_column: split.column.trim() }
  const train = split.train ?? 0
  return {
    // Rounded so the two shares sum to 1 within the backend's tolerance.
    split_proportions: { train, val: Number((1 - train).toFixed(6)) },
    seed: split.seed ?? 0,
  }
}

function buildPopulation(
  definition: ToolDefinition,
  evaluationType: EvaluationType,
  population: PopulationDraft,
  split: SplitDraft | undefined
): WirePopulation {
  const paths = providedPaths(definition, population)
  const wire: WirePopulation = {
    name: population.name.trim(),
    role: population.role,
  }
  if (population.gwas_n !== null) wire.gwas_n = population.gwas_n

  for (const key of paths) {
    const value = population[key].trim()
    if (value) wire[key] = value
  }
  const prefix = population.sumstats_prefix.trim()
  if (prefix && paths.includes("sumstats_path")) wire.sumstats_prefix = prefix

  const columns = mappableColumns(definition, population.role)
  if (columns.length > 0) {
    wire.column_mapping = Object.fromEntries(
      columns
        .map(
          (column) =>
            [column, population.column_mapping[column]?.trim() ?? ""] as const
        )
        .filter(([, source]) => source)
    )
  }

  if (definition.hasTraits && wire.phenotype_path) {
    wire.traits = Object.fromEntries(
      runKinds(evaluationType).map((kind) => [kind, population.traits[kind]])
    )
  }
  if (definition.trainValidationSplit && split && population.role === "target")
    wire.split_config = buildSplit(split)
  return wire
}

export function buildPreProcessing(
  draft: ToolDraft,
  evaluationType: EvaluationType
): WirePreProcessing {
  const definition = getToolDefinition(draft.tool)
  const preProcessing: WirePreProcessing = {
    populations: draft.populations.map((population) =>
      buildPopulation(definition, evaluationType, population, draft.split)
    ),
    sumstats_file_type: draft.sumstats_file_type,
    genotype_config: {
      file_type: draft.genotype.file_type,
      chrom: definition.chromosomeSelection
        ? normalizeChromosomes(draft.genotype.chrom)
        : [],
    },
    options: {
      evaluation_type: evaluationType,
      overwrite_existing: true,
    },
  }
  for (const field of definition.preprocessingOptions ?? []) {
    const value = draft.preprocessing?.[field.key]
    if (value !== undefined && value !== null)
      preProcessing.options[field.key] = value
  }
  const chosen = chosenCovariates(definition, draft, evaluationType)
  if (chosen.length > 0) preProcessing.phenotype_config = { covariates: chosen }
  if (takesCovariates(definition)) {
    preProcessing.phenotype_config = {
      covariate_id_mapping: draft.covariates.id_mapping,
    }
    if (definition.hasCovariateColumns) {
      preProcessing.phenotype_config.covariates = draft.covariates.columns
        .map((column) => column.trim())
        .filter(Boolean)
    }
  }
  return preProcessing
}

/** The phenotype columns a `covariate` parameter chose in the runs sent, each once. */
function chosenCovariates(
  definition: ToolDefinition,
  draft: ToolDraft,
  evaluationType: EvaluationType
): string[] {
  const chosen: string[] = []
  for (const spec of definition.params) {
    if (spec.kind !== "covariate") continue
    for (const kind of runKinds(evaluationType)) {
      const value = draft.params[kind]?.[spec.key]
      const column = typeof value === "string" ? value.trim() : ""
      if (column && !chosen.includes(column)) chosen.push(column)
    }
  }
  return chosen
}

function buildParam(
  spec: ParamSpec,
  value: ParamValue | undefined
): ParamValue | undefined {
  if (value === undefined) return undefined
  if (spec.kind === "per_role" && value && typeof value === "object") {
    return Object.fromEntries(spec.roles.map((role) => [role, value[role]]))
  }
  if (
    (spec.kind === "trait" || spec.kind === "covariate") &&
    typeof value === "string"
  )
    return value.trim()
  return value
}

function buildProcessingBlock(
  definition: ToolDefinition,
  values: ParamValues
): ParamValues {
  const block: ParamValues = {}
  for (const spec of definition.params) {
    const value = buildParam(spec, values[spec.key])
    if (value !== undefined) block[spec.key] = value
  }
  return block
}

export function buildToolBlock(
  draft: ToolDraft,
  evaluationType: EvaluationType
): WireToolBlock {
  const definition = getToolDefinition(draft.tool)
  const processing: Partial<Record<TraitKind, ParamValues>> = {}
  for (const kind of runKinds(evaluationType)) {
    processing[kind] = buildProcessingBlock(definition, draft.params[kind])
  }
  return {
    pre_processing: buildPreProcessing(draft, evaluationType),
    processing,
  }
}
