import type { ToolDefinition } from "@/components/benchmarking/job-config/types"
import {
  EXACTLY_ONE,
  roleRule,
  TRAIT_PARAM,
} from "@/components/benchmarking/tools/shared"

const LD_PANEL_HELP =
  "Use a 1000 Genomes population code (e.g. AFR, EUR): the name picks the LD panel"

export const jointprs: ToolDefinition = {
  id: "jointprs",
  label: "JointPRS",
  description: "Joint modelling of GWAS summary statistics across populations",
  status: "live",
  populations: [
    roleRule("target", "Target", EXACTLY_ONE, {
      required: ["sumstats_path", "genotype_path", "phenotype_path"],
      help: `The population you want to predict risk for. ${LD_PANEL_HELP}`,
    }),
    // Only its summary statistics are read.
    roleRule("base", "Base", EXACTLY_ONE, {
      required: ["sumstats_path"],
      help: `The population whose GWAS is modelled jointly with the target's. ${LD_PANEL_HELP}`,
    }),
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
      above: 0,
      placeholder: "1e-2",
    },
    {
      key: "n_iter",
      label: "Iterations",
      kind: "number",
      // Every tested run used 200/100; JointPRS's own defaults are open with the backend (msgboard #232).
      default: 200,
      min: 1,
      integer: true,
    },
    {
      key: "n_burnin",
      label: "Burn-in",
      kind: "number",
      default: 100,
      min: 0,
      integer: true,
    },
    {
      key: "seed",
      label: "Seed",
      kind: "number",
      default: 42,
      min: 0,
      integer: true,
    },
    {
      key: "rho_cons",
      label: "Rho constraint",
      kind: "per_role",
      roles: ["base", "target"],
      of: {
        key: "rho",
        label: "Rho",
        kind: "number",
        default: 1,
        min: 0,
        max: 1,
      },
    },
  ],
}
