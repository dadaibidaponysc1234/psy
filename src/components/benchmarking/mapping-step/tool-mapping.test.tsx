import { useState } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { defaultDraft } from "@/components/benchmarking/job-config"
import type { ToolDraft, ToolId } from "@/components/benchmarking/job-config"
import type { DatasetStructure } from "@/components/benchmarking/mapping-step/dataset"
import { ToolMapping } from "@/components/benchmarking/mapping-step/mapping-step"
import { getToolDefinition } from "@/components/benchmarking/tools"

const structure: DatasetStructure = {
  files: [],
  directories: [],
  total_files: 0,
  total_directories: 0,
  extracted_size: "",
  root_path: "",
}

let latest: ToolDraft

function Harness({
  tool,
  dataset = structure,
}: {
  tool: ToolId
  dataset?: DatasetStructure | null
}) {
  const [draft, setDraft] = useState(() =>
    defaultDraft(getToolDefinition(tool))
  )
  latest = draft
  return (
    <ToolMapping
      draft={draft}
      structure={dataset}
      issues={[]}
      update={(change) => setDraft((current) => change(current))}
      onBrowse={() => {}}
    />
  )
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
const cardsShown = () => screen.queryByText("Configuration Mapping") !== null

describe("ToolMapping", () => {
  it("names can be entered while the dataset is still loading", () => {
    render(<Harness tool="sdprx" dataset={null} />)
    expect(
      screen.getByText("Waiting for dataset structure...")
    ).toBeInTheDocument()
    type("Target Population Name", "AFR")
    expect(latest.populations[0].name).toBe("AFR")
  })

  it("files can't be mapped until the names are saved; editing a name needs another save", () => {
    render(<Harness tool="sdprx" />)
    const save = () =>
      screen.getByRole("button", { name: "Save Population Names" })

    expect(
      screen.getByText("Population configuration required")
    ).toBeInTheDocument()
    expect(save()).toBeDisabled()

    type("Target Population Name", "AFR")
    type("Base Population Name", "EUR")
    expect(cardsShown()).toBe(false)

    fireEvent.click(save())
    expect(latest.names_saved).toBe(true)
    expect(cardsShown()).toBe(true)
    expect(
      screen.getByText("Target - AFR - Summary Statistics")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Base - EUR - Genotype Directory")
    ).toBeInTheDocument()

    // The panel collapses on save; reopen it to edit.
    fireEvent.click(screen.getByText(/SDPRX Population Configuration/))
    type("Base Population Name", "EAS")
    expect(latest.names_saved).toBe(false)
    expect(cardsShown()).toBe(false)
  })

  it("xpass: editing the validation name also needs another save", () => {
    render(<Harness tool="xpass" />)
    type("Target Population Name", "AFR")
    type("Auxiliary Population Name", "EUR")
    type("Validation Population Name", "EAS")
    fireEvent.click(
      screen.getByRole("button", { name: "Save Population Names" })
    )
    expect(cardsShown()).toBe(true)

    fireEvent.click(screen.getByText(/XPASS Population Configuration/))
    type("Validation Population Name", "SAS")
    expect(cardsShown()).toBe(false)
  })

  it("prscsx configures its populations in a panel instead of a names form", () => {
    render(<Harness tool="prscsx" />)
    expect(
      screen.queryByRole("button", { name: "Save Population Names" })
    ).not.toBeInTheDocument()
    expect(
      screen.getByText("Population configuration required")
    ).toBeInTheDocument()
  })
})
