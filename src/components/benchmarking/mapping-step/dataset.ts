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
 * The files and folders a path can point at: genotypes are always a folder; summary
 * statistics are a file, or a folder when they're split per chromosome; phenotypes and
 * covariates are always a file.
 */
export function eligibleEntries(
  structure: DatasetStructure | null,
  key: PathKey,
  sumstatsLayout: FileLayout
): { files: FileInfo[]; directories: DirectoryItem[] } {
  if (!structure) return { files: [], directories: [] }
  const takesFiles = key !== "genotype_path"
  const takesDirectories =
    key === "genotype_path" ||
    (key === "sumstats_path" && sumstatsLayout === "multi_chromosome")
  return {
    files: takesFiles ? structure.files.filter(isMappableFile) : [],
    directories: takesDirectories
      ? structure.directories.filter((directory) =>
          Boolean(directory.path.trim())
        )
      : [],
  }
}
