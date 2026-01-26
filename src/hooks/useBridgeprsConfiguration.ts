/**
 * useBridgeprsConfiguration
 *
 * Hook for managing BridgePRS-specific configuration state.
 * Handles two-population setup (Pop1 target, Pop2 base).
 */

import { useState, useCallback, useMemo } from "react"
import type {
  BridgeprsPreProcessingConfig,
  BridgeprsPopulationConfig,
} from "@/components/benchmarking/tool-configuration/types"

export interface UseBridgeprsConfigurationOptions {
  /** Initial configuration */
  initialConfig?: Partial<BridgeprsPreProcessingConfig>
  /** Callback when config changes */
  onChange?: (config: BridgeprsPreProcessingConfig) => void
}

export interface UseBridgeprsConfigurationReturn {
  /** Current configuration */
  config: Partial<BridgeprsPreProcessingConfig>
  /** Pop1 (target) configuration */
  pop1: BridgeprsPopulationConfig | null
  /** Pop2 (base) configuration */
  pop2: BridgeprsPopulationConfig | null
  /** Update Pop1 */
  updatePop1: (updates: Partial<BridgeprsPopulationConfig>) => void
  /** Update Pop2 */
  updatePop2: (updates: Partial<BridgeprsPopulationConfig>) => void
  /** Update output directory */
  setOutputDir: (dir: string) => void
  /** Update sumstats file type */
  setSumstatsFileType: (type: "merged" | "multi_chromosome") => void
  /** Check if configuration is valid */
  isValid: () => boolean
}

const DEFAULT_POP: BridgeprsPopulationConfig = {
  name: "",
  sumstats_path: "",
  genotype_path: "",
  phenotype_path: "",
}

/**
 * Hook for managing BridgePRS configuration
 */
export function useBridgeprsConfiguration({
  initialConfig,
  onChange,
}: UseBridgeprsConfigurationOptions = {}): UseBridgeprsConfigurationReturn {
  const [pop1, setPop1] = useState<BridgeprsPopulationConfig>(
    initialConfig?.pop1 || { ...DEFAULT_POP }
  )
  const [pop2, setPop2] = useState<BridgeprsPopulationConfig>(
    initialConfig?.pop2 || { ...DEFAULT_POP }
  )
  const [outputDir, setOutputDir] = useState(
    initialConfig?.output_dir ||
      "results/preprocessed_data/preprocessed_bridgeprs_output"
  )
  const [sumstatsFileType, setSumstatsFileType] = useState<
    "merged" | "multi_chromosome"
  >(initialConfig?.sumstats_file_type || "merged")

  const updatePop1 = useCallback(
    (updates: Partial<BridgeprsPopulationConfig>) => {
      setPop1((prev) => ({ ...prev, ...updates }))
    },
    []
  )

  const updatePop2 = useCallback(
    (updates: Partial<BridgeprsPopulationConfig>) => {
      setPop2((prev) => ({ ...prev, ...updates }))
    },
    []
  )

  const isValid = useCallback((): boolean => {
    if (!pop1.name || !pop2.name) return false
    return true
  }, [pop1.name, pop2.name])

  const config = useMemo(
    (): Partial<BridgeprsPreProcessingConfig> => ({
      pop1,
      pop2,
      output_dir: outputDir,
      sumstats_file_type: sumstatsFileType,
    }),
    [pop1, pop2, outputDir, sumstatsFileType]
  )

  return {
    config,
    pop1,
    pop2,
    updatePop1,
    updatePop2,
    setOutputDir,
    setSumstatsFileType,
    isValid,
  }
}

export default useBridgeprsConfiguration
