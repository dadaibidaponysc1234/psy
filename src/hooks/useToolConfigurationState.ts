/**
 * useToolConfigurationState
 *
 * Shared hook for managing tool configuration state.
 * Handles active tool, evaluation type, and config updates.
 */

import { useState, useCallback, useMemo } from "react"
import type {
  EvaluationType,
  ToolPreProcessingConfig,
} from "@/components/benchmarking/tool-configuration/types"

export interface UseToolConfigurationStateOptions {
  /** Initial selected tools */
  initialTools?: string[]
  /** Initial active tool */
  initialActiveTool?: string
  /** Initial evaluation type */
  initialEvaluationType?: EvaluationType
  /** Callback when active tool changes */
  onActiveToolChange?: (toolId: string) => void
}

export interface UseToolConfigurationStateReturn {
  /** Currently selected tools */
  selectedTools: string[]
  /** Currently active tool */
  activeTool: string | null
  /** Current evaluation type */
  evaluationType: EvaluationType
  /** Tool configurations */
  configs: Record<string, ToolPreProcessingConfig>
  /** Set the active tool */
  setActiveTool: (toolId: string) => void
  /** Set evaluation type */
  setEvaluationType: (type: EvaluationType) => void
  /** Update a tool's config */
  updateToolConfig: (
    toolId: string,
    updater: (config: ToolPreProcessingConfig) => ToolPreProcessingConfig
  ) => void
  /** Get config for a tool */
  getToolConfig: (toolId: string) => ToolPreProcessingConfig | undefined
  /** Check if a tool is selected */
  isToolSelected: (toolId: string) => boolean
  /** Check if current tool has valid config */
  isCurrentToolValid: () => boolean
}

/**
 * Hook for managing shared tool configuration state
 *
 * @example
 * const {
 *   activeTool,
 *   evaluationType,
 *   configs,
 *   setActiveTool,
 *   updateToolConfig,
 * } = useToolConfigurationState({
 *   initialTools: ['prscsx', 'bridgeprs'],
 *   initialActiveTool: 'prscsx',
 * })
 */
export function useToolConfigurationState({
  initialTools = [],
  initialActiveTool,
  initialEvaluationType = "both",
  onActiveToolChange,
}: UseToolConfigurationStateOptions = {}): UseToolConfigurationStateReturn {
  const [selectedTools] = useState<string[]>(initialTools)
  const [activeTool, setActiveToolState] = useState<string | null>(
    initialActiveTool || initialTools[0] || null
  )
  const [evaluationType, setEvaluationType] = useState<EvaluationType>(
    initialEvaluationType
  )
  const [configs, setConfigs] = useState<
    Record<string, ToolPreProcessingConfig>
  >({})

  const setActiveTool = useCallback(
    (toolId: string) => {
      setActiveToolState(toolId)
      onActiveToolChange?.(toolId)
    },
    [onActiveToolChange]
  )

  const updateToolConfig = useCallback(
    (
      toolId: string,
      updater: (config: ToolPreProcessingConfig) => ToolPreProcessingConfig
    ) => {
      setConfigs((prev) => {
        const currentConfig = prev[toolId]
        if (!currentConfig) return prev
        return {
          ...prev,
          [toolId]: updater(currentConfig),
        }
      })
    },
    []
  )

  const getToolConfig = useCallback(
    (toolId: string): ToolPreProcessingConfig | undefined => {
      return configs[toolId]
    },
    [configs]
  )

  const isToolSelected = useCallback(
    (toolId: string): boolean => {
      return selectedTools.includes(toolId)
    },
    [selectedTools]
  )

  const isCurrentToolValid = useCallback((): boolean => {
    if (!activeTool) return false
    const config = configs[activeTool]
    if (!config) return false
    // Basic validation - can be extended
    return true
  }, [activeTool, configs])

  return {
    selectedTools,
    activeTool,
    evaluationType,
    configs,
    setActiveTool,
    setEvaluationType,
    updateToolConfig,
    getToolConfig,
    isToolSelected,
    isCurrentToolValid,
  }
}

export default useToolConfigurationState
