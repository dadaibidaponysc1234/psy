import { beforeEach, describe, expect, it } from "vitest"
import {
  migrateBenchmarkingState,
  useBenchmarkingStore,
} from "@/stores/benchmarking-store"

describe("migrateBenchmarkingState", () => {
  it("drops drafts saved in the old shapes and keeps the job, uploads, tools and submission", () => {
    const old = {
      jobId: "job-1",
      uploadedFileIds: ["f1"],
      mappingState: { "job-1": { activeTool: "prscsx", toolConfigs: {} } },
      stepData: {
        tools: { selectedTools: ["prscsx"] },
        populations: { configData: {} },
        configure: { submitted: true },
        "tool_config_job-1": { prscsx: {} },
        "tool_processing_config_job-1": { prscsx: {} },
      },
    }

    expect(migrateBenchmarkingState(old, 0)).toEqual({
      jobId: "job-1",
      uploadedFileIds: ["f1"],
      stepData: {
        tools: { selectedTools: ["prscsx"] },
        configure: { submitted: true },
      },
    })
  })

  it("version 1 drops the old mapping page's state and keeps the drafts", () => {
    const v1 = {
      jobId: "job-1",
      mappingState: { x: 1 },
      configActiveTab: "prscsx",
      jobDrafts: { "job-1": { evaluation_type: "both", tools: [] } },
    }
    expect(migrateBenchmarkingState(v1, 1)).toEqual({
      jobId: "job-1",
      jobDrafts: { "job-1": { evaluation_type: "both", tools: [] } },
    })
  })

  it("leaves current-version state alone", () => {
    const current = { jobId: "job-1", stepData: { x: 1 } }
    expect(migrateBenchmarkingState(current, 2)).toEqual(current)
  })
})

describe("job draft actions", () => {
  beforeEach(() => useBenchmarkingStore.getState().resetWorkflow())

  it("sync, edit, evaluation type and reset", () => {
    const store = useBenchmarkingStore.getState()
    store.syncJobTools("job-1", ["prsice", "xpass", "xpass+"])
    store.setJobEvaluationType("job-1", "quantitative")
    store.updateToolDraft("job-1", "xpass", (draft) => ({
      ...draft,
      genotype: { ...draft.genotype, chrom: [22] },
    }))

    const job = useBenchmarkingStore.getState().jobDrafts["job-1"]
    expect(job.evaluation_type).toBe("quantitative")
    expect(job.tools.map((draft) => draft.tool)).toEqual([
      "prsice",
      "xpass",
      "xpass+",
    ])
    expect(job.tools[2].genotype.chrom).toEqual([22])

    useBenchmarkingStore.getState().clearJob()
    expect(useBenchmarkingStore.getState().jobDrafts).toEqual({})
  })

  it("editing a job with no drafts does nothing", () => {
    useBenchmarkingStore
      .getState()
      .updateToolDraft("missing", "prsice", (draft) => draft)
    expect(useBenchmarkingStore.getState().jobDrafts).toEqual({})
  })
})
