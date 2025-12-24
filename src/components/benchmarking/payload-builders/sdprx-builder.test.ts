/**
 * Tests for SDPRX Payload Builder
 */

import { describe, it, expect } from "vitest"
import { buildSdprxProcessingPayload } from "./sdprx-builder"
import { REFERENCE_PATHS } from "@/lib/config"
import type {
  SdprxPreProcessingConfig,
  SdprxProcessingState,
} from "@/components/benchmarking/tool-configuration/types"

describe("buildSdprxProcessingPayload", () => {
  const mockPreProcessing = {
    pop1: { name: "AFR" },
    pop2: { name: "EUR" },
    output_dir: "results/preprocessed_data/preprocessed_sdprx_output",
    sumstats_file_type: "multi_chromosome" as const,
    genotype_config: {
      file_type: "multi_chromosome" as const,
      population_reference: "pop1" as const,
    },
  } as SdprxPreProcessingConfig

  const mockProcessingState = {
    binary: {
      n1: "10000",
      n2: "80000",
      chrom: "22",
      rho: "0.8",
      force_shared: true,
      sdprx_genotype_file: "geno",
    },
    quantitative: {
      n1: "10000",
      n2: "80000",
      chrom: "22",
      rho: "0.8",
      force_shared: true,
      sdprx_genotype_file: "geno",
    },
  } as SdprxProcessingState

  it("should build binary payload with correct output directories", () => {
    const result = buildSdprxProcessingPayload(
      mockPreProcessing,
      mockProcessingState,
      "binary"
    )

    expect(result.binary).toBeDefined()
    expect(result.binary?.output_dir).toBe("results/prs_results_binary/sdprx")
    expect(result.binary?.log_dir).toBe("results/log_files_binary/sdprx_log")
    expect(result.quantitative).toBeUndefined()
  })

  it("should build quantitative payload with correct output directories", () => {
    const result = buildSdprxProcessingPayload(
      mockPreProcessing,
      mockProcessingState,
      "quantitative"
    )

    expect(result.quantitative).toBeDefined()
    expect(result.quantitative?.output_dir).toBe("results/prs_results/sdprx")
    expect(result.quantitative?.log_dir).toBe("results/log_files/sdprx_log")
    expect(result.binary).toBeUndefined()
  })

  it("should include all required fields", () => {
    const result = buildSdprxProcessingPayload(
      mockPreProcessing,
      mockProcessingState,
      "binary"
    )

    const payload = result.binary
    expect(payload?.n1).toBe("10000")
    expect(payload?.n2).toBe("80000")
    expect(payload?.chrom).toBe("22")
    expect(payload?.rho).toBe("0.8")
    expect(payload?.force_shared).toBe(true)
    expect(payload?.ss1).toContain("/sumstats/EUR/")
    expect(payload?.ss2).toContain("/sumstats/AFR/")
    expect(payload?.sdprx_genotype_file).toContain("/genotypes/AFR/")
    expect(payload?.pheno).toContain("pheno_bin_AFR")
    expect(payload?.plink_output_prefix).toBeDefined()
    expect(payload?.score_file).toBe("results_2.txt")
    expect(payload?.load_ld).toBe(REFERENCE_PATHS.SDPRX_LD_REF)
  })

  it("should handle multi-chromosome genotype with plink_genotype_prefix", () => {
    const result = buildSdprxProcessingPayload(
      mockPreProcessing,
      mockProcessingState,
      "binary"
    )

    expect(result.binary?.plink_genotype_prefix).toContain("/genotypes/AFR/")
  })
})
