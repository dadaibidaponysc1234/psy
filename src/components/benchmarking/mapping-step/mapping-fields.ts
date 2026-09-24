import { providedPaths } from "@/components/benchmarking/job-config/serialize"
import type {
  PathKey,
  ToolDefinition,
  ToolDraft,
} from "@/components/benchmarking/job-config/types"

const FILE_LABELS: Record<PathKey, string> = {
  sumstats_path: "Summary Statistics",
  genotype_path: "Genotype Directory",
  phenotype_path: "Phenotype File",
  covariate_path: "Covariate File",
}

const FILE_DESCRIPTIONS: Record<PathKey, string> = {
  sumstats_path: "Summary statistics file",
  genotype_path:
    "Directory containing PLINK format genotype files (.bed, .bim, .fam)",
  phenotype_path: "Phenotype data file",
  covariate_path: "Optional covariate data",
}

/** One mapping card: a file one population provides. */
export interface MappingField {
  populationId: string
  key: PathKey
  /** "<Role> - <population> - <file>", e.g. "Target - AFR - Summary Statistics". */
  title: string
  description: string
  /** Included through an optional-file checkbox (badged "Optional"; still needed once included). */
  optional: boolean
}

/** The mapping cards for a tool, population by population in the order of its roles. */
export function mappingFields(
  definition: ToolDefinition,
  draft: ToolDraft
): MappingField[] {
  return definition.populations.flatMap((rule) =>
    draft.populations
      .filter((population) => population.role === rule.role)
      .flatMap((population) =>
        providedPaths(definition, population).map((key) => {
          const name = population.name.trim()
          return {
            populationId: population.id,
            key,
            title: `${rule.label} - ${name} - ${FILE_LABELS[key]}`,
            description: `${FILE_DESCRIPTIONS[key]} for the ${rule.label.toLowerCase()} population (${name})`,
            optional: rule.optionalPaths.includes(key),
          }
        })
      )
  )
}

/**
 * Tools that take several populations of one role (PRS-CSx's bases) configure them in a
 * panel with dialogs; the others type their names into a form and save it.
 */
export function usesConfigurePanel(definition: ToolDefinition): boolean {
  return definition.populations.some((rule) => rule.max > 1)
}

/** Every role has an allowed number of populations, each with a distinct, non-empty name. */
export function namesValid(
  definition: ToolDefinition,
  draft: ToolDraft
): boolean {
  const names = draft.populations.map((population) =>
    population.name.trim().toLowerCase()
  )
  const countsFit = definition.populations.every((rule) => {
    const count = draft.populations.filter(
      (population) => population.role === rule.role
    ).length
    return count >= rule.min && count <= rule.max
  })
  return (
    countsFit &&
    names.every(Boolean) &&
    names.every((name, index) => names.indexOf(name) === index)
  )
}

/**
 * Files can be mapped once the names are valid and, for tools with a names form, saved.
 * Editing a saved name clears the save, so the cards hide until it's saved again.
 */
export function namesReady(
  definition: ToolDefinition,
  draft: ToolDraft
): boolean {
  return (
    namesValid(definition, draft) &&
    (usesConfigurePanel(definition) || draft.names_saved)
  )
}

/** "AFR population", "AFR and EUR populations", "AFR with 2 base populations". */
export function populationSummary(
  definition: ToolDefinition,
  draft: ToolDraft
): string {
  const named = (role: string) =>
    draft.populations
      .filter((population) => population.role === role)
      .map((population) => population.name.trim())
  const target = named("target")[0] || "target"
  if (usesConfigurePanel(definition)) {
    const bases = named("base").length
    return `${target} with ${bases} base population${bases === 1 ? "" : "s"}`
  }
  const names = draft.populations.map((population) => population.name.trim())
  if (names.length === 1) return `${target} population`
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} populations`
}
