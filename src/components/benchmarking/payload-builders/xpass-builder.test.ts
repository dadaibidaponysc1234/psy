/**
 * Tests for XPASS and XPASS+ Payload Builders
 */

import { describe, it, expect } from "vitest"
import {
  buildXpassProcessingPayload,
  buildXpassPlusProcessingPayload,
} from "./xpass-builder"
import type { XpassPreProcessingConfig } from "@/components/benchmarking/tool-configuration/types"

describe("buildXpassProcessingPayload", () => {
  const mockPreProcessing = {
    populations: [
      { name: "AFR", type: "target" as const },
      { name: "EUR", type: "auxiliary" as const },
    ],
    output_dir: "results/preprocessed_data/preprocessed_xpass_output",
    sumstats_file_type: "multi_chromosome" as const,
    genotype_config: {
      file_type: "multi_chromosome" as const,
    },
  } as XpassPreProcessingConfig

  it("should build binary payload with correct output directories", () => {
    const result = buildXpassProcessingPayload(
      mockPreProcessing,
      undefined,
      "binary"
    )

    expect(result.binary).toBeDefined()
    expect(result.binary?.output_dir).toBe("results/prs_results_binary/xpass")
    expect(result.binary?.log_dir).toBe("results/log_files_binary/xpass")
    expect(result.quantitative).toBeUndefined()
  })

  it("should build quantitative payload with correct output directories", () => {
    const result = buildXpassProcessingPayload(
      mockPreProcessing,
      undefined,
      "quantitative"
    )

    expect(result.quantitative).toBeDefined()
    expect(result.quantitative?.output_dir).toBe("results/prs_results/xpass")
    expect(result.quantitative?.log_dir).toBe("results/log_files/xpass")
    expect(result.binary).toBeUndefined()
  })

  it("should build both payloads when mode is 'both'", () => {
    const result = buildXpassProcessingPayload(
      mockPreProcessing,
      undefined,
      "both"
    )

    expect(result.binary).toBeDefined()
    expect(result.quantitative).toBeDefined()
  })

  it("should include all required fields", () => {
    const result = buildXpassProcessingPayload(
      mockPreProcessing,
      undefined,
      "binary"
    )

    const payload = result.binary
    expect(payload?.target_data).toContain("/sumstats/AFR/")
    expect(payload?.auxillary_data).toContain("/sumstats/EUR/")
    expect(payload?.ref_pop1).toContain("/genotypes/AFR/")
    expect(payload?.ref_pop2).toContain("/genotypes/EUR/")
    expect(payload?.test_data).toBeDefined()
    expect(payload?.compPRS).toBe("T")
    expect(payload?.sd_method).toBe("LD_block")
    expect(payload?.compPosMean).toBe("T")
    expect(payload?.outputName).toBe("xpass")
    expect(payload?.xpass_pop1).toBe("AFR")
  })

  it("should NOT include clump_params (XPASS+ only)", () => {
    const result = buildXpassProcessingPayload(
      mockPreProcessing,
      undefined,
      "binary"
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.binary as any)?.clump_params).toBeUndefined()
  })
})

describe("buildXpassPlusProcessingPayload", () => {
  const mockPreProcessing = {
    populations: [
      { name: "AFR", type: "target" as const },
      { name: "EUR", type: "auxiliary" as const },
    ],
    output_dir: "results/preprocessed_data/preprocessed_xpass_output",
    sumstats_file_type: "multi_chromosome" as const,
    genotype_config: {
      file_type: "multi_chromosome" as const,
    },
  } as XpassPreProcessingConfig

  const mockProcessingState = {
    clump_params: {
      pop1: { kb: 1000, r2: 0.1, p: 0.05 },
      pop2: { kb: 1000, r2: 0.1, p: 0.05 },
    },
    use_pop1_snps: true,
    use_pop2_snps: true,
  }

  it("should build binary payload with XPASS+ output directories", () => {
    const result = buildXpassPlusProcessingPayload(
      mockPreProcessing,
      mockProcessingState,
      "binary"
    )

    expect(result.binary).toBeDefined()
    expect(result.binary?.output_dir).toBe("results/prs_results_binary/xpass+")
    expect(result.binary?.log_dir).toBe("results/log_files_binary/xpass+")
    expect(result.binary?.outputName).toBe("xpass_plus")
  })

  it("should build quantitative payload with XPASS+ output directories", () => {
    const result = buildXpassPlusProcessingPayload(
      mockPreProcessing,
      mockProcessingState,
      "quantitative"
    )

    expect(result.quantitative).toBeDefined()
    expect(result.quantitative?.output_dir).toBe("results/prs_results/xpass+")
    expect(result.quantitative?.log_dir).toBe("results/log_files/xpass+")
    expect(result.quantitative?.outputName).toBe("xpass_plus")
  })

  it("should include clump_params when provided", () => {
    const result = buildXpassPlusProcessingPayload(
      mockPreProcessing,
      mockProcessingState,
      "binary"
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = result.binary as any

    expect(payload?.clump_params).toBeDefined()
    expect(payload?.clump_params?.pop1?.kb).toBe(1000)
    expect(payload?.clump_params?.pop1?.r2).toBe(0.1)
    expect(payload?.clump_params?.pop1?.p).toBe(0.05)
    expect(payload?.clump_params?.pop2?.kb).toBe(1000)
  })

  it("should include use_pop_snps when provided", () => {
    const result = buildXpassPlusProcessingPayload(
      mockPreProcessing,
      mockProcessingState,
      "binary"
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = result.binary as any

    expect(payload?.use_pop1_snps).toBe(true)
    expect(payload?.use_pop2_snps).toBe(true)
  })
})
