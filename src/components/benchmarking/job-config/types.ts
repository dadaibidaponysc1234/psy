/**
 * Job config types.
 *
 * Two layers:
 * - Drafts: what the form edits. One shape for every tool.
 * - Wire: the JSON posted to `POST /{job_id}/config`, agreed with the backend
 *   on msgboard topic #203. Every population is described once, by its role;
 *   nothing is identified by position or by a population name in a key.
 */

export type ToolId =
  | "prsice"
  | "prscsx"
  | "sdprx"
  | "bridgeprs"
  | "xpass"
  | "xpass+"

export type Role = "target" | "base" | "auxiliary" | "validation"

export type TraitKind = "binary" | "quantitative"

export type EvaluationType = TraitKind | "both"

export type FileLayout = "merged" | "multi_chromosome"

export type PathKey =
  | "sumstats_path"
  | "genotype_path"
  | "phenotype_path"
  | "covariate_path"

// ---------------------------------------------------------------------------
// Tool definitions (one per tool, see ../tools)
// ---------------------------------------------------------------------------

export interface RoleRule {
  role: Role
  label: string
  min: number
  /** Use Infinity for "any number". */
  max: number
  requiredPaths: PathKey[]
  optionalPaths: PathKey[]
  /** Shown under the population's name input on the mapping page. */
  help?: string
}

interface FieldBase {
  key: string
  label: string
  help?: string
  placeholder?: string
  /** Shown under an "advanced" toggle in the form. */
  advanced?: boolean
}

export interface NumberField extends FieldBase {
  kind: "number"
  /** Left out when the user must type a value. */
  default?: number
  min?: number
  /** The value must be strictly greater than this. */
  above?: number
  max?: number
  integer?: boolean
}

export type FieldSpec =
  | NumberField
  | (FieldBase & { kind: "boolean"; default: boolean })
  | (FieldBase & { kind: "select"; default: string; options: string[] })

/**
 * A method parameter. `trait` is the phenotype column scored, picked from the
 * target's traits of the block's kind. `per_role` holds one value per role:
 * a scalar for a single field, an object for several.
 */
export type ParamSpec =
  | FieldSpec
  | (FieldBase & { kind: "trait" })
  | (FieldBase & {
      kind: "per_role"
      roles: Role[]
      of: FieldSpec | FieldSpec[]
    })

/**
 * Whether a population must give its GWAS sample size (`gwas_n`):
 * - `required`: the tool takes a typed N per population.
 * - `unless_n_column`: the tool reads N from the summary statistics, so it's needed only when N isn't mapped.
 * - `optional`: the tool doesn't use it; it's sent when given.
 */
export type GwasNRule = "required" | "unless_n_column" | "optional"

export interface ToolDefinition {
  id: ToolId
  label: string
  status: "live" | "disabled"
  populations: RoleRule[]
  /** A required `N` column may be left unmapped when the population gives its GWAS sample size. */
  columns: { required: string[]; optional: string[] }
  gwasN: GwasNRule
  /** Whether populations with a phenotype file carry traits, and the target a trait to score. */
  hasTraits: boolean
  layouts: FileLayout[]
  /** False for genome-wide-only tools; `chrom` is then always `[]`. */
  chromosomeSelection: boolean
  /** Whether the user lists covariate columns. The ID mapping is asked for whenever a population takes a covariate file. */
  hasCovariateColumns: boolean
  params: ParamSpec[]
  /** The parameters are the same for every run kind, so the form edits them once. */
  paramsSharedAcrossRuns?: boolean
  /** Tools the backend preprocesses once between them; their pre_processing must match. */
  sharesPreprocessingWith?: ToolId
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

export interface PopulationDraft {
  /** Stable across renames; never sent. */
  id: string
  name: string
  role: Role
  gwas_n: number | null
  sumstats_path: string
  sumstats_prefix: string
  genotype_path: string
  phenotype_path: string
  covariate_path: string
  /**
   * The role's optional files the user chose to provide. Only these get a slot, and once
   * included they are required, as the old forms' "include" checkboxes worked.
   */
  included_paths: PathKey[]
  column_mapping: Record<string, string>
  traits: Record<TraitKind, string[]>
}

/** `null` is a number the user hasn't entered yet. */
type Scalar = number | boolean | string | null

export type ParamValue =
  | Scalar
  | Record<string, Scalar | Record<string, Scalar>>

export type ParamValues = Record<string, ParamValue>

export interface GenotypeConfig {
  file_type: FileLayout
  /** Sorted autosomes; `[]` means genome-wide. */
  chrom: number[]
}

export interface IdMapping {
  fid: string
  iid: string
}

export interface ToolDraft {
  tool: ToolId
  populations: PopulationDraft[]
  /**
   * The user saved the population names on the mapping page. Files can't be mapped until
   * they have; editing a name clears it. Never sent.
   */
  names_saved: boolean
  sumstats_file_type: FileLayout
  genotype: GenotypeConfig
  covariates: { columns: string[]; id_mapping: IdMapping }
  params: Record<TraitKind, ParamValues>
}

/** The evaluation type is chosen once per job and applies to every tool. */
export interface JobDraft {
  evaluation_type: EvaluationType
  tools: ToolDraft[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type Step = "mapping" | "configure"

export interface Issue {
  tool: ToolId
  /** Which page can fix it. */
  step: Step
  /** Dotted location in the draft, e.g. `populations.<id>.gwas_n` or `params.binary.phi`. */
  path: string
  message: string
}

// ---------------------------------------------------------------------------
// Wire
// ---------------------------------------------------------------------------

export interface WirePopulation {
  name: string
  role: Role
  /** Sent when given; see `GwasNRule` for when it's required. */
  gwas_n?: number
  sumstats_path?: string
  sumstats_prefix?: string
  genotype_path?: string
  phenotype_path?: string
  covariate_path?: string
  column_mapping?: Record<string, string>
  traits?: Partial<Record<TraitKind, string[]>>
}

export interface WirePreProcessing {
  populations: WirePopulation[]
  sumstats_file_type: FileLayout
  genotype_config: GenotypeConfig
  phenotype_config?: { covariates?: string[]; covariate_id_mapping: IdMapping }
  /**
   * `overwrite_existing` is always true: the backend retries preprocessing in the same job
   * folder on its own, and a retry must not reuse files a failed attempt left half-written.
   */
  options: {
    evaluation_type: EvaluationType
    overwrite_existing: true
  }
}

export interface WireToolBlock {
  pre_processing: WirePreProcessing
  processing: Partial<Record<TraitKind, ParamValues>>
}

export type JobConfig = { tools_to_run: ToolId[] } & Partial<
  Record<ToolId, WireToolBlock>
>
