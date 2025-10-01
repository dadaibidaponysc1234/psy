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
