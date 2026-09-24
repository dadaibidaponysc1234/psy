import { describePopulation } from "@/components/benchmarking/job-config/requirements"
import { providedPaths } from "@/components/benchmarking/job-config/serialize"
import type {
  PathKey,
  PopulationDraft,
  ToolDefinition,
  ToolDraft,
} from "@/components/benchmarking/job-config/types"
import {
  isPlinkFile,
  plinkSets,
  sumstatsSelection,
  type DatasetStructure,
} from "@/components/benchmarking/mapping-step/dataset"

/** What a mapped path stands for (`note`), or why it can't be used as it is (`problem`). */
export interface PathCheck {
  note?: string
  problem?: string
}

const list = (names: string[]) => names.join(", ")

/**
 * Checks a mapped path against the dataset listing. A summary-statistics folder must hold one
 * dataset, and a merged genotype folder one PLINK set; otherwise the user picks one file of the
 * one they mean, which the backend reads as that dataset or set.
 */
export function checkPath(
  structure: DatasetStructure | null,
  draft: ToolDraft,
  population: PopulationDraft,
  key: PathKey
): PathCheck {
  const path = population[key].trim()
  if (!path || !structure) return {}

  if (key === "sumstats_path") {
    const selection = sumstatsSelection(
      structure,
      path,
      draft.sumstats_file_type
    )
    if (!selection) return {}
    const { chosen, datasets } = selection
    if (!chosen)
      return {
        problem: `This folder holds ${datasets.length} datasets (${list(datasets.map((dataset) => dataset.name))}). Pick one file of the dataset you mean.`,
      }
    if (chosen.files.length > 1)
      return {
        note: `Dataset ${chosen.name}: ${chosen.files.length} chromosome files`,
      }
    return {}
  }

  if (key === "genotype_path") {
    if (isPlinkFile(path))
      return {
        note: `PLINK set ${path
          .split("/")
          .pop()!
          .replace(/\.(bed|bim|fam)$/i, "")}`,
      }
    if (draft.genotype.file_type !== "merged") return {}
    const sets = plinkSets(structure, path)
    if (sets.length > 1)
      return {
        problem: `This folder holds ${sets.length} PLINK sets (${list(sets)}). Pick one file of the set you mean.`,
      }
  }
  return {}
}

const FILE_NAMES: Partial<Record<PathKey, string>> = {
  sumstats_path: "summary statistics",
  genotype_path: "genotypes",
}

/** The mapping page's listing-based issues: one per path that needs a single dataset or set picked. */
export function pathIssues(
  definition: ToolDefinition,
  draft: ToolDraft,
  structure: DatasetStructure | null
): string[] {
  return draft.populations.flatMap((population) =>
    providedPaths(definition, population)
      .filter((key) => checkPath(structure, draft, population, key).problem)
      .map(
        (key) =>
          `${describePopulation(definition, population)}: pick one ${key === "sumstats_path" ? "dataset" : "PLINK set"} in its ${FILE_NAMES[key]} folder`
      )
  )
}
