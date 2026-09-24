/**
 * Payload Builders
 *
 * This is the new modular entry point that imports from individual builder files.
 * Legacy sanitizers are still re-exported from the legacy file until they are fully extracted.
 */

// =========================================================================
// MODULAR PROCESSING PAYLOAD BUILDERS
// These have been fully extracted to their own files
// =========================================================================

export { buildPrscsxProcessingPayload } from "./payload-builders/prscsx-builder"
export { buildBridgeprsProcessingPayload } from "./payload-builders/bridgeprs-builder"
export { buildSdprxProcessingPayload } from "./payload-builders/sdprx-builder"
export { buildPrsiceProcessingPayload } from "./payload-builders/prsice-builder"
export {
  buildXpassProcessingPayload,
  buildXpassPlusProcessingPayload,
} from "./payload-builders/xpass-builder"

// =========================================================================
// LEGACY EXPORTS (to be extracted in future phases)
// Still using the monolith versions for sanitizers and pre-processing builders
// =========================================================================

// Re-export sanitizers from legacy (these are complex and used across many files)
export {
  sanitizeChromArray,
  sanitizeBridgeprsConfig,
  sanitizePrscsxConfig,
  sanitizePrsiceConfig,
  sanitizeSdprxConfig,
  sanitizeXpassConfig,
} from "./payload-builders-legacy"
