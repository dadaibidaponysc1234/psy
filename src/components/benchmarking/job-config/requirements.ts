import { ruleFor } from "@/components/benchmarking/job-config/defaults"
import type {
  PopulationDraft,
  ToolDefinition,
} from "@/components/benchmarking/job-config/types"

/** The summary-statistics column a GWAS sample size can stand in for. */
export const N_COLUMN = "N"

/** "Target (AFR)", or "Target" before the population is named. */
export function describePopulation(
  definition: ToolDefinition,
  population: PopulationDraft
): string {
  const role =
    ruleFor(definition, population.role)?.label ??
    population.role.charAt(0).toUpperCase() + population.role.slice(1)
  const name = population.name.trim()
  return name ? `${role} (${name})` : role
}

/** Whether the population must give its GWAS sample size, as things stand. */
export function isGwasNRequired(
  definition: ToolDefinition,
  population: PopulationDraft
): boolean {
  switch (definition.gwasN) {
    case "required":
      return true
    case "unless_n_column":
      return !population.column_mapping[N_COLUMN]?.trim()
    case "optional":
      return false
  }
}

/**
 * Whether a column must be mapped, as things stand. A required N column may be left
 * unmapped once the GWAS sample size is given; where the tool always takes the size, never.
 */
export function isColumnRequired(
  definition: ToolDefinition,
  population: PopulationDraft,
  column: string
): boolean {
  if (!definition.columns.required.includes(column)) return false
  if (column !== N_COLUMN) return true
  return definition.gwasN !== "required" && population.gwas_n === null
}
