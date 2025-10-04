export type EvaluationType = "both" | "binary" | "quantitative"

export interface ProcessingOptions {
  evaluation_type: EvaluationType
  process_binary_phenotypes: boolean
  process_quantitative_phenotypes: boolean
  skip_missing_columns: boolean
  overwrite_existing: boolean
}

export interface PrsicePopulationConfig {
  name: string
  sumstats_path: string
  genotype_path: string
  phenotype_path: string
}

export interface PrsicePhenotypePopulationConfig {
  binary_traits: string[]
  quantitative_traits: string[]
}

export interface PrsicePhenotypeConfig {
  target_population: PrsicePhenotypePopulationConfig
  source_population: PrsicePhenotypePopulationConfig
}

export interface PrsiceGenotypeConfig {
  file_type: "merged" | "split_by_chromosome"
  population_reference: "target_population" | "source_population"
  file_patterns: {
    bed: string
    bim: string
    fam: string
  }
}

export interface PrsicePreProcessingConfig {
  target_population: PrsicePopulationConfig
  source_population: PrsicePopulationConfig
  output_dir: string
  column_mappings: Record<string, string>
  phenotype_config: PrsicePhenotypeConfig
  genotype_config: PrsiceGenotypeConfig
  options: ProcessingOptions
}

export type PrscsxColumnKey = "SNP" | "A1" | "A2" | "BETA" | "P"

export interface PrscsxPopulationConfig {
  name: string
  type?: "target" | "base"
  sumstats_path: string
  genotype_path?: string
  phenotype_path?: string
  covariate_path?: string
}

export interface PrscsxPhenotypePopulationConfig {
  binary_traits: string[]
  quantitative_traits: string[]
}

export interface PrscsxPhenotypeConfig {
  by_population: Record<string, PrscsxPhenotypePopulationConfig>
  covariate_id_mapping: Record<string, string>
}

export interface PrscsxColumnMappings {
  by_population: Record<string, Partial<Record<PrscsxColumnKey, string>>>
}

export interface PrscsxGenotypeConfig {
  file_type: "merged" | "split_by_chromosome"
}

export interface PrscsxPreProcessingConfig {
  populations: PrscsxPopulationConfig[]
  column_mappings: PrscsxColumnMappings
  phenotype_config: PrscsxPhenotypeConfig
  genotype_config: PrscsxGenotypeConfig
  options: ProcessingOptions
  output_dir: string
}

export interface PrscsxProcessingModeState {
  runPopulation: string
  chrom: string
  phi: string
  phenoColumn: string
  nGwas: Record<string, string>
}

export interface PrscsxProcessingState {
  binary: PrscsxProcessingModeState
  quantitative: PrscsxProcessingModeState
}

export interface PrscsxProcessingModePayload {
  ldref_folder: string
  bim_prefix: string
  sst_files: string[]
  n_gwas: string
  populations: string
  chrom: string
  phi: string
  out_name: string
  output_dir: string
  plink_genotype_prefix: string
  score_choice: string
  pheno: string
  pheno_column_name: string
  plink_output_prefix: string
  log_dir: string
  scoring_population?: string
  scoring_population_type?: "target" | "base"
  population_order?: string[]
}

export interface PrscsxProcessingPayload {
  binary?: PrscsxProcessingModePayload
  quantitative?: PrscsxProcessingModePayload
}

export type ToolPreProcessingConfig =
  | PrsicePreProcessingConfig
  | PrscsxPreProcessingConfig
  | BridgeprsPreProcessingConfig
  | SdprxPreProcessingConfig

export type BridgeprsColumnKey =
  | "CHR"
  | "ID"
  | "PS"
  | "A1"
  | "REF"
  | "BETA"
  | "SE"
  | "P"
  | "N"

export interface BridgeprsPopulationConfig {
  name: string
  sumstats_path: string
  genotype_path: string
  phenotype_path: string
}

export interface BridgeprsPhenotypeTraits {
  binary_traits: string[]
  quantitative_traits: string[]
}

export interface BridgeprsPhenotypeConfig {
  pop1: BridgeprsPhenotypeTraits
  pop2: BridgeprsPhenotypeTraits
}

export interface BridgeprsGenotypeConfig {
  file_type: "merged" | "split_by_chromosome"
  population_reference: "pop1" | "pop2"
  file_patterns: {
    bed: string
    bim: string
    fam: string
  }
}

export interface BridgeprsPreProcessingConfig {
  pop1: BridgeprsPopulationConfig
  pop2: BridgeprsPopulationConfig
  genotype_path: string
  output_dir: string
  column_mappings: Partial<Record<BridgeprsColumnKey, string>>
  fixed_N?: number | null
  genotype_config: BridgeprsGenotypeConfig
  phenotype_config: BridgeprsPhenotypeConfig
  options: ProcessingOptions
}

// BridgePRS processing types (values editable, paths fixed in builder)
export interface BridgeprsProcessingModeState {
  bridgeprs_phenotype: string
  fst: string
  sumstats_size_EUR: string
  sumstats_size_AFR: string
}

export interface BridgeprsProcessingState {
  binary: BridgeprsProcessingModeState
  quantitative: BridgeprsProcessingModeState
}

export interface BridgeprsProcessingModePayload {
  bridgeprs_phenotype: string
  fst: string
  preprocessed_inputs: string
  ldref_bridgeprs: string
  sumstats_prefix_EUR: string
  sumstats_size_EUR: string
  genotype_prefix_EUR: string
  phenotype_file_EUR: string
  sumstats_prefix_AFR: string
  sumstats_size_AFR: string
  genotype_prefix_AFR: string
  phenotype_file_AFR: string
  bridgeprs_output_dir: string
  input_bridgeprs_data: string
  log_dir: string
}

export interface BridgeprsProcessingPayload {
  binary?: BridgeprsProcessingModePayload
  quantitative?: BridgeprsProcessingModePayload
}

// SDPRX types
export interface SdprxPopulationConfig {
  name: string
  sumstats_path: string
  genotype_path: string
  phenotype_path: string
}

export interface SdprxPhenotypeTraits {
  binary_traits: string[]
  quantitative_traits: string[]
}

export interface SdprxPhenotypeConfig {
  pop1: SdprxPhenotypeTraits
  pop2: SdprxPhenotypeTraits
}

export interface SdprxGenotypeConfig {
  file_type: "merged" | "split_by_chromosome"
  // Optional to maintain backward compatibility in UI; schema may omit this
  population_reference?: "pop1" | "pop2"
  file_patterns: {
    bed: string
    bim: string
    fam: string
  }
}

export type SdprxColumnKey = "SNP" | "A1" | "A2" | "N" | "Z"

export interface SdprxPreProcessingConfig {
  pop1: SdprxPopulationConfig
  pop2: SdprxPopulationConfig
  genotype_path: string
  output_dir: string
  column_mappings: Partial<Record<SdprxColumnKey, string>>
  fixed_N1?: string
  fixed_N2?: string
  genotype_config: SdprxGenotypeConfig
  phenotype_config: SdprxPhenotypeConfig
  covariate_config?: {
    pop1: string[]
    pop2: string[]
  }
  options: ProcessingOptions
}

export interface SdprxProcessingModeState {
  ss1: string
  ss2: string
  sdprx_genotype_file: string
  n1: string
  n2: string
  force_shared: boolean
  load_ld: string
  valid: string
  chrom: string
  rho: string
  output_dir: string
  score_file: string
  plink_output_prefix: string
  pheno: string
  log_dir: string
}

export interface SdprxProcessingState {
  binary: SdprxProcessingModeState
  quantitative: SdprxProcessingModeState
}

// SDPRX processing payload types (mirrors state keys used by builder)
export interface SdprxProcessingModePayload {
  ss1: string
  ss2: string
  sdprx_genotype_file: string
  n1: string
  n2: string
  force_shared: boolean
  load_ld: string
  valid: string
  chrom: string
  rho: string
  output_dir: string
  score_file: string
  plink_output_prefix: string
  pheno: string
  log_dir: string
}

export interface SdprxProcessingPayload {
  binary?: SdprxProcessingModePayload
  quantitative?: SdprxProcessingModePayload
}
