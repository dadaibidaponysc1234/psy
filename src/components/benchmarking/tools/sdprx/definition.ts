import type { ToolDefinition } from "@/components/benchmarking/job-config/types"
import {
  EXACTLY_ONE,
  roleRule,
  TRAIT_PARAM,
  Z_SCORE_COLUMNS,
} from "@/components/benchmarking/tools/shared"

export const sdprx: ToolDefinition = {
  id: "sdprx",
  label: "SDPRX",
  description:
    "Supervised dimensionality reduction for polygenic risk prediction",
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
  columns: Z_SCORE_COLUMNS,
  gwasN: "required",
  hasTraits: true,
  layouts: ["merged", "multi_chromosome"],
  chromosomeSelection: true,
  hasCovariateColumns: false,
  params: [
    TRAIT_PARAM,
    { key: "rho", label: "Rho", kind: "number", placeholder: "e.g. 0.8" },
    {
      key: "force_shared",
      label: "Force shared LD",
      kind: "boolean",
      default: false,
      help: "Treat LD structure as shared between populations",
    },
  ],
  secondAllele: "A2",
  ldPanel: true,
}
