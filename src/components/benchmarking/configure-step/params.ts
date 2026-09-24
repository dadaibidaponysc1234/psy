import { runKinds } from "@/components/benchmarking/job-config/defaults"
import type {
  ParamValue,
  ToolDefinition,
  ToolDraft,
  TraitKind,
} from "@/components/benchmarking/job-config/types"

/**
 * Keeps each run's scored trait one of the target's ticked traits of that kind: the first
 * one when nothing valid is chosen, and nothing when none is ticked. Returns the same draft
 * when there's nothing to change.
 */
export function withScoredTraits(
  definition: ToolDefinition,
  draft: ToolDraft
): ToolDraft {
  const traitSpecs = definition.params.filter((spec) => spec.kind === "trait")
  if (traitSpecs.length === 0) return draft
  const target = draft.populations.find(
    (population) => population.role === "target"
  )
  let next = draft
  for (const kind of runKinds("both")) {
    const ticked = target?.traits[kind] ?? []
    for (const spec of traitSpecs) {
      const current = draft.params[kind]?.[spec.key]
      if (typeof current === "string" && ticked.includes(current)) continue
      const wanted = ticked[0] ?? ""
      if (current === wanted) continue
      next = {
        ...next,
        params: {
          ...next.params,
          [kind]: { ...next.params[kind], [spec.key]: wanted },
        },
      }
    }
  }
  return next
}

/**
 * Sets a parameter for one run kind, or for every kind when the tool's parameters are
 * shared across runs.
 */
export function withParam(
  definition: ToolDefinition,
  draft: ToolDraft,
  kind: TraitKind,
  key: string,
  value: ParamValue
): ToolDraft {
  const kinds = definition.paramsSharedAcrossRuns ? runKinds("both") : [kind]
  const params = { ...draft.params }
  for (const each of kinds) params[each] = { ...params[each], [key]: value }
  return { ...draft, params }
}
