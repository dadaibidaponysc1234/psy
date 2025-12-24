/**
 * PRScsx Payload Builder
 *
 * Builds API payloads for PRScsx tool processing.
 * Matches the monolith implementation in payload-builders.ts (lines 496-616)
 */

import type {
  EvaluationType,
  PrscsxProcessingPayload,
  PrscsxPreProcessingConfig,
  PrscsxProcessingState,
} from "@/components/benchmarking/tool-configuration/types"
import { REFERENCE_PATHS } from "@/lib/config"

type ProcessingModeKey = "binary" | "quantitative"

/**
 * Build processing payload for PRScsx
 *
 * This function constructs the API payload for PRScsx processing,
 * handling both binary and quantitative evaluation modes.
 */
export function buildPrscsxProcessingPayload(
  preProcessing: PrscsxPreProcessingConfig,
  processingState: PrscsxProcessingState,
  mode: EvaluationType
): PrscsxProcessingPayload {
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
      ldref_folder: REFERENCE_PATHS.PRSCSX_LD_REF,
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
      scoring_population_type: selectedType as "target" | "base",
      population_order: populationNames,
    }

    return payload
  }

  if (mode === "binary" || mode === "both") {
    const payload = buildModePayload("binary")
    if (payload) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.binary = payload as any
    }
  }

  if (mode === "quantitative" || mode === "both") {
    const payload = buildModePayload("quantitative")
    if (payload) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.quantitative = payload as any
    }
  }

  return result
}
