import type { ToolDefinition } from "@/components/benchmarking/job-config/types"
import {
  EXACTLY_ONE,
  roleRule,
  TRAIT_PARAM,
} from "@/components/benchmarking/tools/shared"

export const snpnet: ToolDefinition = {
  id: "snpnet",
  label: "snpnet",
  description:
    "Penalised regression (lasso / elastic net) fitted on individual-level genotypes",
  status: "live",
  // Fitted on the target's own genotypes and phenotypes; no summary statistics.
  populations: [
    roleRule("target", "Target", EXACTLY_ONE, {
      required: ["genotype_path", "phenotype_path"],
      help: "The population the model is trained, validated and scored on",
    }),
  ],
  columns: { required: [], optional: [] },
  gwasN: "optional",
  hasTraits: true,
  layouts: ["merged", "multi_chromosome"],
  chromosomeSelection: true,
  hasCovariateColumns: false,
  params: [
    TRAIT_PARAM,
    {
      key: "alpha",
      label: "Alpha",
      kind: "number",
      default: 1,
      min: 0,
      max: 1,
      help: "1 is the lasso; below 1 mixes in ridge (elastic net).",
    },
    {
      key: "nCores",
      label: "Cores",
      kind: "number",
      default: 2,
      min: 1,
      integer: true,
      help: "Capped at what the scheduler grants.",
    },
    {
      key: "mem",
      label: "Memory (MB)",
      kind: "number",
      default: 8000,
      min: 1,
      integer: true,
    },
  ],
  trainValidationSplit: true,
}
