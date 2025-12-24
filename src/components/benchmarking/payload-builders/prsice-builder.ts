/**
 * PRSice Payload Builder
 *
 * Builds API payloads for PRSice tool.
 */

import type {
  EvaluationType,
  PrsicePreProcessingConfig,
  PrsiceProcessingPayload,
  PrsiceProcessingModePayload,
} from "@/components/benchmarking/tool-configuration/types"

/**
 * Build processing payload for PRSice
 */
export function buildPrsiceProcessingPayload(
  preProcessing: PrsicePreProcessingConfig,
  mode: EvaluationType
): PrsiceProcessingPayload {
  const normalize = (p: string | undefined) => (p || "").replace(/\\/g, "/")

  const target = (preProcessing?.target_population?.name || "").trim()
  const base = (preProcessing?.source_population?.name || "").trim()
  const preOutDir =
    normalize(preProcessing?.output_dir) ||
    "results/preprocessed_data/preprocessed_prsice_output"
  const sumstatsFileType = preProcessing?.sumstats_file_type || "merged"

  const result: PrsiceProcessingPayload = {}

  const buildQuant = (): PrsiceProcessingModePayload | null => {
    const sumstats =
      sumstatsFileType === "multi_chromosome"
        ? `${preOutDir}/sumstats/${target}/`
        : `${preOutDir}/sumstats/${target}/${target}_sumstats.txt`
    const targetData = `${preOutDir}/genotypes/${target}/`
    const pheno = `${preOutDir}/phenotypes/pheno_quant_${target}.txt`
    const required = [target, base, sumstats, targetData, pheno]
    if (required.some((v) => !v)) return null
    return {
      input_prsice_data: preOutDir,
      sumstats,
      target_data: targetData,
      pheno,
      threads: 1,
      stat: "BETA",
      binary_target: "F",
      output_dir: "results/prs_results/prsice",
      log_dir: "results/log_files/prsice_log",
    }
  }

  const buildBinary = (): PrsiceProcessingModePayload | null => {
    const sumstats =
      sumstatsFileType === "multi_chromosome"
        ? `${preOutDir}/sumstats/${target}/`
        : `${preOutDir}/sumstats/${target}/${target}_sumstats.txt`
    const targetData = `${preOutDir}/genotypes/${target}/`
    const pheno = `${preOutDir}/phenotypes/pheno_bin_${target}.txt`
    const required = [target, base, sumstats, targetData, pheno]
    if (required.some((v) => !v)) return null
    return {
      input_prsice_data: preOutDir,
      sumstats,
      target_data: targetData,
      pheno,
      threads: 1,
      stat: "BETA",
      binary_target: "T",
      output_dir: "results/prs_results_binary/prsice",
      log_dir: "results/log_files_binary/prsice_log",
    }
  }

  if (mode === "quantitative" || mode === "both") {
    const payload = buildQuant()
    if (payload) result.quantitative = payload
  }
  if (mode === "binary" || mode === "both") {
    const payload = buildBinary()
    if (payload) result.binary = payload
  }

  return result
}
