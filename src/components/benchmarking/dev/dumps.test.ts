import { describe, expect, it } from "vitest"
import {
  applyDump,
  isLoadable,
  makeDump,
  missingPaths,
} from "@/components/benchmarking/dev/dumps"
import { syncJobDraft } from "@/components/benchmarking/job-config"
import type { JobDraft } from "@/components/benchmarking/job-config"
import type { DatasetStructure } from "@/components/benchmarking/mapping-step/dataset"

function savedJob(): JobDraft {
  const job = syncJobDraft(undefined, ["sdprx", "prsice"])
  job.evaluation_type = "quantitative"
  for (const draft of job.tools) {
    draft.names_saved = true
    draft.genotype = { file_type: "multi_chromosome", chrom: [22] }
    draft.populations.forEach((population, index) => {
      const name = index === 0 ? "AFR" : "EUR"
      Object.assign(population, {
        name,
        gwas_n: 1000,
        sumstats_path: `data/${name}/sumstats`,
        genotype_path: `data/${name}/geno`,
        phenotype_path: `data/${name}/pheno.tsv`,
        column_mapping: { SNP: "ID" },
        traits: { binary: [], quantitative: ["y"] },
      })
    })
  }
  return job
}

const dump = makeDump(savedJob(), " toy ", " perchrom (upload) ", new Date(0))

describe("applyDump", () => {
  it("loads the chosen tools whole, with the dump's evaluation type", () => {
    const current = syncJobDraft(undefined, ["prsice"])
    const job = applyDump(current, dump, ["sdprx"], "all")
    expect(job.evaluation_type).toBe("quantitative")
    expect(job.tools.map((draft) => draft.tool)).toEqual(["prsice", "sdprx"])
    expect(job.tools[0]).toBe(current.tools[0])
    expect(job.tools[1]).toBe(dump.job.tools[0])
  })

  it("mapping scope takes names, files and layouts only", () => {
    const job = applyDump(undefined, dump, ["prsice"], "mapping")
    const [draft] = job.tools
    expect(job.evaluation_type).toBe("quantitative")
    expect(draft.names_saved).toBe(true)
    expect(draft.genotype).toEqual({ file_type: "multi_chromosome", chrom: [] })
    expect(draft.populations[0]).toMatchObject({
      name: "AFR",
      sumstats_path: "data/AFR/sumstats",
      gwas_n: null,
      column_mapping: {},
      traits: { binary: [], quantitative: [] },
    })
  })
})

it("missingPaths lists the chosen tools' paths the dataset doesn't have", () => {
  const structure: DatasetStructure = {
    files: [
      { path: "data/AFR/sumstats/a.txt" },
      { path: "data/AFR/pheno.tsv" },
    ].map((file) => ({
      ...file,
      name: "",
      size: 1,
      size_formatted: "",
      file_type: "",
      is_previewable: true,
      last_modified: "",
    })),
    directories: [
      {
        name: "geno",
        path: "data/AFR/geno",
        file_count: 1,
        total_size: 1,
        total_size_formatted: "",
      },
    ],
    total_files: 2,
    total_directories: 1,
    extracted_size: "",
    root_path: "",
  }
  expect(missingPaths(dump, ["prsice"], structure)).toEqual([
    "data/EUR/sumstats",
    "data/EUR/geno",
    "data/EUR/pheno.tsv",
  ])
})

it("dumps are trimmed, versioned and checked on load", () => {
  expect(dump).toMatchObject({
    name: "toy",
    dataset: "perchrom (upload)",
    savedAt: "1970-01-01T00:00:00.000Z",
  })
  expect(isLoadable(dump)).toBe(true)
  expect(isLoadable({ ...dump, version: 0 })).toBe(false)
})
