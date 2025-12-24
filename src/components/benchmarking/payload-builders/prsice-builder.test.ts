/**
 * Tests for PRSice Payload Builder
 */

import { describe, it, expect } from "vitest"
import { buildPrsiceProcessingPayload } from "./prsice-builder"
import type { PrsicePreProcessingConfig } from "@/components/benchmarking/tool-configuration/types"

describe("buildPrsiceProcessingPayload", () => {
  const mockPreProcessing = {
    target_population: { name: "AFR" },
    source_population: { name: "EUR" },
    output_dir: "results/preprocessed_data/preprocessed_prsice_output",
    sumstats_file_type: "multi_chromosome" as const,
  } as PrsicePreProcessingConfig

  it("should build binary payload with correct output directories", () => {
    const result = buildPrsiceProcessingPayload(mockPreProcessing, "binary")

    expect(result.binary).toBeDefined()
    expect(result.binary?.output_dir).toBe("results/prs_results_binary/prsice")
    expect(result.binary?.log_dir).toBe("results/log_files_binary/prsice_log")
    expect(result.binary?.binary_target).toBe("T")
    expect(result.quantitative).toBeUndefined()
  })

  it("should build quantitative payload with correct output directories", () => {
    const result = buildPrsiceProcessingPayload(
      mockPreProcessing,
      "quantitative"
    )

    expect(result.quantitative).toBeDefined()
    expect(result.quantitative?.output_dir).toBe("results/prs_results/prsice")
    expect(result.quantitative?.log_dir).toBe("results/log_files/prsice_log")
    expect(result.quantitative?.binary_target).toBe("F")
    expect(result.binary).toBeUndefined()
  })

  it("should build both payloads when mode is 'both'", () => {
    const result = buildPrsiceProcessingPayload(mockPreProcessing, "both")

    expect(result.binary).toBeDefined()
    expect(result.quantitative).toBeDefined()
  })

  it("should include all required fields", () => {
    const result = buildPrsiceProcessingPayload(mockPreProcessing, "binary")

    const payload = result.binary
    expect(payload?.input_prsice_data).toBeDefined()
    expect(payload?.sumstats).toContain("/sumstats/AFR/")
    expect(payload?.target_data).toContain("/genotypes/AFR/")
    expect(payload?.pheno).toContain("pheno_bin_AFR")
    expect(payload?.threads).toBe(1)
    expect(payload?.stat).toBe("BETA")
  })

  it("should handle multi-chromosome sumstats paths", () => {
    const result = buildPrsiceProcessingPayload(mockPreProcessing, "binary")

    // Multi-chromosome paths should end with /
    expect(result.binary?.sumstats).toMatch(/\/$/)
  })
})
