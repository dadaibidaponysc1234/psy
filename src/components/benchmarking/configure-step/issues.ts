import type {
  Issue,
  ToolId,
  TraitKind,
} from "@/components/benchmarking/job-config/types"

/** The collapsible sections of a tool's form, in page order. */
export type SectionId =
  | "columns"
  | "phenotype"
  | "genotype"
  | "options"
  | "processing"

export const SECTION_ORDER: SectionId[] = [
  "columns",
  "phenotype",
  "genotype",
  "options",
  "processing",
]

export const SECTION_TITLES: Record<SectionId, string> = {
  columns: "Column Mapping",
  phenotype: "Phenotype Configuration",
  genotype: "Genotype Configuration",
  options: "Preprocessing Options",
  processing: "Processing Configuration",
}

/** Where on the Configure page an issue is fixed. */
export interface IssueLocation {
  section: SectionId
  /** The population tab, for column mapping issues. */
  populationId?: string
  /** The run tab, for processing issues. */
  kind?: TraitKind
}

/** Null for issues fixed on the mapping page. */
export function locateIssue(issue: Issue): IssueLocation | null {
  if (issue.step !== "configure") return null
  const parts = issue.path.split(".")
  switch (parts[0]) {
    case "populations":
      return {
        section: parts[2] === "traits" ? "phenotype" : "columns",
        populationId: parts[1],
      }
    case "covariates":
      return { section: "phenotype" }
    case "params":
      return { section: "processing", kind: parts[1] as TraitKind }
    case "options":
      return { section: "options" }
    default:
      return { section: "genotype" }
  }
}

/** The DOM id of the field an issue points at, so the page can scroll to it. */
export function fieldId(tool: ToolId, path: string): string {
  return `configure-${tool}-${path}`.replace(/[^A-Za-z0-9_-]/g, "-")
}
