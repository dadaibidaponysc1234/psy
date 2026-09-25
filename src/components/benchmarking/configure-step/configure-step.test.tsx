import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { toast } from "react-hot-toast"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ConfigureStep } from "@/components/benchmarking/configure-step/configure-step"
import benchmarkApi from "@/lib/benchmark-api"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"

vi.mock("@/lib/benchmark-api", () => ({ default: { post: vi.fn() } }))
vi.mock("react-hot-toast", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}))

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

  it("checks the config with the backend first; a refusal shows its message and nothing is submitted", async () => {
    const store = useBenchmarkingStore.getState()
    store.syncJobTools("job", ["snpnet"])
    store.setJobEvaluationType("job", "quantitative")
    store.updateToolDraft("job", "snpnet", (draft) => ({
      ...draft,
      populations: draft.populations.map((population) => ({
        ...population,
        name: "AFR",
        genotype_path: "data/AFR/genotypes",
        phenotype_path: "data/AFR/pheno.tsv",
        traits: { binary: [], quantitative: ["y"] },
      })),
      params: {
        ...draft.params,
        quantitative: { ...draft.params.quantitative, trait: "y" },
      },
    }))
    const post = vi.mocked(benchmarkApi.post)
    post.mockRejectedValueOnce(
      Object.assign(new Error("400"), {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: {
              message: "snpnet: the target needs split_config",
              status: 400,
            },
          },
        },
      })
    )
    const onNext = vi.fn()
    render(
      <ConfigureStep
        onNext={onNext}
        toolsData={{ selectedTools: ["snpnet"] }}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "snpnet: the target needs split_config",
        { duration: 10000 }
      )
    )
    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][0]).toMatch(/\/job\/config\/check$/)
    expect(onNext).not.toHaveBeenCalled()
  })
})
