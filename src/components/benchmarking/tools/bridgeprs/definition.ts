import type { ToolDefinition } from "@/components/benchmarking/job-config/types"
import {
  EXACTLY_ONE,
  roleRule,
  TRAIT_PARAM,
} from "@/components/benchmarking/tools/shared"

const ALL_PATHS = ["sumstats_path", "genotype_path", "phenotype_path"] as const

export const bridgeprs: ToolDefinition = {
  id: "bridgeprs",
  label: "BridgePRS",
  status: "live",
  populations: [
    roleRule("target", "Target", EXACTLY_ONE, [...ALL_PATHS]),
    roleRule("base", "Base", EXACTLY_ONE, [...ALL_PATHS]),
  ],
  columns: {
    required: ["CHR", "ID", "PS", "A1", "REF", "BETA", "SE", "P", "N"],
    optional: [],
  },
  hasTraits: true,
  layouts: ["merged", "multi_chromosome"],
  // Genome-wide only: the LD panel and the summary statistics must both hold 1-22.
  chromosomeSelection: false,
  hasCovariateColumns: false,
  params: [
    TRAIT_PARAM,
    { key: "fst", label: "Fst", kind: "number", default: 0.1 },
  ],
}
