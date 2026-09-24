import type { ToolDefinition } from "@/components/benchmarking/job-config/types"
import {
  EXACTLY_ONE,
  roleRule,
  TRAIT_PARAM,
} from "@/components/benchmarking/tools/shared"

const ALL_PATHS = ["sumstats_path", "genotype_path", "phenotype_path"] as const

export const sdprx: ToolDefinition = {
  id: "sdprx",
  label: "SDPRX",
  status: "live",
  populations: [
    roleRule("target", "Target", EXACTLY_ONE, [...ALL_PATHS]),
    roleRule("base", "Base", EXACTLY_ONE, [...ALL_PATHS]),
  ],
  columns: { required: ["SNP", "A1", "A2", "N"], optional: [] },
  hasTraits: true,
  layouts: ["merged", "multi_chromosome"],
  chromosomeSelection: true,
  hasCovariateColumns: false,
  params: [
    TRAIT_PARAM,
    { key: "rho", label: "Rho", kind: "number" },
    {
      key: "force_shared",
      label: "Force shared",
      kind: "boolean",
      default: false,
    },
  ],
}
