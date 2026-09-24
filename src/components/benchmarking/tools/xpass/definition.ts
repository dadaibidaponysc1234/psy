import type {
  PathKey,
  RoleRule,
  ToolDefinition,
} from "@/components/benchmarking/job-config/types"
import { EXACTLY_ONE, roleRule } from "@/components/benchmarking/tools/shared"

const PATHS: PathKey[] = ["sumstats_path", "genotype_path"]

/** XPASS and XPASS+ take the same populations; only the help text names the tool. */
export function xpassPopulations(tool: string): RoleRule[] {
  return [
    roleRule("target", "Target", EXACTLY_ONE, {
      required: PATHS,
      help: `The population you want to evaluate with ${tool}`,
    }),
    roleRule("auxiliary", "Auxiliary", EXACTLY_ONE, {
      required: PATHS,
      help: `Provide the cohort used as the auxiliary population in ${tool}`,
    }),
    // Preprocessed but not used by the backend yet; the owner keeps collecting it.
    roleRule("validation", "Validation", EXACTLY_ONE, {
      required: PATHS,
      help: `Independent cohort used for evaluating ${tool} outputs`,
    }),
  ]
}

export const XPASS_COLUMNS = {
  required: ["SNP", "A1", "A2", "N"],
  optional: ["Z"],
}

export const xpass: ToolDefinition = {
  id: "xpass",
  label: "XPASS",
  status: "live",
  populations: xpassPopulations("XPASS"),
  columns: XPASS_COLUMNS,
  gwasN: "unless_n_column",
  // No phenotype file, so no traits and no trait to score.
  hasTraits: false,
  layouts: ["merged", "multi_chromosome"],
  chromosomeSelection: true,
  hasCovariateColumns: false,
  // The form has never exposed XPASS's method parameters; the backend uses its working values.
  params: [],
  sharesPreprocessingWith: "xpass+",
}
