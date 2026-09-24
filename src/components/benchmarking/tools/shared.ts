import type {
  FieldSpec,
  ParamSpec,
  PathKey,
  Role,
  RoleRule,
} from "@/components/benchmarking/job-config/types"

/** A role a tool takes: how many, and which files each population of that role needs. */
export function roleRule(
  role: Role,
  label: string,
  count: { min: number; max: number },
  requiredPaths: PathKey[],
  optionalPaths: PathKey[] = []
): RoleRule {
  return { role, label, ...count, requiredPaths, optionalPaths }
}

export const EXACTLY_ONE = { min: 1, max: 1 }

export const TRAIT_PARAM: ParamSpec = {
  key: "trait",
  label: "Trait to score",
  kind: "trait",
  help: "A column from the target's phenotype file, of this block's kind.",
}

export const CLUMP_FIELDS: FieldSpec[] = [
  {
    key: "kb",
    label: "Window (kb)",
    kind: "number",
    default: 1000,
    min: 1,
    integer: true,
  },
  { key: "r2", label: "r²", kind: "number", default: 0.1, above: 0, max: 1 },
  {
    key: "p",
    label: "p-value",
    kind: "number",
    default: 0.05,
    above: 0,
    max: 1,
  },
]
