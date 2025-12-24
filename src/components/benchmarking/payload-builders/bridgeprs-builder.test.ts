/**
 * Tests for BridgePRS Payload Builder
 */

import { describe, it, expect } from "vitest"
import { buildBridgeprsProcessingPayload } from "./bridgeprs-builder"
import type {
  BridgeprsPreProcessingConfig,
  BridgeprsProcessingState,
} from "@/components/benchmarking/tool-configuration/types"

describe("buildBridgeprsProcessingPayload", () => {
  const mockPreProcessing = {
    pop1: { name: "AFR" },
    pop2: { name: "EUR" },
    output_dir: "results/preprocessed_data/preprocessed_bridgeprs_output",
    sumstats_file_type: "multi_chromosome" as const,
    genotype_config: {
      file_type: "multi_chromosome" as const,
    },
  } as BridgeprsPreProcessingConfig

  const mockProcessingState = {
    binary: {
      bridgeprs_phenotype: "y.binary",
      fst: "0.1",
      sumstats_size_EUR: "80000",
      sumstats_size_AFR: "10000",
      bridgeprs_genotype_file: "geno",
    },
    quantitative: {
      bridgeprs_phenotype: "y",
      fst: "0.1",
      sumstats_size_EUR: "80000",
      sumstats_size_AFR: "10000",
      bridgeprs_genotype_file: "geno",
    },
  } as BridgeprsProcessingState

  it("should build binary payload with correct output directories", () => {
    const result = buildBridgeprsProcessingPayload(
      mockPreProcessing,
      mockProcessingState,
      "binary"
    )

    expect(result.binary).toBeDefined()
    expect(result.binary?.bridgeprs_output_dir).toBe(
      "results/prs_results_binary/bridgeprs"
    )
    expect(result.binary?.log_dir).toBe(
      "results/log_files_binary/bridgeprs_log"
    )
    expect(result.quantitative).toBeUndefined()
  })

  it("should build quantitative payload with correct output directories", () => {
    const result = buildBridgeprsProcessingPayload(
      mockPreProcessing,
      mockProcessingState,
      "quantitative"
    )

    expect(result.quantitative).toBeDefined()
    expect(result.quantitative?.bridgeprs_output_dir).toBe(
      "results/prs_results/bridgeprs"
    )
    expect(result.quantitative?.log_dir).toBe("results/log_files/bridgeprs_log")
    expect(result.binary).toBeUndefined()
  })

  it("should include all required fields", () => {
    const result = buildBridgeprsProcessingPayload(
      mockPreProcessing,
      mockProcessingState,
      "binary"
    )

    const payload = result.binary
    expect(payload?.bridgeprs_phenotype).toBe("y.binary")
    expect(payload?.fst).toBe("0.1")
    expect(payload?.sumstats_size_EUR).toBe("80000")
    expect(payload?.sumstats_size_AFR).toBe("10000")
    expect(payload?.sumstats_prefix_EUR).toContain("/sumstats/EUR/")
    expect(payload?.sumstats_prefix_AFR).toContain("/sumstats/AFR/")
    expect(payload?.genotype_prefix_EUR).toContain("/genotypes/EUR/")
    expect(payload?.genotype_prefix_AFR).toContain("/genotypes/AFR/")
    expect(payload?.phenotype_file_EUR).toContain("pheno_bin_EUR")
    expect(payload?.phenotype_file_AFR).toContain("pheno_bin_AFR")
    expect(payload?.input_bridgeprs_data).toBeDefined()
    expect(payload?.ldref_bridgeprs).toBeDefined()
  })
})
