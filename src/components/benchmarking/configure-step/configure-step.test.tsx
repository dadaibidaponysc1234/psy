import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ConfigureStep } from "@/components/benchmarking/configure-step/configure-step"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"

vi.mock("@/components/benchmarking/mapping-step/use-dataset-structure", () => ({
  useDatasetStructure: () => ({
    structure: null,
    loading: false,
    error: null,
    refresh: () => {},
  }),
}))

beforeEach(() => {
  useBenchmarkingStore.setState({ jobId: "job", jobDrafts: {} })
  useBenchmarkingStore.getState().syncJobTools("job", ["sdprx"])
  useBenchmarkingStore.getState().updateToolDraft("job", "sdprx", (draft) => ({
    ...draft,
    populations: draft.populations.map((population, index) => ({
      ...population,
      name: index === 0 ? "AFR" : "EUR",
    })),
  }))
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
})

describe("ConfigureStep", () => {
  it("blocks Next and lists what's left, grouped by section; an item opens its section", () => {
    vi.useFakeTimers()
    render(
      <ConfigureStep
        onNext={() => {}}
        toolsData={{ selectedTools: ["sdprx"] }}
      />
    )
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled()
    expect(
      screen.getByText(/Next is blocked: \d+ items in SDPRX/)
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Show" }))
    expect(screen.getAllByText("Processing Configuration").length).toBe(2)
    expect(screen.queryByLabelText("Rho")).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("button", { name: "Binary run: Rho needs a number" })
    )
    expect(screen.getByLabelText("Rho")).toBeInTheDocument()
    vi.runAllTimers()
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it("the evaluation type is the job's", () => {
    render(
      <ConfigureStep
        onNext={() => {}}
        toolsData={{ selectedTools: ["sdprx"] }}
      />
    )
    fireEvent.click(screen.getByLabelText("Quantitative"))
    expect(useBenchmarkingStore.getState().jobDrafts.job.evaluation_type).toBe(
      "quantitative"
    )
    expect(screen.queryByText(/Binary run:/)).not.toBeInTheDocument()
  })
})
