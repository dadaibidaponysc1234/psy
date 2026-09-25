import type {
  ColumnRule,
  FieldSpec,
  GwasNRule,
  ParamSpec,
  PathKey,
  Role,
  RoleRule,
} from "@/components/benchmarking/job-config/types"

/** A role a tool takes: how many, which files each population of that role needs, and its help text. */
export function roleRule(
  role: Role,
  label: string,
  count: { min: number; max: number },
  files: {
    required: PathKey[]
    optional?: PathKey[]
    help?: string
    columns?: ColumnRule
    gwasN?: GwasNRule
  }
): RoleRule {
  return {
    role,
    label,
    ...count,
    requiredPaths: files.required,
    optionalPaths: files.optional ?? [],
    help: files.help,
    columns: files.columns,
    gwasN: files.gwasN,
  }
}

export const EXACTLY_ONE = { min: 1, max: 1 }

export const TRAIT_PARAM: ParamSpec = {
  key: "trait",
  label: "Phenotype Column",
  kind: "trait",
  help: "The trait scored: one of the target's ticked traits of this run's kind.",
}

export const CLUMP_FIELDS: FieldSpec[] = [
  {
    key: "kb",
    label: "Window (kb)",
    kind: "number",
    default: 1000,
    min: 1,
    integer: true,
    placeholder: "kb",
  },
  {
    key: "r2",
    label: "LD r2",
    kind: "number",
    default: 0.1,
    above: 0,
    max: 1,
    placeholder: "r2",
  },
  {
    key: "p",
    label: "P-value",
    kind: "number",
    placeholder: "p",
    default: 0.05,
    above: 0,
    max: 1,
  },
]
