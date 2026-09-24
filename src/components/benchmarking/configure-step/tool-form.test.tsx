import { useState } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  defaultDraft,
  validateDraft,
} from "@/components/benchmarking/job-config"
import type {
  EvaluationType,
  ToolDraft,
  ToolId,
} from "@/components/benchmarking/job-config"
import type { DatasetStructure } from "@/components/benchmarking/mapping-step/dataset"
import { getToolDefinition } from "@/components/benchmarking/tools"
import {
  INITIAL_NAV,
  ToolForm,
  type FormNav,
} from "@/components/benchmarking/configure-step/tool-form"
import { usePreviews } from "@/components/benchmarking/configure-step/use-previews"

const previews: Record<string, string[]> = {
  "sumstats/AFR/chr1.tsv": ["SNP\tA1\tA2\tBETA\tP", "rs1\tA\tG\t0.1\t0.5"],
  "sumstats/AFR/chr2.tsv": ["SNP\tA1\tA2\tBETA\tP", "rs2\tC\tT\t0.2\t0.4"],
  "sumstats/AFR/chr10.tsv": ["SNP\tA1\tA2\tBETA\tP", "rs3\tC\tT\t0.2\t0.4"],
}
const requested: string[] = []

vi.mock("@/lib/benchmark-api", () => ({
  default: {
    get: vi.fn(async (url: string) => {
      const path = decodeURIComponent(url.split("/preview/")[1].split("?")[0])
      requested.push(path)
      const lines = previews[path]
      if (!lines) throw new Error("404")
      return { data: { filename: path.split("/").pop(), preview_lines: lines } }
    }),
  },
}))

const listing: DatasetStructure = {
  files: Object.keys(previews).map((path) => ({
    name: path.split("/").pop() ?? path,
    path,
    size: 1,
    size_formatted: "1 B",
    file_type: "text",
    is_previewable: true,
    last_modified: "",
  })),
  directories: [],
  total_files: 3,
  total_directories: 0,
  extracted_size: "",
  root_path: "",
}

let latest: ToolDraft

function Harness({
  tool,
  prepare,
  evaluationType = "both",
}: {
  tool: ToolId
  prepare?: (draft: ToolDraft) => void
  evaluationType?: EvaluationType
}) {
  const definition = getToolDefinition(tool)
  const [draft, setDraft] = useState(() => {
    const fresh = defaultDraft(definition)
    fresh.populations.forEach((population, index) => {
      population.name = ["AFR", "EUR", "EAS"][index]
      population.sumstats_path =
        index === 0 ? "sumstats/AFR" : `sumstats/${index}`
    })
    prepare?.(fresh)
    return fresh
  })
  const [nav, setNav] = useState<FormNav>(INITIAL_NAV)
  latest = draft
  return (
    <ToolForm
      jobId="job"
      definition={definition}
      draft={draft}
      evaluationType={evaluationType}
      structure={listing}
      issues={validateDraft(draft, evaluationType)}
      nav={nav}
      onNavChange={setNav}
      update={(change) => setDraft((current) => change(current))}
    />
  )
}

beforeEach(() => {
  requested.length = 0
  usePreviews.setState({ entries: {}, cursors: {} })
})

describe("ToolForm", () => {
  it("previews a folder's files in order, one at a time, and auto-maps without overwriting", async () => {
    render(
      <Harness
        tool="prscsx"
        prepare={(draft) => {
          draft.populations[0].column_mapping = { SNP: "my_snp" }
        }}
      />
    )
    expect(screen.getByText(/This folder holds 3 files/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Preview File/ }))
    await waitFor(() => expect(requested).toEqual(["sumstats/AFR/chr1.tsv"]))
    await waitFor(() =>
      expect(latest.populations[0].column_mapping).toEqual({
        SNP: "my_snp",
        A1: "A1",
        A2: "A2",
        BETA: "BETA",
        P: "P",
      })
    )
    // SNP kept the user's choice, which this file doesn't have.
    expect(screen.getByText("Not in this file")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Next file" }))
    await waitFor(() =>
      expect(requested).toEqual([
        "sumstats/AFR/chr1.tsv",
        "sumstats/AFR/chr2.tsv",
      ])
    )
    fireEvent.click(screen.getByRole("button", { name: "Previous file" }))
    fireEvent.click(screen.getByRole("button", { name: "Previous file" }))
    await waitFor(() => expect(requested).toContain("sumstats/AFR/chr10.tsv"))
    expect(screen.getByText(/\(3 of 3\)/)).toBeInTheDocument()
  })

  it("the GWAS sample size is required per tool rule; XPASS's N column gives way to it", () => {
    render(
      <Harness
        tool="xpass"
        prepare={(draft) => {
          draft.populations[0].column_mapping = { SNP: "s", A1: "a", A2: "b" }
        }}
      />
    )
    expect(
      screen.getByText(
        "Target (AFR): map the N column or enter the GWAS sample size"
      )
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("GWAS Sample Size"), {
      target: { value: "20000" },
    })
    expect(latest.populations[0].gwas_n).toBe(20000)
    expect(
      screen.queryByText(/map the N column or enter/)
    ).not.toBeInTheDocument()
  })

  it("prsice asks which trait to score, and only once traits are ticked", () => {
    render(<Harness tool="prsice" />)
    fireEvent.click(screen.getByText("Processing Configuration"))
    expect(
      screen.getAllByText(/No binary traits configured for Target \(AFR\)/)
    ).toHaveLength(1)
  })

  it("xpass+ edits its parameters once for every run", () => {
    render(<Harness tool="xpass+" />)
    fireEvent.click(screen.getByText("Processing Configuration"))
    expect(
      screen.queryByRole("tab", { name: "Binary" })
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("Compute posterior mean"))
    expect(latest.params.binary.compPosMean).toBe(false)
    expect(latest.params.quantitative.compPosMean).toBe(false)
  })

  it("sections show what's left to fix", () => {
    render(<Harness tool="sdprx" />)
    expect(screen.getAllByText(/to fix$/).length).toBeGreaterThan(0)
    expect(screen.queryByText("Preprocessing Options")).not.toBeInTheDocument()
  })
})
