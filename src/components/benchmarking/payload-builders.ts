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

// Re-export types that may be used by consumers
// Note: These types might need to be verified if they exist in legacy,
// if not they should be imported from types.ts
// Checking legacy file, it seems it does NOT export these types.
// We should import them from tool-configuration/types if needed,
// but for now let's skip re-exporting types that caused errors before.

// =========================================================================
// UTILITY FUNCTIONS
// =========================================================================

import type { EvaluationType } from "./tool-configuration/types"
import type {
  PrscsxProcessingPayload,
  BridgeprsProcessingPayload,
  SdprxProcessingPayload,
  PrsiceProcessingPayload,
  XpassProcessingPayload,
  PrscsxPreProcessingConfig,
  BridgeprsPreProcessingConfig,
  SdprxPreProcessingConfig,
  PrsicePreProcessingConfig,
  XpassPreProcessingConfig,
  PrscsxProcessingState,
  BridgeprsProcessingState,
  SdprxProcessingState,
} from "./tool-configuration/types"

import { buildPrscsxProcessingPayload } from "./payload-builders/prscsx-builder"
import { buildBridgeprsProcessingPayload } from "./payload-builders/bridgeprs-builder"
import { buildSdprxProcessingPayload } from "./payload-builders/sdprx-builder"
import { buildPrsiceProcessingPayload } from "./payload-builders/prsice-builder"
import {
  buildXpassProcessingPayload,
  buildXpassPlusProcessingPayload,
} from "./payload-builders/xpass-builder"

type ToolPreProcessingConfig =
  | PrscsxPreProcessingConfig
  | BridgeprsPreProcessingConfig
  | SdprxPreProcessingConfig
  | PrsicePreProcessingConfig
  | XpassPreProcessingConfig

/**
 * Build processing payload for a given tool
 *
 * This is a convenience function that dispatches to the appropriate builder
 * based on the tool ID.
 */
export function buildProcessingForTool(
  toolId: string,
  sanitizedConfig: ToolPreProcessingConfig | undefined,
  processingState: unknown,
  evaluationType: EvaluationType
):
  | PrscsxProcessingPayload
  | BridgeprsProcessingPayload
  | SdprxProcessingPayload
  | PrsiceProcessingPayload
  | XpassProcessingPayload
  | undefined {
  if (!sanitizedConfig) return undefined

  switch (toolId) {
    case "prscsx":
      return buildPrscsxProcessingPayload(
        sanitizedConfig as PrscsxPreProcessingConfig,
        processingState as PrscsxProcessingState,
        evaluationType
      )

    case "bridgeprs":
      return buildBridgeprsProcessingPayload(
        sanitizedConfig as BridgeprsPreProcessingConfig,
        processingState as BridgeprsProcessingState,
        evaluationType
      )

    case "sdprx":
      return buildSdprxProcessingPayload(
        sanitizedConfig as SdprxPreProcessingConfig,
        processingState as SdprxProcessingState,
        evaluationType
      )

    case "prsice":
      return buildPrsiceProcessingPayload(
        sanitizedConfig as PrsicePreProcessingConfig,
        evaluationType
      )

    case "xpass":
      return buildXpassProcessingPayload(
        sanitizedConfig as XpassPreProcessingConfig,
        undefined,
        evaluationType
      )

    case "xpass+":
      return buildXpassPlusProcessingPayload(
        sanitizedConfig as XpassPreProcessingConfig,
        undefined,
        evaluationType
      )

    default:
      return undefined
  }
}
