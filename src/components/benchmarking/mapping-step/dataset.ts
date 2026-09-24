import type {
  FileLayout,
  PathKey,
} from "@/components/benchmarking/job-config/types"

/** What `GET /{job_id}/explore` returns as `dataset_structure`. Paths are relative to the dataset. */
export interface DirectoryItem {
  name: string
  path: string
  file_count: number
  total_size: number
  total_size_formatted: string
}

export interface FileInfo {
  name: string
  path: string
  size: number
  size_formatted: string
  file_type: string
  is_previewable: boolean
  last_modified: string
}

export interface DatasetStructure {
  directories: DirectoryItem[]
  files: FileInfo[]
  total_files: number
  total_directories: number
  extracted_size: string
  root_path: string
}

// Executables and binary formats that should never be mapped.
const DISALLOWED_EXTENSIONS = [
  "exe",
  "dll",
  "so",
  "dylib",
  "bin",
  "bat",
  "cmd",
  "sh",
  "com",
  "msi",
  "app",
  "dmg",
  "deb",
  "rpm",
  "jar",
  "class",
  "pyc",
  "pyo",
  "o",
  "obj",
  "lib",
  "a",
  "wasm",
]

function isMappableFile(file: FileInfo): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  return Boolean(file.path.trim()) && !DISALLOWED_EXTENSIONS.includes(extension)
}

/**
 * The files and folders a path can point at. Genotypes are a folder, or one PLINK file of a
 * set when the folder holds several. Summary statistics are a file (with a chromosome tag it
 * stands for its whole dataset), or a folder when they're split per chromosome. Phenotypes
 * and covariates are always a file.
 */
export function eligibleEntries(
  structure: DatasetStructure | null,
  key: PathKey,
  sumstatsLayout: FileLayout
): { files: FileInfo[]; directories: DirectoryItem[] } {
  if (!structure) return { files: [], directories: [] }
  const takesDirectories =
    key === "genotype_path" ||
    (key === "sumstats_path" && sumstatsLayout === "multi_chromosome")
  const mappable = structure.files.filter(isMappableFile)
  return {
    files:
      key === "genotype_path"
        ? mappable.filter((file) => isPlinkFile(file.path))
        : mappable,
    directories: takesDirectories
      ? structure.directories.filter((directory) =>
          Boolean(directory.path.trim())
        )
      : [],
  }
}

// A chromosome tag in a summary-statistics file name, read as the backend reads it
// (prs-backend tools/_shared/discovery.py, _SUMSTATS_CHROM_TAG).
const CHROM_TAG =
  /(^|[^A-Za-z0-9])((?:chr|chrom)0?(2[0-2]|1[0-9]|[1-9]))(?![A-Za-z0-9])/gi
const CHROM_FOLDER = /^chr(2[0-2]|1[0-9]|[1-9])$/

const naturally = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })

const parentOf = (path: string) =>
  path.slice(0, Math.max(path.lastIndexOf("/"), 0))
const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1)

/**
 * The dataset a summary-statistics file belongs to, as the backend names it: the name with its
 * chromosome tag and one separator taken out, so AFR.chr1.glm.linear.gz is chromosome 1 of
 * AFR.glm.linear.gz. A name with no tag, or more than one, is a genome-wide file: its own dataset.
 */
export function sumstatsDatasetName(fileName: string): {
  dataset: string
  chrom: number | null
} {
  const tags: { start: number; end: number; chrom: number }[] = []
  const pattern = new RegExp(CHROM_TAG.source, "gi")
  let match: RegExpExecArray | null
  while ((match = pattern.exec(fileName))) {
    const start = match.index + match[1].length
    tags.push({ start, end: start + match[2].length, chrom: Number(match[3]) })
    // Let the next tag reuse this one's trailing separator.
    pattern.lastIndex = start + match[2].length
  }
  if (tags.length !== 1) return { dataset: fileName, chrom: null }
  let { start, end } = tags[0]
  if (start > 0) start -= 1
  else if (end < fileName.length) end += 1
  return {
    dataset: fileName.slice(0, start) + fileName.slice(end),
    chrom: tags[0].chrom,
  }
}

export interface SumstatsDataset {
  name: string
  /** In chromosome order; a genome-wide file has one entry with no chromosome. */
  files: { path: string; chrom: number | null }[]
}

/** The summary-statistics datasets in a folder: its files, and those one level down in chr<N> folders. */
export function folderDatasets(
  structure: DatasetStructure | null,
  folder: string
): SumstatsDataset[] {
  if (!structure) return []
  const prefix = `${folder.replace(/\/+$/, "")}/`
  const byName: Record<string, SumstatsDataset> = {}
  for (const file of structure.files) {
    if (!file.path.startsWith(prefix)) continue
    const parts = file.path.slice(prefix.length).split("/")
    if (parts.length > 2 || parts.some((part) => part.startsWith("."))) continue
    const chromFolder = parts.length === 2 ? CHROM_FOLDER.exec(parts[0]) : null
    if (parts.length === 2 && !chromFolder) continue
    const { dataset, chrom } = sumstatsDatasetName(parts[parts.length - 1])
    const entry = (byName[dataset] ??= { name: dataset, files: [] })
    entry.files.push({
      path: file.path,
      chrom: chromFolder ? Number(chromFolder[1]) : chrom,
    })
  }
  // Plain string order, as the backend lists them.
  return Object.keys(byName)
    .sort()
    .map((name) => ({
      name,
      files: byName[name].files.sort(
        (a, b) => (a.chrom ?? 0) - (b.chrom ?? 0) || naturally(a.path, b.path)
      ),
    }))
}

/**
 * What a mapped summary-statistics path stands for. A file with a chromosome tag stands for
 * its whole dataset when the sumstats are per chromosome; any other file for itself. A folder
 * stands for its dataset when it holds exactly one. Null when the listing doesn't know the path.
 */
export function sumstatsSelection(
  structure: DatasetStructure | null,
  path: string,
  layout: FileLayout
): { datasets: SumstatsDataset[]; chosen: SumstatsDataset | null } | null {
  const target = path.trim().replace(/\/+$/, "")
  if (!structure || !target) return null
  if (structure.files.some((file) => file.path === target)) {
    let folder = parentOf(target)
    if (CHROM_FOLDER.test(baseName(folder))) folder = parentOf(folder)
    const { dataset, chrom } = sumstatsDatasetName(baseName(target))
    const datasets = folderDatasets(structure, folder)
    const whole = datasets.find((candidate) => candidate.name === dataset)
    const standsForDataset =
      layout === "multi_chromosome" && chrom !== null && whole
    return {
      datasets,
      chosen: standsForDataset
        ? whole
        : { name: baseName(target), files: [{ path: target, chrom }] },
    }
  }
  const datasets = folderDatasets(structure, target)
  if (datasets.length === 0) return null
  return { datasets, chosen: datasets.length === 1 ? datasets[0] : null }
}

const PLINK_EXTENSIONS = [".bed", ".bim", ".fam"]

export const isPlinkFile = (path: string) =>
  PLINK_EXTENSIONS.some((extension) => path.toLowerCase().endsWith(extension))

/** The PLINK sets (a .bed, .bim and .fam sharing a name) directly in a folder. */
export function plinkSets(
  structure: DatasetStructure | null,
  folder: string
): string[] {
  if (!structure) return []
  const prefix = `${folder.replace(/\/+$/, "")}/`
  const names = structure.files
    .map((file) => file.path)
    .filter(
      (path) =>
        path.startsWith(prefix) && !path.slice(prefix.length).includes("/")
    )
  return names
    .filter((path) => path.toLowerCase().endsWith(".bed"))
    .map((path) => path.slice(0, -4))
    .filter((stem) =>
      [".bim", ".fam"].every((extension) =>
        names.some(
          (name) => name.toLowerCase() === `${stem}${extension}`.toLowerCase()
        )
      )
    )
    .map(baseName)
    .sort(naturally)
}
