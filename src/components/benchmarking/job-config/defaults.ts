import type {
  EvaluationType,
  FieldSpec,
  ParamSpec,
  ParamValue,
  ParamValues,
  PopulationDraft,
  Role,
  SplitDraft,
  RoleRule,
  ToolDefinition,
  ToolDraft,
  TraitKind,
} from "@/components/benchmarking/job-config/types"

export type IdFactory = () => string

// crypto.randomUUID is missing outside secure contexts (a dev server opened over http://<LAN ip>).
const randomId: IdFactory = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const fieldDefault = (field: FieldSpec) => field.default ?? null

export function defaultParamValue(spec: ParamSpec): ParamValue {
  switch (spec.kind) {
    case "trait":
    case "covariate":
      return ""
    case "per_role":
      return Object.fromEntries(
        spec.roles.map((role) => [
          role,
          Array.isArray(spec.of)
            ? Object.fromEntries(
                spec.of.map((field) => [field.key, fieldDefault(field)])
              )
            : fieldDefault(spec.of),
        ])
      )
    default:
      return fieldDefault(spec)
  }
}

export function defaultParams(definition: ToolDefinition): ParamValues {
  return Object.fromEntries(
    definition.params.map((spec) => [spec.key, defaultParamValue(spec)])
  )
}

export function ruleFor(
  definition: ToolDefinition,
  role: Role
): RoleRule | undefined {
  return definition.populations.find((rule) => rule.role === role)
}

export function newPopulation(
  role: Role,
  newId: IdFactory = randomId
): PopulationDraft {
  return {
    id: newId(),
    name: "",
    role,
    gwas_n: null,
    sumstats_path: "",
    sumstats_prefix: "",
    genotype_path: "",
    phenotype_path: "",
    covariate_path: "",
    snp_list_path: "",
    base_model_path: "",
    included_paths: [],
    column_mapping: {},
    traits: { binary: [], quantitative: [] },
  }
}

/** The processing blocks each tool produces for the job's evaluation type. */
export function runKinds(evaluationType: EvaluationType): TraitKind[] {
  return evaluationType === "both"
    ? ["binary", "quantitative"]
    : [evaluationType]
}

/** 70% of the target's people train the model, assigned by a hash seeded with 42. */
export const DEFAULT_SPLIT: SplitDraft = {
  method: "proportions",
  train: 0.7,
  seed: 42,
  column: "",
}

export function defaultDraft(
  definition: ToolDefinition,
  newId: IdFactory = randomId
): ToolDraft {
  const draft: ToolDraft = {
    tool: definition.id,
    populations: definition.populations.flatMap((rule) =>
      Array.from({ length: rule.min }, () => newPopulation(rule.role, newId))
    ),
    names_saved: false,
    sumstats_file_type: "merged",
    genotype: { file_type: "merged", chrom: [] },
    covariates: { columns: [], id_mapping: { fid: "FID", iid: "IID" } },
    params: {
      binary: defaultParams(definition),
      quantitative: defaultParams(definition),
    },
  }
  if (definition.trainValidationSplit) draft.split = { ...DEFAULT_SPLIT }
  if (definition.preprocessingOptions)
    draft.preprocessing = Object.fromEntries(
      definition.preprocessingOptions.map((field) => [
        field.key,
        fieldDefault(field),
      ])
    )
  return draft
}

/** Sorted, de-duplicated autosomes. `[]` means genome-wide. */
export function normalizeChromosomes(chromosomes: readonly number[]): number[] {
  return chromosomes
    .filter(
      (c, index) =>
        Number.isInteger(c) &&
        c >= 1 &&
        c <= 22 &&
        chromosomes.indexOf(c) === index
    )
    .sort((a, b) => a - b)
}
