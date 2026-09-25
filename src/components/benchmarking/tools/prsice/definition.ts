import type { ToolDefinition } from "@/components/benchmarking/job-config/types"
import {
  EXACTLY_ONE,
  roleRule,
  TRAIT_PARAM,
} from "@/components/benchmarking/tools/shared"

export const prsice: ToolDefinition = {
  id: "prsice",
  label: "PRSice",
  description:
    "Polygenic Risk Score software for calculating and evaluating polygenic risk scores",
  status: "live",
  populations: [
    roleRule("target", "Target", EXACTLY_ONE, {
      required: ["sumstats_path", "genotype_path", "phenotype_path"],
      optional: ["covariate_path"],
      help: "The population you want to predict risk for",
    }),
    roleRule("base", "Base", EXACTLY_ONE, {
      required: ["sumstats_path", "genotype_path", "phenotype_path"],
      help: "The population used to train the risk model",
    }),
  ],
  columns: {
    required: ["SNP", "CHR", "BP", "A1", "A2", "BETA", "P"],
    optional: [],
  },
  gwasN: "optional",
  hasTraits: true,
  layouts: ["merged", "multi_chromosome"],
  chromosomeSelection: true,
  hasCovariateColumns: true,
  params: [TRAIT_PARAM],
}
