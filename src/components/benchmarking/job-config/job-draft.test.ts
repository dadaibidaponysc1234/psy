import { describe, expect, it } from "vitest"
import {
  emptyJobDraft,
  syncJobDraft,
  updateToolInJob,
} from "@/components/benchmarking/job-config"
import type { JobDraft } from "@/components/benchmarking/job-config"

function counterIds() {
  let next = 0
  return () => `p${++next}`
}

const rename = (name: string) => (draft: JobDraft["tools"][number]) => ({
  ...draft,
  populations: draft.populations.map((population) =>
    population.role === "target" ? { ...population, name } : population
  ),
})

describe("syncJobDraft", () => {
  it("adds defaults for new tools in selection order and ignores unknown or repeated ids", () => {
    const job = syncJobDraft(
      undefined,
      ["sdprx", "nope", "prsice", "sdprx"],
      counterIds()
    )
    expect(job.evaluation_type).toBe("both")
    expect(job.tools.map((draft) => draft.tool)).toEqual(["sdprx", "prsice"])
  })

  it("keeps existing drafts and drops deselected tools", () => {
    let job = syncJobDraft(undefined, ["prsice", "sdprx"], counterIds())
    job = updateToolInJob(job, "prsice", rename("AFR"))

    const next = syncJobDraft(job, ["prsice", "bridgeprs"], counterIds())

    expect(next.tools.map((draft) => draft.tool)).toEqual([
      "prsice",
      "bridgeprs",
    ])
    expect(next.tools[0].populations[0].name).toBe("AFR")
  })

  it("keeps the job's evaluation type", () => {
    const job = { ...emptyJobDraft(), evaluation_type: "binary" as const }
    expect(syncJobDraft(job, ["prsice"]).evaluation_type).toBe("binary")
  })

  it("a tool that shares preprocessing starts from its partner's inputs, with its own params", () => {
    let job = syncJobDraft(undefined, ["xpass"], counterIds())
    job = updateToolInJob(job, "xpass", rename("AFR"))

    const [xpass, xpassPlus] = syncJobDraft(
      job,
      ["xpass", "xpass+"],
      counterIds()
    ).tools

    expect(xpassPlus.tool).toBe("xpass+")
    expect(xpassPlus.populations).toEqual(xpass.populations)
    expect(xpassPlus.params.quantitative).toHaveProperty("clump_params")
  })
})

describe("updateToolInJob", () => {
  it("mirrors preprocessing edits to the partner, never params", () => {
    let job = syncJobDraft(
      undefined,
      ["xpass", "xpass+", "prsice"],
      counterIds()
    )
    job = updateToolInJob(job, "xpass+", (draft) => ({
      ...rename("AFR")(draft),
      params: {
        ...draft.params,
        quantitative: { ...draft.params.quantitative, compPosMean: false },
      },
    }))

    const [xpass, xpassPlus, prsice] = job.tools
    expect(xpass.populations[0].name).toBe("AFR")
    expect(xpass.params.quantitative).not.toHaveProperty("compPosMean")
    expect(xpassPlus.params.quantitative.compPosMean).toBe(false)
    expect(prsice.populations[0].name).toBe("")
  })

  it("ignores a tool that isn't in the job", () => {
    const job = syncJobDraft(undefined, ["prsice"], counterIds())
    expect(updateToolInJob(job, "sdprx", rename("AFR"))).toBe(job)
  })
})
