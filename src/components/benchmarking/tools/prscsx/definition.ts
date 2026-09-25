import type { ToolDefinition } from "@/components/benchmarking/job-config/types"
import {
  EXACTLY_ONE,
  roleRule,
  TRAIT_PARAM,
} from "@/components/benchmarking/tools/shared"

export const prscsx: ToolDefinition = {
  id: "prscsx",
  label: "PRScsx",
  description:
    "Polygenic Risk Score software for cross-population polygenic prediction",
  status: "live",
  populations: [
    roleRule("target", "Target", EXACTLY_ONE, {
      required: ["sumstats_path", "genotype_path", "phenotype_path"],
      optional: ["covariate_path"],
    }),
    // Every non-target population goes into the fit; the backend runs the ones its LD panels cover.
    roleRule(
      "base",
      "Base",
      { min: 1, max: Infinity },
      {
        required: ["sumstats_path"],
        optional: ["genotype_path", "phenotype_path", "covariate_path"],
      }
    ),
  ],
  columns: { required: ["SNP", "A1", "A2", "BETA", "P"], optional: [] },
  gwasN: "required",
  hasTraits: true,
  layouts: ["merged", "multi_chromosome"],
  chromosomeSelection: true,
  hasCovariateColumns: false,
  params: [
    TRAIT_PARAM,
    {
      key: "phi",
      label: "Phi",
      kind: "number",
      default: 0.01,
      placeholder: "1e-2",
    },
  ],
  secondAllele: "A2",
  ldPanel: true,
}
