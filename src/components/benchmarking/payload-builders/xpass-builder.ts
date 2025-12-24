/**
 * XPASS Payload Builder
 *
 * Builds API payloads for XPASS and XPASS+ tools.
 * Supports both binary and quantitative evaluation modes.
 *
 * Note: clump_params and use_pop_snps are XPASS+ only features.
 */

import type {
  EvaluationType,
  XpassPreProcessingConfig,
  XpassProcessingState,
  XpassProcessingPayload,
  XpassProcessingModePayload,
} from "@/components/benchmarking/tool-configuration/types"

/**
 * Build processing payload for XPASS
 *
 * XPASS does NOT include clump_params or use_pop_snps options.
 * Those are XPASS+ specific.
 */
export function buildXpassProcessingPayload(
  preProcessing: XpassPreProcessingConfig,
  processingState?: XpassProcessingState,
  mode?: EvaluationType
): XpassProcessingPayload {
  const normalize = (value?: string) => (value || "").replace(/\\/g, "/").trim()

  const target = preProcessing.populations.find((p) => p.type === "target")
  const auxiliary = preProcessing.populations.find(
    (p) => p.type === "auxiliary"
  )

  const preOutDir =
    normalize(preProcessing.output_dir) ||
    "results/preprocessed_data/preprocessed_xpass_output"
  const sumstatsType = preProcessing.sumstats_file_type || "merged"
  const genotypeType = preProcessing.genotype_config?.file_type || "merged"

  const sumstatsPathFor = (populationName: string) =>
    sumstatsType === "multi_chromosome"
      ? `${preOutDir}/sumstats/${populationName}/`
      : `${preOutDir}/sumstats/${populationName}/${populationName}_sumstats.txt`

  const genotypePathFor = (populationName: string) =>
    genotypeType === "multi_chromosome"
      ? `${preOutDir}/genotypes/${populationName}/`
      : `${preOutDir}/genotypes/${populationName}/geno`

  const targetData = target ? sumstatsPathFor(target.name) : ""
  const auxiliaryData = auxiliary ? sumstatsPathFor(auxiliary.name) : ""
  const refPop1Path = target ? genotypePathFor(target.name) : ""
  const refPop2Path = auxiliary ? genotypePathFor(auxiliary.name) : ""
  const testDataPath = refPop1Path

  const compPRS = processingState?.compPRS ?? "T"
  const compPosMean = processingState?.compPosMean ?? "T"
  const sdMethod = normalize(processingState?.sd_method) || "LD_block"
  const outputName = normalize(processingState?.outputName) || "xpass"
  const xpassPop1 = normalize(processingState?.xpass_pop1) || target?.name || ""

  // Build mode-specific payload (no clump_params for XPASS)
  const buildModePayload = (isBinary: boolean): XpassProcessingModePayload => {
    const outputDir = isBinary
      ? "results/prs_results_binary/xpass"
      : normalize(processingState?.output_dir) || "results/prs_results/xpass"
    const logDir = isBinary
      ? "results/log_files_binary/xpass"
      : normalize(processingState?.log_dir) || "results/log_files/xpass"

    return {
      target_data: targetData,
      auxillary_data: auxiliaryData,
      ref_pop1: refPop1Path,
      ref_pop2: refPop2Path,
      test_data: testDataPath,
      compPRS,
      sd_method: sdMethod,
      compPosMean,
      outputName,
      xpass_pop1: xpassPop1,
      output_dir: outputDir,
      log_dir: logDir,
    }
  }

  const result: XpassProcessingPayload = {}
  const evalMode = mode || "both"

  if (evalMode === "quantitative" || evalMode === "both") {
    result.quantitative = buildModePayload(false)
  }
  if (evalMode === "binary" || evalMode === "both") {
    result.binary = buildModePayload(true)
  }

  return result
}

/**
 * Build processing payload for XPASS+
 *
 * XPASS+ includes clump_params and use_pop_snps options that XPASS doesn't have.
 */
export function buildXpassPlusProcessingPayload(
  preProcessing: XpassPreProcessingConfig,
  processingState?: XpassProcessingState,
  mode?: EvaluationType
): XpassProcessingPayload {
  const normalize = (value?: string) => (value || "").replace(/\\/g, "/").trim()

  // Get target population for ref_pop1
  const target = preProcessing.populations.find((p) => p.type === "target")
  const preOutDir =
    normalize(preProcessing.output_dir) ||
    "results/preprocessed_data/preprocessed_xpass_output"
  const genotypeType = preProcessing.genotype_config?.file_type || "merged"
  const genotypePathFor = (populationName: string) =>
    genotypeType === "multi_chromosome"
      ? `${preOutDir}/genotypes/${populationName}/`
      : `${preOutDir}/genotypes/${populationName}/geno`
  const refPop1Path = target ? genotypePathFor(target.name) : ""

  // Build merged state with XPASS+ defaults
  const mergedState: XpassProcessingState = {
    compPRS: "T",
    sd_method: "LD_block",
    compPosMean: processingState?.compPosMean ?? "T",
    outputName: "xpass_plus",
    chrom: processingState?.chrom,
    output_dir: "results/prs_results/xpass+",
    log_dir: "results/log_files/xpass+",
    clump_params: processingState?.clump_params,
    use_pop1_snps: processingState?.use_pop1_snps,
    use_pop2_snps: processingState?.use_pop2_snps,
  }

  // Get base payload from XPASS builder
  const basePayload = buildXpassProcessingPayload(
    preProcessing,
    mergedState,
    mode
  )

  // XPASS+ specific additions: clump_params and use_pop_snps
  const clumpParams = processingState?.clump_params
  const usePop1Snps = processingState?.use_pop1_snps
  const usePop2Snps = processingState?.use_pop2_snps

  const xpassPlusExtras = {
    ...(clumpParams
      ? {
          clump_params: {
            pop1: {
              kb: Number(clumpParams.pop1?.kb ?? 1000),
              r2: Number(clumpParams.pop1?.r2 ?? 0.1),
              p: Number(clumpParams.pop1?.p ?? 0.05),
            },
            pop2: {
              kb: Number(clumpParams.pop2?.kb ?? 1000),
              r2: Number(clumpParams.pop2?.r2 ?? 0.1),
              p: Number(clumpParams.pop2?.p ?? 0.05),
            },
          },
        }
      : {}),
    ...(usePop1Snps != null ? { use_pop1_snps: Boolean(usePop1Snps) } : {}),
    ...(usePop2Snps != null ? { use_pop2_snps: Boolean(usePop2Snps) } : {}),
  }

  // Apply XPASS+ specific modifications
  const result: XpassProcessingPayload = {}
  const evalMode = mode || "both"

  if (
    (evalMode === "quantitative" || evalMode === "both") &&
    basePayload.quantitative
  ) {
    result.quantitative = {
      ...basePayload.quantitative,
      test_data: refPop1Path,
      outputName: "xpass_plus",
      output_dir: "results/prs_results/xpass+",
      log_dir: "results/log_files/xpass+",
      ...xpassPlusExtras,
    }
  }
  if ((evalMode === "binary" || evalMode === "both") && basePayload.binary) {
    result.binary = {
      ...basePayload.binary,
      test_data: refPop1Path,
      outputName: "xpass_plus",
      output_dir: "results/prs_results_binary/xpass+",
      log_dir: "results/log_files_binary/xpass+",
      ...xpassPlusExtras,
    }
  }

  return result
}
