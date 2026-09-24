import { describe, expect, it } from "vitest"
import {
  autoMap,
  headerOptions,
  previewFiles,
  splitLine,
} from "@/components/benchmarking/configure-step/preview"
import type {
  DatasetStructure,
  FileInfo,
} from "@/components/benchmarking/mapping-step/dataset"

const file = (path: string, is_previewable = true): FileInfo => ({
  name: path.split("/").pop() ?? path,
  path,
  size: 1,
  size_formatted: "1 B",
  file_type: "text",
  is_previewable,
  last_modified: "",
})

const structure = (paths: FileInfo[]): DatasetStructure => ({
  files: paths,
  directories: [],
  total_files: paths.length,
  total_directories: 0,
  extracted_size: "",
  root_path: "",
})

describe("previewFiles", () => {
  const listing = structure([
    file("data/sumstats/AFR/chr10.tsv"),
    file("data/sumstats/AFR/chr2.tsv"),
    file("data/sumstats/AFR/chr1.tsv"),
    file("data/sumstats/AFR/readme.pdf", false),
    file("data/sumstats/AFR/old/chr1.tsv"),
    file("data/sumstats/AFR.tsv"),
    file("data/nested/a/x.tsv"),
  ])

  it("a file previews itself", () => {
    expect(previewFiles(listing, "data/sumstats/AFR.tsv")).toEqual([
      "data/sumstats/AFR.tsv",
    ])
  })

  it("a folder previews its own previewable files in natural order", () => {
    expect(previewFiles(listing, "data/sumstats/AFR/")).toEqual([
      "data/sumstats/AFR/chr1.tsv",
      "data/sumstats/AFR/chr2.tsv",
      "data/sumstats/AFR/chr10.tsv",
    ])
  })

  it("a folder with only subfolders previews what's inside them", () => {
    expect(previewFiles(listing, "data/nested")).toEqual([
      "data/nested/a/x.tsv",
    ])
  })

  it("an unknown path or no listing gives nothing", () => {
    expect(previewFiles(listing, "elsewhere")).toEqual([])
    expect(previewFiles(null, "data/sumstats/AFR.tsv")).toEqual([])
  })
})

describe("autoMap", () => {
  it("fills only unmapped columns, never reusing a header", () => {
    expect(
      autoMap(["SNP", "A1", "A2", "BETA"], ["rsid", "ALT", "REF", "beta"], {
        SNP: "my_id",
        A1: "REF",
      })
    ).toEqual({ SNP: "my_id", A1: "REF", BETA: "beta" })
  })
})

describe("headerOptions", () => {
  const mapping = { SNP: "rsid", A1: "ALT" }

  it("offers headers not used by other columns, keeping the current one", () => {
    expect(headerOptions("A1", ["rsid", "ALT", "REF"], mapping, false)).toEqual(
      ["ALT", "REF"]
    )
  })

  it("keeps a value that isn't in this file's headers", () => {
    expect(headerOptions("SNP", ["ID", "ALT"], mapping, false)).toEqual([
      "rsid",
      "ID",
    ])
  })

  it("falls back to the column's aliases when the preview failed", () => {
    expect(headerOptions("P", [], {}, true)).toContain("PVAL")
    expect(headerOptions("P", [], {}, false)).toEqual([])
  })
})

describe("splitLine", () => {
  it("splits on tabs when present, else whitespace", () => {
    expect(splitLine("a b\tc\n")).toEqual(["a b", "c"])
    expect(splitLine("  a  b ")).toEqual(["a", "b"])
    expect(splitLine("  ")).toEqual([])
  })
})
