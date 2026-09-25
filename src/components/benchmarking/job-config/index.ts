import { buildToolBlock } from "@/components/benchmarking/job-config/serialize"
import type {
  Issue,
  JobConfig,
  JobDraft,
} from "@/components/benchmarking/job-config/types"
import { validateJob } from "@/components/benchmarking/job-config/validate"

export {
  defaultDraft,
  newPopulation,
  normalizeChromosomes,
  runKinds,
} from "@/components/benchmarking/job-config/defaults"
export {
  emptyJobDraft,
  isToolId,
  syncJobDraft,
  updateToolInJob,
  withEvaluationType,
} from "@/components/benchmarking/job-config/job-draft"
export {
  describePopulation,
  isColumnRequired,
  gwasNFor,
  isGwasNRequired,
  mappableColumns,
  N_COLUMN,
} from "@/components/benchmarking/job-config/requirements"
export {
  validateDraft,
  validateJob,
} from "@/components/benchmarking/job-config/validate"
export type * from "@/components/benchmarking/job-config/types"

/**
 * The only place the job config JSON is assembled; submit and the dev drawer both use it.
 * `config` is always produced so it can be previewed. Submit only when `issues` is empty.
 */
export function buildJobConfig(job: JobDraft): {
  config: JobConfig
  issues: Issue[]
} {
  const config: JobConfig = {
    tools_to_run: job.tools.map((draft) => draft.tool),
  }
  for (const draft of job.tools)
    config[draft.tool] = buildToolBlock(draft, job.evaluation_type)
  return { config, issues: validateJob(job) }
}
