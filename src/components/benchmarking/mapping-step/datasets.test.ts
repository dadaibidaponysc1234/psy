import { describe, expect, it } from "vitest"
import { defaultDraft } from "@/components/benchmarking/job-config"
import {
  folderDatasets,
  plinkSets,
  sumstatsDatasetName,
  sumstatsSelection,
  type DatasetStructure,
} from "@/components/benchmarking/mapping-step/dataset"
import {
  checkPath,
  pathIssues,
} from "@/components/benchmarking/mapping-step/path-checks"
import { getToolDefinition } from "@/components/benchmarking/tools"

const listing = (paths: string[]): DatasetStructure => ({
  files: paths.map((path) => ({
    name: path.split("/").pop()!,
    path,
    size: 1,
    size_formatted: "1 B",
    file_type: "",
    is_previewable: true,
    last_modified: "",
  })),
  directories: [],
  total_files: paths.length,
  total_directories: 0,
  extracted_size: "",
  root_path: "",
})

const SUMSTATS = "data/pop_AFR/sumstats"
const structure = listing([
  `${SUMSTATS}/AFR.chr10.glm.linear.gz`,
  `${SUMSTATS}/AFR.chr2.glm.linear.gz`,
  `${SUMSTATS}/AFR.chr1.glm.linear.gz`,
  `${SUMSTATS}/AFR_half.chr1.glm.linear.gz`,
  `${SUMSTATS}/AFR_half.chr2.glm.linear.gz`,
  "data/single/EUR.chr1.txt",
  "data/single/EUR.chr2.txt",
  "data/bychr/chr1/EAS.txt",
  "data/bychr/chr2/EAS.txt",
  "data/geno/AFR_v1.bed",
  "data/geno/AFR_v1.bim",
  "data/geno/AFR_v1.fam",
  "data/geno/AFR_v2.bed",
  "data/geno/AFR_v2.bim",
  "data/geno/AFR_v2.fam",
  "data/geno/notes.log",
])

describe("sumstatsDatasetName (the backend's rule)", () => {
  it("takes out the chromosome tag and one separator", () => {
    expect(sumstatsDatasetName("AFR.chr1.glm.linear.gz")).toEqual({
      dataset: "AFR.glm.linear.gz",
      chrom: 1,
    })
    expect(sumstatsDatasetName("chr22_AFR.txt")).toEqual({
      dataset: "AFR.txt",
      chrom: 22,
    })
    expect(sumstatsDatasetName("AFR_chrom05.txt")).toEqual({
      dataset: "AFR.txt",
      chrom: 5,
    })
  })

  it("a name with no tag, or two, is a genome-wide file", () => {
    expect(sumstatsDatasetName("AFR.txt")).toEqual({
      dataset: "AFR.txt",
      chrom: null,
    })
    expect(sumstatsDatasetName("chr1_chr2.txt").chrom).toBe(null)
    expect(sumstatsDatasetName("chr23.txt").chrom).toBe(null)
    expect(sumstatsDatasetName("mychr1.txt").chrom).toBe(null)
  })
})

describe("folderDatasets", () => {
  it("groups a folder's files into datasets, files in chromosome order", () => {
    expect(folderDatasets(structure, SUMSTATS)).toEqual([
      {
        name: "AFR.glm.linear.gz",
        files: [1, 2, 10].map((chrom) => ({
          path: `${SUMSTATS}/AFR.chr${chrom}.glm.linear.gz`,
          chrom,
        })),
      },
      {
        name: "AFR_half.glm.linear.gz",
        files: [1, 2].map((chrom) => ({
          path: `${SUMSTATS}/AFR_half.chr${chrom}.glm.linear.gz`,
          chrom,
        })),
      },
    ])
  })

  it("reads chr<N> folders one level down", () => {
    expect(folderDatasets(structure, "data/bychr")).toEqual([
      {
        name: "EAS.txt",
        files: [
          { path: "data/bychr/chr1/EAS.txt", chrom: 1 },
          { path: "data/bychr/chr2/EAS.txt", chrom: 2 },
        ],
      },
    ])
  })
})

describe("sumstatsSelection", () => {
  it("a per-chromosome file stands for its dataset", () => {
    const selection = sumstatsSelection(
      structure,
      `${SUMSTATS}/AFR_half.chr2.glm.linear.gz`,
      "multi_chromosome"
    )
    expect(selection?.chosen?.name).toBe("AFR_half.glm.linear.gz")
    expect(selection?.chosen?.files).toHaveLength(2)
  })

  it("with merged sumstats a file is only itself", () => {
    const path = `${SUMSTATS}/AFR.chr1.glm.linear.gz`
    expect(sumstatsSelection(structure, path, "merged")?.chosen?.files).toEqual(
      [{ path, chrom: 1 }]
    )
  })

  it("a folder stands for its dataset only when it holds one", () => {
    expect(
      sumstatsSelection(structure, SUMSTATS, "multi_chromosome")?.chosen
    ).toBe(null)
    expect(
      sumstatsSelection(structure, "data/single", "multi_chromosome")?.chosen
        ?.name
    ).toBe("EUR.txt")
  })
})

it("plinkSets lists the complete sets directly in a folder", () => {
  expect(plinkSets(structure, "data/geno")).toEqual(["AFR_v1", "AFR_v2"])
})

describe("checkPath and pathIssues", () => {
  const definition = getToolDefinition("sdprx")
  const draft = defaultDraft(definition)
  draft.sumstats_file_type = "multi_chromosome"
  const target = draft.populations[0]
  target.name = "AFR"

  it("a folder with two datasets or two PLINK sets asks for one file to be picked", () => {
    target.sumstats_path = SUMSTATS
    target.genotype_path = "data/geno"
    expect(
      checkPath(structure, draft, target, "sumstats_path").problem
    ).toMatch(/holds 2 datasets \(AFR.glm.linear.gz, AFR_half.glm.linear.gz\)/)
    expect(
      checkPath(structure, draft, target, "genotype_path").problem
    ).toMatch(/holds 2 PLINK sets \(AFR_v1, AFR_v2\)/)
    expect(pathIssues(definition, draft, structure)).toEqual([
      "Target (AFR): pick one dataset in its summary statistics folder",
      "Target (AFR): pick one PLINK set in its genotypes folder",
    ])
  })

  it("a picked file names what it stands for", () => {
    target.sumstats_path = `${SUMSTATS}/AFR.chr2.glm.linear.gz`
    target.genotype_path = "data/geno/AFR_v2.bim"
    expect(checkPath(structure, draft, target, "sumstats_path")).toEqual({
      note: "Dataset AFR.glm.linear.gz: 3 chromosome files",
    })
    expect(checkPath(structure, draft, target, "genotype_path")).toEqual({
      note: "PLINK set AFR_v2",
    })
    expect(pathIssues(definition, draft, structure)).toEqual([])
  })
})
