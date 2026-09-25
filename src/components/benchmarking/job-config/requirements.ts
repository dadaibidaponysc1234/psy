import type { DatasetQuirks } from "@/components/benchmarking/job-config/datasets"
import { ruleFor } from "@/components/benchmarking/job-config/defaults"
import type {
  ColumnRule,
  GwasNRule,
  PopulationDraft,
  Role,
  ToolDefinition,
} from "@/components/benchmarking/job-config/types"

/** The summary-statistics column a GWAS sample size can stand in for. */
export const N_COLUMN = "N"

/** The summary-statistics columns a population of this role maps. */
export function columnsFor(definition: ToolDefinition, role: Role): ColumnRule {
  return ruleFor(definition, role)?.columns ?? definition.columns
}

/** The GWAS sample size rule for a population of this role. */
export function gwasNFor(definition: ToolDefinition, role: Role): GwasNRule {
  return ruleFor(definition, role)?.gwasN ?? definition.gwasN
}

/** Every column a population of this role may map, required first. */
export function mappableColumns(
  definition: ToolDefinition,
  role: Role
): string[] {
  const { required, optional } = columnsFor(definition, role)
  return [...required, ...optional]
}

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
  switch (gwasNFor(definition, population.role)) {
    case "required":
      return true
    case "unless_n_column":
      return !population.column_mapping[N_COLUMN]?.trim()
    case "optional":
      return false
  }
}

/**
 * Whether the backend fills this population's second allele from its genotypes: the dataset
 * lacks it and the column is left unmapped.
 */
export function fillsSecondAllele(
  definition: ToolDefinition,
  population: PopulationDraft,
  quirks: DatasetQuirks | undefined
): boolean {
  const column = definition.secondAllele
  return Boolean(
    quirks?.fillSecondAllele &&
      column &&
      mappableColumns(definition, population.role).includes(column) &&
      !population.column_mapping[column]?.trim()
  )
}

/**
 * Whether a column must be mapped, as things stand. A required N column may be left
 * unmapped once the GWAS sample size is given; where the tool always takes the size, never.
 * The second allele may be left unmapped where the dataset lacks it.
 */
export function isColumnRequired(
  definition: ToolDefinition,
  population: PopulationDraft,
  column: string,
  quirks?: DatasetQuirks
): boolean {
  if (!columnsFor(definition, population.role).required.includes(column))
    return false
  if (quirks?.fillSecondAllele && column === definition.secondAllele)
    return false
  if (column !== N_COLUMN) return true
  return (
    gwasNFor(definition, population.role) !== "required" &&
    population.gwas_n === null
  )
}
