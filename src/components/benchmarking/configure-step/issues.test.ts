import { describe, expect, it } from "vitest"
import {
  fieldId,
  locateIssue,
} from "@/components/benchmarking/configure-step/issues"
import type { Issue } from "@/components/benchmarking/job-config"

const issue = (path: string, step: Issue["step"] = "configure"): Issue => ({
  tool: "prscsx",
  step,
  path,
  message: "",
})

describe("locateIssue", () => {
  it("places each issue in the section and tab that fixes it", () => {
    expect(locateIssue(issue("populations.p1.column_mapping.BETA"))).toEqual({
      section: "columns",
      populationId: "p1",
    })
    expect(locateIssue(issue("populations.p2.gwas_n"))).toEqual({
      section: "columns",
      populationId: "p2",
    })
    expect(locateIssue(issue("populations.p1.traits.binary"))).toEqual({
      section: "phenotype",
      populationId: "p1",
    })
    expect(locateIssue(issue("covariates.id_mapping"))).toEqual({
      section: "phenotype",
    })
    expect(locateIssue(issue("genotype.chrom"))).toEqual({
      section: "genotype",
    })
    expect(locateIssue(issue("params.quantitative.phi"))).toEqual({
      section: "processing",
      kind: "quantitative",
    })
  })

  it("mapping-page issues aren't on this page", () => {
    expect(locateIssue(issue("populations.p1.sumstats_path", "mapping"))).toBe(
      null
    )
  })
})

it("fieldId makes a valid DOM id from a path", () => {
  expect(fieldId("xpass+", "params.binary.clump_params.target.kb")).toBe(
    "configure-xpass--params-binary-clump_params-target-kb"
  )
})
