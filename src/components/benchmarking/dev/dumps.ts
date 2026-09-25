import { defaultDraft } from "@/components/benchmarking/job-config/defaults"
import { providedPaths } from "@/components/benchmarking/job-config/serialize"
import type {
  JobDraft,
  PathKey,
  ToolDraft,
  ToolId,
} from "@/components/benchmarking/job-config/types"
import type { DatasetStructure } from "@/components/benchmarking/mapping-step/dataset"
import { getToolDefinition } from "@/components/benchmarking/tools"

/** Bump when `JobDraft` changes shape, so an old dump is refused rather than half-loaded. */
export const DUMP_VERSION = 1

/** A walkthrough saved from the dev drawer: every tool's inputs for one dataset. */
export interface BenchmarkDump {
  version: number
  name: string
  /** Which dataset the paths point into, e.g. "perchrom-with-eas (upload)". */
  dataset: string
  savedAt: string
  job: JobDraft
}

/** A dump as the dev route lists it: where it's stored, relative to the dumps folder. */
export interface StoredDump extends BenchmarkDump {
  file: string
}

/** How much of a dump to load: the mapping page's inputs, or everything up to submit. */
export type DumpScope = "mapping" | "all"

export function makeDump(
  job: JobDraft,
  name: string,
  dataset: string,
  now = new Date()
): BenchmarkDump {
  return {
    version: DUMP_VERSION,
    name: name.trim(),
    dataset: dataset.trim(),
    savedAt: now.toISOString(),
    job,
  }
}

/** Only what the mapping page sets: names, files and layouts. Everything else starts fresh. */
function mappingOnly(saved: ToolDraft): ToolDraft {
  const fresh = defaultDraft(getToolDefinition(saved.tool))
  const blank = fresh.populations[0]
  return {
    ...fresh,
    names_saved: saved.names_saved,
    sumstats_file_type: saved.sumstats_file_type,
    genotype: { ...fresh.genotype, file_type: saved.genotype.file_type },
    populations: saved.populations.map((population) => ({
      ...blank,
      id: population.id,
      name: population.name,
      role: population.role,
      sumstats_path: population.sumstats_path,
      sumstats_prefix: population.sumstats_prefix,
      genotype_path: population.genotype_path,
      phenotype_path: population.phenotype_path,
      covariate_path: population.covariate_path,
      snp_list_path: population.snp_list_path,
      base_model_path: population.base_model_path,
      included_paths: population.included_paths,
    })),
  }
}

/**
 * The job after loading some of a dump's tools. Loaded tools replace the job's drafts for
 * them and are added to its tools if missing; the job's other tools are left alone. With
 * `mapping` scope only the mapping page's inputs come from the dump, and the job keeps its
 * evaluation type.
 */
export function applyDump(
  current: JobDraft | undefined,
  dump: BenchmarkDump,
  tools: ToolId[],
  scope: DumpScope
): JobDraft {
  const job = current ?? {
    evaluation_type: dump.job.evaluation_type,
    tools: [],
  }
  const loaded = dump.job.tools
    .filter((draft) => tools.includes(draft.tool))
    .map((draft) => (scope === "all" ? draft : mappingOnly(draft)))
  const replaced = job.tools.map(
    (draft) =>
      loaded.find((candidate) => candidate.tool === draft.tool) ?? draft
  )
  const added = loaded.filter(
    (draft) => !job.tools.some((existing) => existing.tool === draft.tool)
  )
  // The job keeps its own dataset: the dump's paths are checked against it, not the other way round.
  return {
    ...job,
    evaluation_type:
      scope === "all" ? dump.job.evaluation_type : job.evaluation_type,
    tools: [...replaced, ...added],
  }
}

function inListing(structure: DatasetStructure, path: string): boolean {
  const target = path.replace(/\/+$/, "")
  return (
    structure.files.some((file) => file.path === target) ||
    structure.directories.some((directory) => directory.path === target) ||
    structure.files.some((file) => file.path.startsWith(`${target}/`))
  )
}

/** The dump's paths, for the chosen tools, that the job's dataset doesn't have. */
export function missingPaths(
  dump: BenchmarkDump,
  tools: ToolId[],
  structure: DatasetStructure
): string[] {
  const missing: string[] = []
  for (const draft of dump.job.tools) {
    if (!tools.includes(draft.tool)) continue
    const definition = getToolDefinition(draft.tool)
    for (const population of draft.populations) {
      for (const key of providedPaths(definition, population) as PathKey[]) {
        const path = population[key].trim()
        if (path && !inListing(structure, path) && !missing.includes(path))
          missing.push(path)
      }
    }
  }
  return missing
}

/** Whether a stored dump can be loaded by this version of the app. */
export function isLoadable(dump: BenchmarkDump): boolean {
  return dump.version === DUMP_VERSION && Array.isArray(dump.job?.tools)
}
