/**
 * Tests for PRScsx Payload Builder
 *
 * Verifies that the modular builder produces the same output as the monolith.
 */

import { describe, it, expect } from "vitest"
import { buildPrscsxProcessingPayload } from "./prscsx-builder"
import type {
  PrscsxPreProcessingConfig,
  PrscsxProcessingState,
} from "@/components/benchmarking/tool-configuration/types"

describe("buildPrscsxProcessingPayload", () => {
  // Using partial mocks with type cast since builder only uses specific fields
  const mockPreProcessing = {
    populations: [
      { name: "EUR", type: "base" as const },
      { name: "AFR", type: "target" as const },
    ],
    output_dir: "results/preprocessed_data/preprocessed_prscsx_output",
    sumstats_file_type: "merged" as const,
    genotype_config: {
      file_type: "merged" as const,
    },
  } as PrscsxPreProcessingConfig

  const mockProcessingState: PrscsxProcessingState = {
    binary: {
      runPopulation: "AFR",
      nGwas: { EUR: "100000", AFR: "50000" },
      chrom: "22",
      phi: "1e-2",
      phenoColumn: "PHENO",
      genotypeBasename: "geno",
    },
    quantitative: {
      runPopulation: "AFR",
      nGwas: { EUR: "100000", AFR: "50000" },
      chrom: "22",
      phi: "1e-2",
      phenoColumn: "PHENO",
      genotypeBasename: "geno",
    },
  }

  it("should build binary payload with correct output_dir", () => {
    const result = buildPrscsxProcessingPayload(
      mockPreProcessing,
      mockProcessingState,
      "binary"
    )

    expect(result.binary).toBeDefined()
    expect(result.binary?.output_dir).toBe("results/prs_results_binary/prscsx")
    expect(result.binary?.log_dir).toBe("results/log_files_binary/prscsx_log")
    expect(result.quantitative).toBeUndefined()
  })

  it("should build quantitative payload with correct output_dir", () => {
    const result = buildPrscsxProcessingPayload(
      mockPreProcessing,
      mockProcessingState,
      "quantitative"
    )

    expect(result.quantitative).toBeDefined()
    expect(result.quantitative?.output_dir).toBe("results/prs_results/prscsx")
    expect(result.quantitative?.log_dir).toBe("results/log_files/prscsx_log")
    expect(result.binary).toBeUndefined()
  })

  it("should build both payloads when mode is 'both'", () => {
    const result = buildPrscsxProcessingPayload(
      mockPreProcessing,
      mockProcessingState,
      "both"
    )

    expect(result.binary).toBeDefined()
    expect(result.quantitative).toBeDefined()
  })

  it("should include all required fields in payload", () => {
    const result = buildPrscsxProcessingPayload(
      mockPreProcessing,
      mockProcessingState,
      "binary"
    )

    const payload = result.binary
    expect(payload).toBeDefined()

    // Verify all 15+ required fields are present
    expect(payload?.ldref_folder).toBe("ld_ref")
    expect(payload?.bim_prefix).toBeDefined()
    expect(payload?.sst_files).toBeDefined()
    expect(payload?.n_gwas).toBe("100000,50000")
    expect(payload?.populations).toBe("{base_pop},{target_pop}")
    expect(payload?.chrom).toBe("22")
    expect(payload?.phi).toBe("1e-2")
    expect(payload?.out_name).toBe("{base_pop}_{target_pop}")
    expect(payload?.plink_genotype_prefix).toBeDefined()
    expect(payload?.score_choice).toBe("base")
    expect(payload?.pheno).toBeDefined()
    expect(payload?.pheno_column_name).toBe("PHENO")
    expect(payload?.plink_output_prefix).toBeDefined()
    expect(payload?.scoring_population).toBe("AFR")
    expect(payload?.scoring_population_type).toBe("target")
    expect(payload?.population_order).toEqual(["EUR", "AFR"])
  })

  it("should handle multi-chromosome sumstats file type", () => {
    const multiChromPreProcessing: PrscsxPreProcessingConfig = {
      ...mockPreProcessing,
      sumstats_file_type: "multi_chromosome",
    }

    const result = buildPrscsxProcessingPayload(
      multiChromPreProcessing,
      mockProcessingState,
      "binary"
    )

    expect(result.binary?.sst_files).toBeDefined()
    // Multi-chromosome paths should end with /
    const sstFiles = result.binary?.sst_files as string[]
    expect(sstFiles[0]).toMatch(/\/$/)
  })
})
