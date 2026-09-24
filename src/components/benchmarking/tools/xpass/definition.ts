import type {
  RoleRule,
  ToolDefinition,
} from "@/components/benchmarking/job-config/types"
import { EXACTLY_ONE, roleRule } from "@/components/benchmarking/tools/shared"

const PATHS = ["sumstats_path", "genotype_path"] as const

export const XPASS_POPULATIONS: RoleRule[] = [
  roleRule("target", "Target", EXACTLY_ONE, [...PATHS]),
  roleRule("auxiliary", "Auxiliary", EXACTLY_ONE, [...PATHS]),
  // Preprocessed but not used by the backend yet; the owner keeps collecting it.
  roleRule("validation", "Validation", EXACTLY_ONE, [...PATHS]),
]

export const XPASS_COLUMNS = {
  required: ["SNP", "A1", "A2", "N"],
  optional: ["Z"],
}

export const xpass: ToolDefinition = {
  id: "xpass",
  label: "XPASS",
  status: "live",
  populations: XPASS_POPULATIONS,
  columns: XPASS_COLUMNS,
  // No phenotype file, so no traits and no trait to score.
  hasTraits: false,
  layouts: ["merged", "multi_chromosome"],
  chromosomeSelection: true,
  hasCovariateColumns: false,
  // The form has never exposed XPASS's method parameters; the backend uses its working values.
  params: [],
  sharesPreprocessingWith: "xpass+",
}
