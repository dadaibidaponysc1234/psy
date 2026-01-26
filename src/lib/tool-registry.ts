/**
 * Tool Registry
 *
 * Central registry for all PRS benchmarking tools. This is the single source of truth
 * for tool metadata, making it easy to add, remove, or modify tools.
 *
 * To add a new tool, see: docs/adding-new-tools.md
 */

import type { ComponentType } from "react"
import type {
  EvaluationType,
  ToolPreProcessingConfig,
  PrscsxPreProcessingConfig,
  PrscsxProcessingState,
  PrscsxProcessingPayload,
  BridgeprsPreProcessingConfig,
  BridgeprsProcessingState,
  BridgeprsProcessingPayload,
  SdprxPreProcessingConfig,
  SdprxProcessingState,
  SdprxProcessingPayload,
  PrsicePreProcessingConfig,
  PrsiceProcessingPayload,
  XpassPreProcessingConfig,
  XpassProcessingState,
  XpassProcessingPayload,
} from "@/components/benchmarking/tool-configuration/types"

// ============================================================================
// TOOL DEFINITION TYPES
// ============================================================================

/**
 * Base props that all tool configuration components receive
 */
export interface ToolConfigurationComponentProps<
  TConfig extends ToolPreProcessingConfig = ToolPreProcessingConfig,
  TProcessingState = unknown,
> {
  toolId: string
  config: TConfig
  jobId: string | null
  onConfigChange: (nextConfig: TConfig) => void
  stepBadge?: React.ReactNode
  evaluationType: EvaluationType
  processingConfig?: TProcessingState
  onProcessingChange?: (
    updater: (state: TProcessingState) => TProcessingState
  ) => void
}

/**
 * Base props for population configuration components in the mapping step
 */
export interface PopulationConfigurationComponentProps {
  toolId: string
  jobId: string | null
  onUpdatePopulation: (field: string, value: string) => void
  onUpdateMapping: (fieldId: string, value: any) => void
  mappings: Record<string, any>
  population: any
  datasetStructure: any
}

/**
 * Definition for a single tool in the registry
 */
export interface ToolDefinition<
  TConfig extends ToolPreProcessingConfig = ToolPreProcessingConfig,
  TProcessingState = unknown,
  TProcessingPayload = unknown,
> {
  /** Unique tool identifier (lowercase, e.g., 'prscsx', 'bridgeprs') */
  id: string

  /** Display label for UI (e.g., 'PRScsx', 'BridgePRS') */
  label: string

  /** Short description of the tool */
  description: string

  /** Required column mappings for this tool */
  requiredColumns: string[]

  /** Optional column mappings */
  optionalColumns?: string[]

  /** Whether this tool supports binary phenotypes */
  supportsBinaryPhenotypes: boolean

  /** Whether this tool supports quantitative phenotypes */
  supportsQuantitativePhenotypes: boolean

  /** Number of populations this tool requires */
  populationCount: number

  /** Population labels (e.g., ['Target', 'Source'] or ['Pop1', 'Pop2', 'Pop3']) */
  populationLabels: string[]

  /**
   * Lazy-loaded configuration component
   * Use React.lazy() for code splitting
   */
  ConfigurationComponent: ComponentType<
    ToolConfigurationComponentProps<TConfig, TProcessingState>
  >

  /**
   * Lazy-loaded population configuration component for the mapping step
   */
  PopulationConfigurationComponent: ComponentType<PopulationConfigurationComponentProps>

  /**
   * Sanitize the tool's preprocessing config before submission
   */
  sanitizeConfig: (config: TConfig) => TConfig

  /**
   * Build the processing payload for API submission
   */
  buildProcessingPayload: (
    config: TConfig,
    processingState: TProcessingState,
    mode: EvaluationType
  ) => TProcessingPayload

  /**
   * Get default preprocessing configuration
   */
  getDefaultConfig: () => TConfig

  /**
   * Get default processing state
   */
  getDefaultProcessingState?: () => TProcessingState
}

// ============================================================================
// TOOL REGISTRY
// ============================================================================

/**
 * Registry of all available PRS tools.
 *
 * To add a new tool:
 * 1. Create the tool's configuration component
 * 2. Create the tool's population configuration component
 * 3. Create or update the payload builder
 * 4. Add an entry to this registry
 *
 * See docs/adding-new-tools.md for detailed instructions.
 */
export const TOOL_REGISTRY: Record<string, ToolDefinition<any, any, any>> = {}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all registered tool IDs
 */
export function getToolIds(): string[] {
  return Object.keys(TOOL_REGISTRY)
}

/**
 * Get a tool definition by ID
 */
export function getToolDefinition(toolId: string): ToolDefinition | undefined {
  return TOOL_REGISTRY[toolId.toLowerCase()]
}

/**
 * Get display label for a tool
 */
export function getToolLabel(toolId: string): string {
  return TOOL_REGISTRY[toolId.toLowerCase()]?.label || toolId
}

/**
 * Check if a tool is registered
 */
export function isToolRegistered(toolId: string): boolean {
  return toolId.toLowerCase() in TOOL_REGISTRY
}

/**
 * Get all tools as an array
 */
export function getToolsArray(): ToolDefinition[] {
  return Object.values(TOOL_REGISTRY)
}

/**
 * Filter tools by a predicate
 */
export function filterTools(
  predicate: (tool: ToolDefinition) => boolean
): ToolDefinition[] {
  return getToolsArray().filter(predicate)
}

/**
 * Get tools that support a specific evaluation type
 */
export function getToolsForEvaluationType(
  evaluationType: EvaluationType
): ToolDefinition[] {
  return filterTools((tool) => {
    if (evaluationType === "binary") return tool.supportsBinaryPhenotypes
    if (evaluationType === "quantitative")
      return tool.supportsQuantitativePhenotypes
    return tool.supportsBinaryPhenotypes || tool.supportsQuantitativePhenotypes
  })
}

// ============================================================================
// TOOL LABELS MAP (for backward compatibility)
// ============================================================================

/**
 * Static map of tool labels for backward compatibility
 * Prefer using getToolLabel() for new code
 */
export const TOOL_LABELS: Record<string, string> = {
  prsice: "PRSice",
  prscsx: "PRScsx",
  bridgeprs: "BridgePRS",
  sdprx: "SDPRX",
  xpass: "XPASS",
  "xpass+": "XPASS+",
}
