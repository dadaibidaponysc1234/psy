import type { ToolDefinition } from "@/components/benchmarking/job-config/types"
import {
  EXACTLY_ONE,
  roleRule,
  TRAIT_PARAM,
} from "@/components/benchmarking/tools/shared"

export const prsice: ToolDefinition = {
  id: "prsice",
  label: "PRSice",
  status: "live",
  populations: [
    roleRule(
      "target",
      "Target",
      EXACTLY_ONE,
      ["sumstats_path", "genotype_path", "phenotype_path"],
      ["covariate_path"]
    ),
    roleRule("base", "Base", EXACTLY_ONE, [
      "sumstats_path",
      "genotype_path",
      "phenotype_path",
    ]),
  ],
  columns: {
    required: ["SNP", "CHR", "BP", "A1", "A2", "BETA", "P"],
    optional: [],
  },
  hasTraits: true,
  layouts: ["merged", "multi_chromosome"],
  chromosomeSelection: true,
  hasCovariateColumns: true,
  params: [TRAIT_PARAM],
}
