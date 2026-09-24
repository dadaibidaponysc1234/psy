import { COMMON_COLUMN_ALIASES } from "@/components/benchmarking/configure-step/column-aliases"
import type { DatasetStructure } from "@/components/benchmarking/mapping-step/dataset"

/** A preview line's cells: split on tabs when there are any, otherwise on whitespace. */
export function splitLine(line: string): string[] {
  const trimmed = line.trim()
  if (!trimmed) return []
  return trimmed.includes("\t") ? trimmed.split("\t") : trimmed.split(/\s+/)
}

const naturally = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })

/**
 * The files a mapped path can be previewed through, in a fixed order: the path itself when
 * it's a file, or the previewable files in the folder, chr1 before chr2 before chr10. Files
 * directly in the folder come first; subfolders are only looked into when it has none.
 * Empty when the listing doesn't know the path.
 */
export function previewFiles(
  structure: DatasetStructure | null,
  path: string
): string[] {
  const target = path.trim().replace(/\/+$/, "")
  if (!structure || !target) return []
  if (structure.files.some((file) => file.path === target)) return [target]

  const prefix = `${target}/`
  const inside = structure.files.filter(
    (file) => file.path.startsWith(prefix) && file.is_previewable
  )
  const direct = inside.filter(
    (file) => !file.path.slice(prefix.length).includes("/")
  )
  return (direct.length > 0 ? direct : inside)
    .map((file) => file.path)
    .sort(naturally)
}

/**
 * Fills each unmapped column with a header no column uses yet, trying the column's aliases
 * in order, so an exact name wins over a looser alias (A1 over ALT). Columns already mapped
 * are never changed.
 */
export function autoMap(
  columns: string[],
  headers: string[],
  mapping: Record<string, string>
): Record<string, string> {
  const next = { ...mapping }
  const used = Object.keys(next)
    .map((column) => next[column]?.trim())
    .filter(Boolean)
  for (const column of columns) {
    if (next[column]?.trim()) continue
    const free = headers.filter((header) => !used.includes(header))
    let match: string | undefined
    for (const alias of aliasesFor(column)) {
      match = free.find(
        (header) => header.toLowerCase() === alias.toLowerCase()
      )
      if (match) break
    }
    if (match) {
      next[column] = match
      used.push(match)
    }
  }
  return next
}

export function aliasesFor(column: string): string[] {
  return COMMON_COLUMN_ALIASES[column] ?? []
}

/**
 * What a column's select offers: the file's headers not used by another column, keeping the
 * current value. When the preview failed and there are no headers, the column's aliases
 * stand in so it can still be mapped by hand.
 */
export function headerOptions(
  column: string,
  headers: string[],
  mapping: Record<string, string>,
  previewFailed: boolean
): string[] {
  const current = mapping[column]?.trim() ?? ""
  const usedElsewhere = Object.keys(mapping)
    .filter((other) => other !== column)
    .map((other) => mapping[other]?.trim())
    .filter(Boolean)
  const source =
    headers.length > 0 ? headers : previewFailed ? aliasesFor(column) : []
  const options = source.filter((header) => !usedElsewhere.includes(header))
  if (current && !options.includes(current)) options.unshift(current)
  return options
}
