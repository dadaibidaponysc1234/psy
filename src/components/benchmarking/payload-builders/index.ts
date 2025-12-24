/**
 * Payload Builders Index
 *
 * Re-exports all payload builder functions for easy importing.
 */

// Re-export from main payload-builders file (backward compatibility)
export {
  // Sanitizers
  sanitizeChromArray,
  sanitizeBridgeprsConfig,
  sanitizePrsiceConfig,
  sanitizePrscsxConfig,
  sanitizeSdprxConfig,
  sanitizeXpassConfig,

  // Payload builders
  buildPrscsxProcessingPayload,
  buildSdprxProcessingPayload,
  buildBridgeprsProcessingPayload,
  buildPrsiceProcessingPayload,
  buildXpassProcessingPayload,
  buildXpassPlusProcessingPayload,

  // Convenience function
  buildProcessingForTool,
} from "../payload-builders"

// Per-tool builders (modular imports)
export { buildPrscsxProcessingPayload as buildPrscsxPayload } from "./prscsx-builder"
export { buildBridgeprsProcessingPayload as buildBridgeprsPayload } from "./bridgeprs-builder"
export { buildSdprxProcessingPayload as buildSdprxPayload } from "./sdprx-builder"
export { buildPrsiceProcessingPayload as buildPrsicePayload } from "./prsice-builder"
export {
  buildXpassProcessingPayload as buildXpassPayload,
  buildXpassPlusProcessingPayload as buildXpassPlusPayload,
} from "./xpass-builder"

// Shared sanitizers (modular)
export {
  sanitizeChromArray as sanitizeChrom,
  normalizeEvaluationType,
  sanitizePath,
  sanitizeFilePatterns,
  filterTraitsByEvaluationType,
} from "./sanitizers"
