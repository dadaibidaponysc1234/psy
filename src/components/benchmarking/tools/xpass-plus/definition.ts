import type { ToolDefinition } from "@/components/benchmarking/job-config/types"
import {
  CLUMP_FIELDS,
  Z_SCORE_COLUMNS,
} from "@/components/benchmarking/tools/shared"
import { xpassPopulations } from "@/components/benchmarking/tools/xpass/definition"

const CLUMPED_ROLES = ["target", "auxiliary"] as const

export const xpassPlus: ToolDefinition = {
  id: "xpass+",
  label: "XPASS+",
  description: "XPASS plus variant for cross-population PRS",
  status: "live",
  populations: xpassPopulations("XPASS+"),
  columns: Z_SCORE_COLUMNS,
  gwasN: "unless_n_column",
  hasTraits: false,
  layouts: ["merged", "multi_chromosome"],
  chromosomeSelection: true,
  hasCovariateColumns: false,
  params: [
    {
      key: "compPosMean",
      label: "Compute posterior mean",
      kind: "boolean",
      default: true,
      help: "Use the posterior mean of the SNP effects.",
    },
    {
      key: "use_snps",
      label: "Use this population's SNPs",
      kind: "per_role",
      roles: [...CLUMPED_ROLES],
      of: { key: "use", label: "Use SNPs", kind: "boolean", default: true },
    },
    {
      key: "clump_params",
      label: "Clump params",
      kind: "per_role",
      roles: [...CLUMPED_ROLES],
      of: CLUMP_FIELDS,
    },
  ],
  // The old form edited these once; every run uses the same values.
  paramsSharedAcrossRuns: true,
  sharesPreprocessingWith: "xpass",
  secondAllele: "A2",
}
