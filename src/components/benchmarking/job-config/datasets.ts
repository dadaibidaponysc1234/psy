import type { JobDraft } from "@/components/benchmarking/job-config/types"

/**
 * Fixes a particular shared dataset needs and the backend applies only when asked
 * (msgboard #240). They're temporary: the backend plans to detect both itself, and then
 * this table goes. Uploaded datasets never get them.
 */
export interface DatasetQuirks {
  /**
   * The summary statistics have no second allele. A tool's second-allele column may then
   * be left unmapped, and the backend fills it from the population's own genotypes, which
   * that population must therefore provide.
   */
  fillSecondAllele: boolean
  /** Variant IDs are `rsid:pos:a1:a2`; tools that use an LD panel rename them to the rsID. */
  mapToRsid: boolean
}

/** By shared dataset name, as `GET /datasets/shared` lists it. */
const SHARED_DATASET_QUIRKS: Record<string, DatasetQuirks> = {
  harvard_datasets: { fillSecondAllele: true, mapToRsid: true },
}

/** The quirks of the job's dataset, or none for an upload or a shared dataset without any. */
export function quirksFor(
  job: Pick<JobDraft, "shared_dataset"> | undefined
): DatasetQuirks | undefined {
  const name = job?.shared_dataset
  return name ? SHARED_DATASET_QUIRKS[name] : undefined
}
