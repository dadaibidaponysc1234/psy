import { useState } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { defaultDraft } from "@/components/benchmarking/job-config"
import type { ToolDraft, ToolId } from "@/components/benchmarking/job-config"
import { PopulationsEditor } from "@/components/benchmarking/mapping-step/populations-editor"
import { getToolDefinition } from "@/components/benchmarking/tools"

let latest: ToolDraft

function Harness({
  tool,
  prepare = (draft) => draft,
}: {
  tool: ToolId
  prepare?: (draft: ToolDraft) => ToolDraft
}) {
  const definition = getToolDefinition(tool)
  const [draft, setDraft] = useState(() => prepare(defaultDraft(definition)))
  latest = draft
  return (
    <PopulationsEditor
      definition={definition}
      draft={draft}
      structure={null}
      onUpdate={(update) => setDraft((current) => update(current))}
    />
  )
}

describe("PopulationsEditor", () => {
  it("prscsx: one target, bases can be added and removed down to one", () => {
    render(<Harness tool="prscsx" />)

    expect(screen.getByText(/Target population/)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /Remove/ })
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Add base population" }))
    expect(latest.populations.map((population) => population.role)).toEqual([
      "target",
      "base",
      "base",
    ])

    const removeButtons = screen.getAllByRole("button", { name: /Remove/ })
    expect(removeButtons).toHaveLength(2)
    fireEvent.click(removeButtons[1])
    expect(latest.populations.map((population) => population.role)).toEqual([
      "target",
      "base",
    ])
    expect(
      screen.queryByRole("button", { name: /Remove/ })
    ).not.toBeInTheDocument()
  })

  it("names are edited in place and optional files are marked optional", () => {
    render(<Harness tool="prscsx" />)

    fireEvent.change(screen.getByLabelText("Target name"), {
      target: { value: "AFR" },
    })
    expect(latest.populations[0].name).toBe("AFR")

    // Target: 3 required + covariates optional; base: sumstats required + 3 optional.
    expect(screen.getAllByText("Required")).toHaveLength(4)
    expect(screen.getAllByText("Optional")).toHaveLength(4)
  })

  it("sdprx: exactly one base, so there's nothing to add or remove", () => {
    render(<Harness tool="sdprx" />)
    expect(
      screen.queryByRole("button", { name: /Add/ })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /Remove/ })
    ).not.toBeInTheDocument()
  })

  it("a mapped path shows as mapped and can be cleared", () => {
    render(
      <Harness
        tool="prsice"
        prepare={(draft) => ({
          ...draft,
          populations: draft.populations.map((population) =>
            population.role === "target"
              ? { ...population, sumstats_path: "sumstats/AFR.txt" }
              : population
          ),
        })}
      />
    )

    expect(screen.getByText("sumstats/AFR.txt")).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole("button", { name: "Clear Summary statistics" })
    )
    expect(latest.populations[0].sumstats_path).toBe("")
    expect(screen.queryByText("sumstats/AFR.txt")).not.toBeInTheDocument()
  })
})
