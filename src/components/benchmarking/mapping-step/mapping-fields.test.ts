import { describe, expect, it } from "vitest"
import { defaultDraft } from "@/components/benchmarking/job-config"
import type { ToolDraft, ToolId } from "@/components/benchmarking/job-config"
import {
  mappingFields,
  namesReady,
  populationSummary,
} from "@/components/benchmarking/mapping-step/mapping-fields"
import { getToolDefinition } from "@/components/benchmarking/tools"

function named(tool: ToolId, names: string[], saved = true): ToolDraft {
  const draft = defaultDraft(getToolDefinition(tool))
  return {
    ...draft,
    names_saved: saved,
    populations: draft.populations.map((population, index) => ({
      ...population,
      name: names[index] ?? "",
    })),
  }
}

describe("mappingFields", () => {
  it("titles every card role - population - file, in role order", () => {
    const fields = mappingFields(
      getToolDefinition("prsice"),
      named("prsice", ["AFR", "EUR"])
    )
    expect(fields.map((field) => field.title)).toEqual([
      "Target - AFR - Summary Statistics",
      "Target - AFR - Genotype Directory",
      "Target - AFR - Phenotype File",
      "Base - EUR - Summary Statistics",
      "Base - EUR - Genotype Directory",
      "Base - EUR - Phenotype File",
    ])
    expect(fields[4].description).toBe(
      "Directory containing PLINK format genotype files (.bed, .bim, .fam) for the base population (EUR)"
    )
  })

  it("optional files get a card only once included, marked optional", () => {
    const draft = named("prscsx", ["AFR", "EUR"])
    expect(
      mappingFields(getToolDefinition("prscsx"), draft).map((f) => f.title)
    ).toEqual([
      "Target - AFR - Summary Statistics",
      "Target - AFR - Genotype Directory",
      "Target - AFR - Phenotype File",
      "Base - EUR - Summary Statistics",
    ])

    draft.populations[1].included_paths = ["phenotype_path"]
    const last = mappingFields(getToolDefinition("prscsx"), draft).pop()!
    expect(last).toMatchObject({
      title: "Base - EUR - Phenotype File",
      optional: true,
    })
  })
})

describe("namesReady", () => {
  it("a names form must be saved, and editing clears the save", () => {
    const definition = getToolDefinition("sdprx")
    expect(namesReady(definition, named("sdprx", ["AFR", "EUR"], false))).toBe(
      false
    )
    expect(namesReady(definition, named("sdprx", ["AFR", "EUR"]))).toBe(true)
  })

  it("names must be present and distinct", () => {
    const definition = getToolDefinition("xpass")
    expect(namesReady(definition, named("xpass", ["AFR", "EUR", ""]))).toBe(
      false
    )
    expect(namesReady(definition, named("xpass", ["AFR", "EUR", "afr"]))).toBe(
      false
    )
    expect(namesReady(definition, named("xpass", ["AFR", "EUR", "EAS"]))).toBe(
      true
    )
  })

  it("prscsx has no save: valid names are enough", () => {
    expect(
      namesReady(
        getToolDefinition("prscsx"),
        named("prscsx", ["AFR", "EUR"], false)
      )
    ).toBe(true)
  })
})

describe("populationSummary", () => {
  it("names the populations the cards are for", () => {
    expect(
      populationSummary(
        getToolDefinition("sdprx"),
        named("sdprx", ["AFR", "EUR"])
      )
    ).toBe("AFR and EUR populations")
    expect(
      populationSummary(
        getToolDefinition("xpass"),
        named("xpass", ["AFR", "EUR", "EAS"])
      )
    ).toBe("AFR, EUR and EAS populations")
    expect(
      populationSummary(
        getToolDefinition("prscsx"),
        named("prscsx", ["AFR", "EUR"])
      )
    ).toBe("AFR with 1 base population")
  })
})
