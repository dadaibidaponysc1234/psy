import { describe, expect, it } from "vitest"
import {
  eligibleEntries,
  type DatasetStructure,
} from "@/components/benchmarking/mapping-step/dataset"

const file = (path: string) => ({
  name: path.split("/").pop()!,
  path,
  size: 1,
  size_formatted: "1 B",
  file_type: "",
  is_previewable: false,
  last_modified: "",
})
const directory = (path: string) => ({
  name: path.split("/").pop()!,
  path,
  file_count: 1,
  total_size: 1,
  total_size_formatted: "1 B",
})

const structure: DatasetStructure = {
  files: [
    file("sumstats/AFR.txt"),
    file("pheno/AFR.tsv"),
    file("tools/run.sh"),
    file(" "),
  ],
  directories: [
    directory("genotypes/AFR"),
    directory("sumstats"),
    directory(""),
  ],
  total_files: 4,
  total_directories: 3,
  extracted_size: "",
  root_path: "",
}

const paths = (entries: { path: string }[]) =>
  entries.map((entry) => entry.path)

describe("eligibleEntries", () => {
  it("genotypes are folders only", () => {
    const { files, directories } = eligibleEntries(
      structure,
      "genotype_path",
      "merged"
    )
    expect(files).toEqual([])
    expect(paths(directories)).toEqual(["genotypes/AFR", "sumstats"])
  })

  it("summary statistics are files, and folders too when split per chromosome", () => {
    expect(
      eligibleEntries(structure, "sumstats_path", "merged").directories
    ).toEqual([])
    expect(
      paths(
        eligibleEntries(structure, "sumstats_path", "multi_chromosome")
          .directories
      )
    ).toEqual(["genotypes/AFR", "sumstats"])
  })

  it("phenotypes and covariates are files only, never executables or blank paths", () => {
    for (const key of ["phenotype_path", "covariate_path"] as const) {
      const { files, directories } = eligibleEntries(
        structure,
        key,
        "multi_chromosome"
      )
      expect(paths(files)).toEqual(["sumstats/AFR.txt", "pheno/AFR.tsv"])
      expect(directories).toEqual([])
    }
  })

  it("nothing before the dataset has loaded", () => {
    expect(eligibleEntries(null, "sumstats_path", "merged")).toEqual({
      files: [],
      directories: [],
    })
  })
})
