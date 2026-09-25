import type { ToolDefinition } from "@/components/benchmarking/job-config/types"
import {
  EXACTLY_ONE,
  roleRule,
  TRAIT_PARAM,
} from "@/components/benchmarking/tools/shared"

// lassosum's LD blocks, by ancestry and genome build.
const LD_BLOCKS = ["AFR", "EUR", "ASN"].flatMap((ancestry) =>
  ["hg19", "hg38"].map((build) => `${ancestry}.${build}`)
)

export const tlprs: ToolDefinition = {
  id: "tlprs",
  label: "TL-PRS",
  description:
    "Transfer learning that adapts a base PRS model to the target population",
  // Built, but not offered until the backend can take a base model through the form (msgboard #230).
  status: "disabled",
  populations: [
    roleRule("target", "Target", EXACTLY_ONE, {
      required: ["sumstats_path", "genotype_path", "phenotype_path"],
      help: "The population the base model is adapted to",
      columns: { required: ["SNP", "A1", "BETA", "N", "P"], optional: [] },
    }),
    // Its genotypes are never read, so they aren't asked for.
    roleRule("base", "Base", EXACTLY_ONE, {
      required: ["sumstats_path", "base_model_path"],
      help: "The population the base model was trained on",
      columns: { required: ["SNP", "A1", "BETA"], optional: ["N"] },
      // TL-PRS reads only the target's size.
      gwasN: "optional",
    }),
  ],
  columns: { required: ["SNP", "A1", "BETA"], optional: [] },
  gwasN: "unless_n_column",
  hasTraits: true,
  layouts: ["merged", "multi_chromosome"],
  chromosomeSelection: true,
  hasCovariateColumns: false,
  params: [
    TRAIT_PARAM,
    {
      key: "covar",
      label: "Covariate",
      kind: "covariate",
      help: "TL-PRS adjusts for one column of the target's phenotype file.",
    },
    {
      key: "ldblocks",
      label: "LD blocks",
      kind: "select",
      default: "",
      options: LD_BLOCKS,
      placeholder: "Select LD blocks",
      help: "For the target's ancestry and the genome build of its data.",
    },
  ],
  preprocessingOptions: [
    {
      key: "genotype_missingness",
      label: "Missing genotype calls",
      kind: "select",
      default: "drop",
      options: ["drop", "fill_mean", "fill_mode", "none"],
      help: "TL-PRS stops on a missing call, so drop or fill them unless the genotypes have none.",
    },
  ],
}
