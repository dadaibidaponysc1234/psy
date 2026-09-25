import type { ToolDefinition } from "@/components/benchmarking/job-config/types"
import {
  EXACTLY_ONE,
  roleRule,
  TRAIT_PARAM,
} from "@/components/benchmarking/tools/shared"

export const xpblup: ToolDefinition = {
  id: "xpblup",
  label: "XP-BLUP",
  description:
    "Cross-population BLUP on the target's genotypes, using SNPs picked from another population's GWAS",
  // Built, but not offered until the backend can evaluate its scores (contract §10).
  status: "disabled",
  // The other population enters only through the SNP list, so only the target is named.
  populations: [
    roleRule("target", "Target", EXACTLY_ONE, {
      required: ["genotype_path", "phenotype_path", "snp_list_path"],
      help: "The population the model is trained and scored on",
    }),
  ],
  columns: { required: [], optional: [] },
  gwasN: "optional",
  hasTraits: true,
  layouts: ["merged", "multi_chromosome"],
  chromosomeSelection: true,
  hasCovariateColumns: false,
  params: [TRAIT_PARAM],
  singleTrait: true,
}
