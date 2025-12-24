/**
 * Shared Sanitizers
 *
 * Common sanitization logic for tool configurations.
 */

/**
 * Sanitize chromosome array input
 */
export function sanitizeChromArray(chrom: unknown): string[] {
  if (Array.isArray(chrom)) {
    return chrom
      .flatMap((entry) => {
        if (typeof entry === "string") {
          return entry.split(",").map((s) => s.trim())
        }
        if (typeof entry === "number") {
          return [String(entry)]
        }
        return []
      })
      .filter((c) => c.length > 0 && /^(\d{1,2}|[XY])$/i.test(c))
      .map((c) => c.toUpperCase())
  }
  if (typeof chrom === "string") {
    return chrom
      .split(",")
      .map((s) => s.trim())
      .filter((c) => c.length > 0 && /^(\d{1,2}|[XY])$/i.test(c))
      .map((c) => c.toUpperCase())
  }
  return []
}

/**
 * Sanitize evaluation type based on processing options
 */
export function normalizeEvaluationType(
  evaluationType: string | undefined,
  processBinary: boolean | undefined,
  processQuantitative: boolean | undefined
): "both" | "binary" | "quantitative" {
  if (evaluationType === "binary" || evaluationType === "quantitative") {
    return evaluationType
  }
  if (processBinary && !processQuantitative) return "binary"
  if (processQuantitative && !processBinary) return "quantitative"
  return "both"
}

/**
 * Sanitize file path - normalize slashes and trim
 */
export function sanitizePath(path: string | undefined): string {
  if (!path) return ""
  return path.replace(/\\/g, "/").trim()
}

/**
 * Sanitize file patterns object
 */
export function sanitizeFilePatterns(patterns: {
  bed?: string
  bim?: string
  fam?: string
}): { bed: string; bim: string; fam: string } {
  return {
    bed: sanitizePath(patterns?.bed),
    bim: sanitizePath(patterns?.bim),
    fam: sanitizePath(patterns?.fam),
  }
}

/**
 * Filter traits based on evaluation type
 */
export function filterTraitsByEvaluationType(
  traits: {
    binary_traits: string[]
    quantitative_traits: string[]
  },
  evaluationType: "both" | "binary" | "quantitative"
): {
  binary_traits: string[]
  quantitative_traits: string[]
} {
  return {
    binary_traits:
      evaluationType === "binary" || evaluationType === "both"
        ? (traits.binary_traits || []).filter(Boolean)
        : [],
    quantitative_traits:
      evaluationType === "quantitative" || evaluationType === "both"
        ? (traits.quantitative_traits || []).filter(Boolean)
        : [],
  }
}
