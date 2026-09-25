import type { ToolDefinition } from "@/components/benchmarking/job-config/types"
import {
  EXACTLY_ONE,
  roleRule,
  TRAIT_PARAM,
} from "@/components/benchmarking/tools/shared"

export const bridgeprs: ToolDefinition = {
  id: "bridgeprs",
  label: "BridgePRS",
  description:
    "Bridging polygenic risk scores across populations using transfer learning",
  status: "live",
  populations: [
    roleRule("target", "Target", EXACTLY_ONE, {
      required: ["sumstats_path", "genotype_path", "phenotype_path"],
      help: "The population you want to evaluate within BridgePRS",
    }),
    roleRule("base", "Base", EXACTLY_ONE, {
      required: ["sumstats_path", "genotype_path", "phenotype_path"],
      help: "Provide the cohort used to support BridgePRS model training",
    }),
  ],
  columns: {
    required: ["CHR", "ID", "PS", "A1", "REF", "BETA", "SE", "P", "N"],
    optional: [],
  },
  gwasN: "required",
  hasTraits: true,
  layouts: ["merged", "multi_chromosome"],
  // Genome-wide only: the LD panel and the summary statistics must both hold 1-22.
  chromosomeSelection: false,
  hasCovariateColumns: false,
  params: [
    TRAIT_PARAM,
    {
      key: "fst",
      label: "FST",
      kind: "number",
      default: 0.1,
      placeholder: "0.1",
    },
  ],
}
