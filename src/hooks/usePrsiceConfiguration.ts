/**
 * usePrsiceConfiguration
 *
 * Hook for managing PRSice-specific configuration state.
 * Handles target and source population setup.
 */

import { useState, useCallback, useMemo } from "react"
import type {
  PrsicePreProcessingConfig,
  PrsicePopulationConfig,
} from "@/components/benchmarking/tool-configuration/types"

export interface UsePrsiceConfigurationOptions {
  /** Initial configuration */
  initialConfig?: Partial<PrsicePreProcessingConfig>
  /** Callback when config changes */
  onChange?: (config: PrsicePreProcessingConfig) => void
}

export interface UsePrsiceConfigurationReturn {
  /** Current configuration */
  config: Partial<PrsicePreProcessingConfig>
  /** Target population configuration */
  targetPopulation: PrsicePopulationConfig | null
  /** Source population configuration */
  sourcePopulation: PrsicePopulationConfig | null
  /** Update target population */
  updateTargetPopulation: (updates: Partial<PrsicePopulationConfig>) => void
  /** Update source population */
  updateSourcePopulation: (updates: Partial<PrsicePopulationConfig>) => void
  /** Update output directory */
  setOutputDir: (dir: string) => void
  /** Update sumstats file type */
  setSumstatsFileType: (type: "merged" | "multi_chromosome") => void
  /** Check if configuration is valid */
  isValid: () => boolean
}

const DEFAULT_POP: PrsicePopulationConfig = {
  name: "",
  sumstats_path: "",
  genotype_path: "",
  phenotype_path: "",
}

/**
 * Hook for managing PRSice configuration
 */
export function usePrsiceConfiguration({
  initialConfig,
  onChange,
}: UsePrsiceConfigurationOptions = {}): UsePrsiceConfigurationReturn {
  const [targetPopulation, setTargetPopulation] =
    useState<PrsicePopulationConfig>(
      initialConfig?.target_population || { ...DEFAULT_POP }
    )
  const [sourcePopulation, setSourcePopulation] =
    useState<PrsicePopulationConfig>(
      initialConfig?.source_population || { ...DEFAULT_POP }
    )
  const [outputDir, setOutputDir] = useState(
    initialConfig?.output_dir ||
      "results/preprocessed_data/preprocessed_prsice_output"
  )
  const [sumstatsFileType, setSumstatsFileType] = useState<
    "merged" | "multi_chromosome"
  >(initialConfig?.sumstats_file_type || "merged")

  const updateTargetPopulation = useCallback(
    (updates: Partial<PrsicePopulationConfig>) => {
      setTargetPopulation((prev) => ({ ...prev, ...updates }))
    },
    []
  )

  const updateSourcePopulation = useCallback(
    (updates: Partial<PrsicePopulationConfig>) => {
      setSourcePopulation((prev) => ({ ...prev, ...updates }))
    },
    []
  )

  const isValid = useCallback((): boolean => {
    if (!targetPopulation.name) return false
    return true
  }, [targetPopulation.name])

  const config = useMemo(
    (): Partial<PrsicePreProcessingConfig> => ({
      target_population: targetPopulation,
      source_population: sourcePopulation,
      output_dir: outputDir,
      sumstats_file_type: sumstatsFileType,
    }),
    [targetPopulation, sourcePopulation, outputDir, sumstatsFileType]
  )

  return {
    config,
    targetPopulation,
    sourcePopulation,
    updateTargetPopulation,
    updateSourcePopulation,
    setOutputDir,
    setSumstatsFileType,
    isValid,
  }
}

export default usePrsiceConfiguration
