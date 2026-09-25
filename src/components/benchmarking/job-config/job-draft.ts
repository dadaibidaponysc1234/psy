import {
  defaultDraft,
  runKinds,
  type IdFactory,
} from "@/components/benchmarking/job-config/defaults"
import type {
  EvaluationType,
  JobDraft,
  ToolDraft,
  ToolId,
} from "@/components/benchmarking/job-config/types"
import {
  getToolDefinition,
  TOOL_DEFINITIONS,
} from "@/components/benchmarking/tools"

export function isToolId(value: string): value is ToolId {
  return TOOL_DEFINITIONS.some((definition) => definition.id === value)
}

export function emptyJobDraft(): JobDraft {
  return { evaluation_type: "both", tools: [] }
}

/** Everything but `params`: what the backend preprocesses. */
function preProcessingOf(draft: ToolDraft): Omit<ToolDraft, "tool" | "params"> {
  const { tool: _tool, params: _params, ...rest } = draft
  return rest
}

function partnerOf(job: JobDraft, tool: ToolId): ToolDraft | undefined {
  const partner = getToolDefinition(tool).sharesPreprocessingWith
  return partner ? job.tools.find((draft) => draft.tool === partner) : undefined
}

/**
 * The job's drafts for the selected tools, in selection order: existing drafts are kept,
 * new tools start from their defaults, and deselected tools are dropped. A tool that shares
 * preprocessing with one already in the job starts from that tool's inputs.
 */
export function syncJobDraft(
  job: JobDraft | undefined,
  selected: string[],
  newId?: IdFactory
): JobDraft {
  const current = job ?? emptyJobDraft()
  const tools: ToolDraft[] = []
  for (const id of selected) {
    if (!isToolId(id) || tools.some((draft) => draft.tool === id)) continue
    const existing = current.tools.find((draft) => draft.tool === id)
    if (existing) {
      tools.push(existing)
      continue
    }
    const fresh = defaultDraft(getToolDefinition(id), newId)
    const partner = partnerOf(current, id)
    tools.push(partner ? { ...fresh, ...preProcessingOf(partner) } : fresh)
  }
  return { ...current, tools }
}

/** Applies an edit to one tool, and mirrors preprocessing edits to the tool it shares preprocessing with. */
export function updateToolInJob(
  job: JobDraft,
  tool: ToolId,
  update: (draft: ToolDraft) => ToolDraft
): JobDraft {
  const target = job.tools.find((draft) => draft.tool === tool)
  if (!target) return job
  const next = update(target)
  const partner = partnerOf(job, tool)
  return {
    ...job,
    tools: job.tools.map((draft) => {
      if (draft.tool === tool) return next
      if (partner && draft.tool === partner.tool)
        return { ...draft, ...preProcessingOf(next) }
      return draft
    }),
  }
}

/**
 * Switches the job's evaluation type. As on the old page, traits of a kind that no longer
 * runs are unticked everywhere, along with the trait chosen to score for that kind.
 */
export function withEvaluationType(
  job: JobDraft,
  evaluationType: EvaluationType
): JobDraft {
  const running = runKinds(evaluationType)
  const dropped = runKinds("both").filter((kind) => !running.includes(kind))
  return {
    ...job,
    evaluation_type: evaluationType,
    tools: job.tools.map((draft) => {
      if (dropped.length === 0) return draft
      const next = {
        ...draft,
        populations: draft.populations.map((population) => ({
          ...population,
          traits: { ...population.traits },
        })),
        params: { ...draft.params },
      }
      for (const kind of dropped) {
        for (const population of next.populations) population.traits[kind] = []
        if ("trait" in next.params[kind])
          next.params[kind] = { ...next.params[kind], trait: "" }
      }
      return next
    }),
  }
}
