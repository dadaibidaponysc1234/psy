import type { ToolDefinition } from "@/components/benchmarking/job-config/types"
import {
  EXACTLY_ONE,
  roleRule,
  TRAIT_PARAM,
} from "@/components/benchmarking/tools/shared"

export const sdprx: ToolDefinition = {
  id: "sdprx",
  label: "SDPRX",
  status: "live",
  populations: [
    roleRule("target", "Target", EXACTLY_ONE, {
      required: ["sumstats_path", "genotype_path", "phenotype_path"],
      help: "The population you want to evaluate with SDPRX",
    }),
    roleRule("base", "Base", EXACTLY_ONE, {
      required: ["sumstats_path", "genotype_path", "phenotype_path"],
      help: "Provide the cohort used as the base population for SDPRX",
    }),
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
