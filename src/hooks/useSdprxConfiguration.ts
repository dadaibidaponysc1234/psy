/**
 * useSdprxConfiguration
 *
 * Hook for managing SDPRX-specific configuration state.
 * Handles two-population setup (Pop1 target, Pop2 base).
 */

import { useState, useCallback, useMemo } from "react"
import type {
  SdprxPreProcessingConfig,
  SdprxPopulationConfig,
} from "@/components/benchmarking/tool-configuration/types"

export interface UseSdprxConfigurationOptions {
  /** Initial configuration */
  initialConfig?: Partial<SdprxPreProcessingConfig>
  /** Callback when config changes */
  onChange?: (config: SdprxPreProcessingConfig) => void
}

export interface UseSdprxConfigurationReturn {
  /** Current configuration */
  config: Partial<SdprxPreProcessingConfig>
  /** Pop1 (target) configuration */
  pop1: SdprxPopulationConfig | null
  /** Pop2 (base) configuration */
  pop2: SdprxPopulationConfig | null
  /** Update Pop1 */
  updatePop1: (updates: Partial<SdprxPopulationConfig>) => void
  /** Update Pop2 */
  updatePop2: (updates: Partial<SdprxPopulationConfig>) => void
  /** Update output directory */
  setOutputDir: (dir: string) => void
  /** Update sumstats file type */
  setSumstatsFileType: (type: "merged" | "multi_chromosome") => void
  /** Check if configuration is valid */
  isValid: () => boolean
}

const DEFAULT_POP: SdprxPopulationConfig = {
  name: "",
  sumstats_path: "",
  genotype_path: "",
  phenotype_path: "",
}

/**
 * Hook for managing SDPRX configuration
 */
export function useSdprxConfiguration({
  initialConfig,
  onChange,
}: UseSdprxConfigurationOptions = {}): UseSdprxConfigurationReturn {
  const [pop1, setPop1] = useState<SdprxPopulationConfig>(
    initialConfig?.pop1 || { ...DEFAULT_POP }
  )
  const [pop2, setPop2] = useState<SdprxPopulationConfig>(
    initialConfig?.pop2 || { ...DEFAULT_POP }
  )
  const [outputDir, setOutputDir] = useState(
    initialConfig?.output_dir ||
      "results/preprocessed_data/preprocessed_sdprx_output"
  )
  const [sumstatsFileType, setSumstatsFileType] = useState<
    "merged" | "multi_chromosome"
  >(initialConfig?.sumstats_file_type || "merged")

  const updatePop1 = useCallback((updates: Partial<SdprxPopulationConfig>) => {
    setPop1((prev) => ({ ...prev, ...updates }))
  }, [])

  const updatePop2 = useCallback((updates: Partial<SdprxPopulationConfig>) => {
    setPop2((prev) => ({ ...prev, ...updates }))
  }, [])

  const isValid = useCallback((): boolean => {
    if (!pop1.name || !pop2.name) return false
    return true
  }, [pop1.name, pop2.name])

  const config = useMemo(
    (): Partial<SdprxPreProcessingConfig> => ({
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

export default useSdprxConfiguration
