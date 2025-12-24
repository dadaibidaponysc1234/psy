/**
 * SDPRX Payload Builder
 *
 * Builds API payloads for SDPRX tool processing.
 * Matches the monolith implementation in payload-builders.ts (lines 618-744)
 */

import type {
  EvaluationType,
  SdprxPreProcessingConfig,
  SdprxProcessingPayload,
  SdprxProcessingState,
} from "@/components/benchmarking/tool-configuration/types"
import { REFERENCE_PATHS } from "@/lib/config"

/**
 * Build processing payload for SDPRX
 *
 * This function constructs the API payload for SDPRX processing,
 * handling both binary and quantitative evaluation modes.
 */
export function buildSdprxProcessingPayload(
  preProcessing: SdprxPreProcessingConfig,
  processingState: SdprxProcessingState,
  mode: EvaluationType
): SdprxProcessingPayload {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
