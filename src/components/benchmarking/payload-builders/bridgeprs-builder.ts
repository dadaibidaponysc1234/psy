/**
 * BridgePRS Payload Builder
 *
 * Builds API payloads for BridgePRS tool processing.
 * Matches the monolith implementation in payload-builders.ts (lines 746-876)
 */

import type {
  EvaluationType,
  BridgeprsPreProcessingConfig,
  BridgeprsProcessingPayload,
  BridgeprsProcessingState,
} from "@/components/benchmarking/tool-configuration/types"
import { REFERENCE_PATHS } from "@/lib/config"

/**
 * Build processing payload for BridgePRS
 *
 * This function constructs the API payload for BridgePRS processing,
 * handling both binary and quantitative evaluation modes.
 */
export function buildBridgeprsProcessingPayload(
  preProcessing: BridgeprsPreProcessingConfig,
  processingState: BridgeprsProcessingState,
  mode: EvaluationType
): BridgeprsProcessingPayload {
  const result: BridgeprsProcessingPayload = {}

  const normalize = (p: string | undefined) => (p || "").replace(/\\/g, "/")

  const pop1 = (preProcessing?.pop1?.name || "").trim()
  const pop2 = (preProcessing?.pop2?.name || "").trim()
  const preOutDir =
    normalize(preProcessing?.output_dir) ||
    "results/preprocessed_data/preprocessed_bridgeprs_output"

  const buildModePayload = (key: keyof BridgeprsProcessingState) => {
    const state = processingState[key]
    if (!state) return null

    const isBinary = key === "binary"

    const phenotype = (state.bridgeprs_phenotype || "").trim()
    const fst = (state.fst || "").trim()
    const nBase = (state.sumstats_size_EUR || "").trim()
    const nTarget = (state.sumstats_size_AFR || "").trim()

    const preprocessedInputs = `${preOutDir}`
    // Note: This should be configurable in the UI, but using a default for now
    const ldrefBridgeprs = REFERENCE_PATHS.BRIDGEPRS_LD_REF

    const sumstatsPrefixBase = `${preOutDir}/sumstats/${pop2}/`
    const sumstatsPrefixTarget = `${preOutDir}/sumstats/${pop1}/`

    // Genotype: merged uses user-provided BASENAME; multi-chromosome uses the population folder (no basename)
    const genotypeFileType =
      preProcessing?.genotype_config?.file_type || "merged"
    const isMergedGenotype = genotypeFileType === "merged"
    // eslint-disable-next-line
    const mergedPrefixRaw = (state as any).bridgeprs_genotype_file
      ? String((state as any).bridgeprs_genotype_file)
      : ""
    const mergedPrefixBasename =
      mergedPrefixRaw
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

    const outDir = isBinary
      ? "results/prs_results_binary/bridgeprs"
      : "results/prs_results/bridgeprs"
    const inputBridgeprsData = `${outDir}/config_files`
    const logDir = isBinary
      ? "results/log_files_binary/bridgeprs_log"
      : "results/log_files/bridgeprs_log"

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
      // eslint-disable-next-line
      result.binary = payload as any
    }
  }

  if (mode === "quantitative" || mode === "both") {
    const payload = buildModePayload("quantitative")
    if (payload) {
      // eslint-disable-next-line
      result.quantitative = payload as any
    }
  }

  return result
}
