import { describe, expect, it } from "vitest"
import {
  withParam,
  withScoredTraits,
} from "@/components/benchmarking/configure-step/params"
import { defaultDraft } from "@/components/benchmarking/job-config"
import { getToolDefinition } from "@/components/benchmarking/tools"

describe("withScoredTraits", () => {
  const definition = getToolDefinition("bridgeprs")

  it("picks the target's first ticked trait, and re-picks when it's unticked", () => {
    const draft = defaultDraft(definition)
    draft.populations[0].traits = {
      binary: ["case", "control"],
      quantitative: [],
    }
    const picked = withScoredTraits(definition, draft)
    expect(picked.params.binary.trait).toBe("case")
    expect(picked.params.quantitative.trait).toBe("")

    picked.params.binary.trait = "control"
    expect(withScoredTraits(definition, picked)).toBe(picked)

    picked.populations[0].traits.binary = ["case"]
    expect(withScoredTraits(definition, picked).params.binary.trait).toBe(
      "case"
    )
  })

  it("leaves tools without a scored trait alone", () => {
    const xpass = getToolDefinition("xpass")
    const draft = defaultDraft(xpass)
    expect(withScoredTraits(xpass, draft)).toBe(draft)
  })
})

describe("withParam", () => {
  it("sets one run's value, or every run's when the tool shares them", () => {
    const prscsx = getToolDefinition("prscsx")
    const one = withParam(prscsx, defaultDraft(prscsx), "binary", "phi", 0.5)
    expect(one.params.binary.phi).toBe(0.5)
    expect(one.params.quantitative.phi).toBe(0.01)

    const xpassPlus = getToolDefinition("xpass+")
    const both = withParam(
      xpassPlus,
      defaultDraft(xpassPlus),
      "binary",
      "compPosMean",
      false
    )
    expect(both.params.binary.compPosMean).toBe(false)
    expect(both.params.quantitative.compPosMean).toBe(false)
  })
})
