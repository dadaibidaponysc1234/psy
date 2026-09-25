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
  | "jointprs"
  | "snpnet"
  | "tlprs"
  | "xpblup"

export type Role = "target" | "base" | "auxiliary" | "validation"

export type TraitKind = "binary" | "quantitative"

export type EvaluationType = TraitKind | "both"

export type FileLayout = "merged" | "multi_chromosome"

export type PathKey =
  | "sumstats_path"
  | "genotype_path"
  | "phenotype_path"
  | "covariate_path"
  | "snp_list_path"
  | "base_model_path"

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
  /** This role's summary-statistics columns, where they differ from the tool's. */
  columns?: ColumnRule
  /** This role's GWAS sample size rule, where it differs from the tool's. */
  gwasN?: GwasNRule
}

export interface ColumnRule {
  required: string[]
  optional: string[]
  /** Sets of optional columns of which at least one must be fully mapped: Z, or both BETA and SE. */
  anyOf?: string[][]
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
 * target's traits of the block's kind. `covariate` is a column of the target's
 * phenotype file the method adjusts for; the chosen ones are also sent as the
 * phenotype's covariates, so preprocessing keeps them. `per_role` holds one value
 * per role: a scalar for a single field, an object for several.
 */
export type ParamSpec =
  | FieldSpec
  | (FieldBase & { kind: "trait" })
  | (FieldBase & { kind: "covariate" })
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
  /** Shown beside the tool on the tool picker. */
  description: string
  /** A disabled tool is built but shown on the picker as coming soon, and can't be selected. */
  status: "live" | "disabled"
  populations: RoleRule[]
  /**
   * The summary-statistics columns each population maps, unless its role sets its own. A required
   * `N` column may be left unmapped when the population gives its GWAS sample size.
   */
  columns: ColumnRule
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
  /** The tool fits on individual-level data, so the target's people are split into training and validation sets. */
  trainValidationSplit?: boolean
  /**
   * The tool fits one trait per job: the evaluation type must be binary or quantitative,
   * and the target ticks exactly one trait.
   */
  singleTrait?: boolean
  /**
   * The column holding the allele that isn't A1 (A2, or REF for BridgePRS), which the backend
   * can fill from a population's genotypes for a dataset whose summary statistics lack it.
   */
  secondAllele?: string
  /** The tool takes LD from a reference panel, so variant IDs must be rsIDs to match it. */
  ldPanel?: boolean
  /** Preprocessing settings, sent in `pre_processing.options` and edited under Genotype Configuration. */
  preprocessingOptions?: FieldSpec[]
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
  /** XPBLUP's C1 list: one variant ID per line, derived from the other population's GWAS. */
  snp_list_path: string
  /** TL-PRS's base model: per-SNP weights (`SNP A1 beta`) from another PRS method. */
  base_model_path: string
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

/**
 * How the target's people are split into training and validation sets: by proportion
 * (`train` is the training share; a seeded hash of FID/IID assigns people), or by a column
 * of the phenotype file labelling each person `train` or `val`. Both methods' values are
 * kept so switching back restores them.
 */
export interface SplitDraft {
  method: "proportions" | "column"
  train: number | null
  seed: number | null
  column: string
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
  /** Only for tools with `trainValidationSplit`. */
  split?: SplitDraft
  /** Only for tools with `preprocessingOptions`. */
  preprocessing?: Record<string, Scalar>
}

/** The evaluation type is chosen once per job and applies to every tool. */
export interface JobDraft {
  evaluation_type: EvaluationType
  tools: ToolDraft[]
  /** The shared dataset the job uses, by name; absent for an upload. Never sent. */
  shared_dataset?: string
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
  snp_list_path?: string
  base_model_path?: string
  /** For a dataset with that quirk: fill the second allele from this population's genotypes. */
  fill_second_allele?: true
  /** For a dataset with that quirk: rename `rsid:pos:a1:a2` IDs to the rsID. */
  map_to_rsid?: true
  column_mapping?: Record<string, string>
  traits?: Partial<Record<TraitKind, string[]>>
  /** On the target, for tools with `trainValidationSplit`. */
  split_config?: WireSplitConfig
}

export type WireSplitConfig =
  | { split_proportions: { train: number; val: number }; seed: number }
  | { split_column: string }

export interface WirePreProcessing {
  populations: WirePopulation[]
  sumstats_file_type: FileLayout
  genotype_config: GenotypeConfig
  phenotype_config?: { covariates?: string[]; covariate_id_mapping?: IdMapping }
  /**
   * `overwrite_existing` is always true: the backend retries preprocessing in the same job
   * folder on its own, and a retry must not reuse files a failed attempt left half-written.
   */
  options: {
    evaluation_type: EvaluationType
    overwrite_existing: true
  } & Record<string, Scalar>
}

export interface WireToolBlock {
  pre_processing: WirePreProcessing
  processing: Partial<Record<TraitKind, ParamValues>>
}

export type JobConfig = { tools_to_run: ToolId[] } & Partial<
  Record<ToolId, WireToolBlock>
>
