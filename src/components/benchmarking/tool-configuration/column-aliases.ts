// Centralized column aliases used across benchmarking tools (PRSice, PRScsx, BridgePRS, SDPRX)
// Tools should import and use this map for auto-mapping and alias display.
// Keys are case-insensitive when matched.

export const COMMON_COLUMN_ALIASES: Record<string, string[]> = {
  // SNP identifiers
  SNP: ["SNP", "RSID", "RS", "ID", "MARKERNAME", "VARIANT_ID", "SNP_ID"],
  // BridgePRS uses ID as the SNP identifier field
  ID: ["ID", "SNP", "RSID", "RS", "MARKERNAME", "VARIANT_ID", "SNP_ID"],

  // Chromosome and position
  CHR: ["CHR", "CHROMOSOME", "#CHROM", "CHROM"],
  BP: [
    "BP",
    "POS",
    "PS",
    "POSITION",
    "BP_HG19",
    "BP_HG38",
    "CHR_POSB36",
    "BASE_PAIR_LOCATION",
  ],
  PS: ["PS", "POS", "BP", "POSITION"],

  // Alleles
  A1: ["A1", "ALLELE1", "EFFECT_ALLELE", "ALTERNATE_ALLELE", "ALT"],
  A2: [
    "A2",
    "ALLELE2",
    "ALLELE0",
    "NONEFFECT_ALLELE",
    "REFERENCE_ALLELE",
    "REF",
  ],
  REF: ["REF", "REFERENCE_ALLELE", "ALLELE0", "NONEFFECT_ALLELE"],

  // Effect, error, p-value
  BETA: ["BETA", "B", "EFFECT", "LOG_ODDS", "ESTIMATE", "EFFECT_SIZE"],
  SE: ["SE", "STD_ERR", "STANDARD_ERROR", "STDERR"],
  P: ["P", "PVAL", "P_VALUE", "P_DGC", "P_WALD", "PVALUE"],

  // Sample size / counts
  N: ["N", "N_SAMPLES", "SAMPLES", "NCAS", "NCON", "OBS_CT", "TOTAL_SAMPLES"],

  // Z-score
  Z: ["Z", "Z_SCORE", "ZSCORE"],
}

export function aliasMatches(field: string, header: string): boolean {
  const aliases = COMMON_COLUMN_ALIASES[field] || []
  const lower = aliases.map((a) => a.toLowerCase())
  return lower.includes(header.toLowerCase())
}