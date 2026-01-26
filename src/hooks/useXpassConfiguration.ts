/**
 * useXpassConfiguration
 *
 * Hook for managing XPASS and XPASS+ specific configuration state.
 * Handles three-population setup (target, auxiliary, validation).
 * Can be used for both XPASS and XPASS+ since they share configuration structure.
 */

import { useState, useCallback, useMemo } from "react"
import type {
  XpassPreProcessingConfig,
  XpassPopulationEntry,
} from "@/components/benchmarking/tool-configuration/types"

export interface UseXpassConfigurationOptions {
  /** Initial configuration */
  initialConfig?: Partial<XpassPreProcessingConfig>
  /** Whether this is XPASS+ (affects defaults) */
  isXpassPlus?: boolean
  /** Callback when config changes */
  onChange?: (config: XpassPreProcessingConfig) => void
}

export interface UseXpassConfigurationReturn {
  /** Current configuration */
  config: Partial<XpassPreProcessingConfig>
  /** All populations */
  populations: XpassPopulationEntry[]
  /** Target population */
  targetPopulation: XpassPopulationEntry | null
  /** Auxiliary population */
  auxiliaryPopulation: XpassPopulationEntry | null
  /** Validation population */
  validationPopulation: XpassPopulationEntry | null
  /** Update a population by type */
  updatePopulation: (
    type: "target" | "auxiliary" | "validation",
    updates: Partial<XpassPopulationEntry>
  ) => void
  /** Update output directory */
  setOutputDir: (dir: string) => void
  /** Update sumstats file type */
  setSumstatsFileType: (type: "merged" | "multi_chromosome") => void
  /** Check if configuration is valid */
  isValid: () => boolean
}

const createDefaultPop = (
  type: "target" | "auxiliary" | "validation"
): XpassPopulationEntry => ({
  name: "",
  type,
  sumstats_path: "",
  genotype_path: "",
})

/**
 * Hook for managing XPASS/XPASS+ configuration
 *
 * @example
 * const {
 *   config,
 *   targetPopulation,
 *   updatePopulation,
 *   isValid,
 * } = useXpassConfiguration({ isXpassPlus: true })
 */
export function useXpassConfiguration({
  initialConfig,
  isXpassPlus = false,
  onChange,
}: UseXpassConfigurationOptions = {}): UseXpassConfigurationReturn {
  const defaultOutputDir = isXpassPlus
    ? "results/preprocessed_data/preprocessed_xpassplus_output"
    : "results/preprocessed_data/preprocessed_xpass_output"

  const [populations, setPopulations] = useState<XpassPopulationEntry[]>(
    initialConfig?.populations || [
      createDefaultPop("target"),
      createDefaultPop("auxiliary"),
      createDefaultPop("validation"),
    ]
  )
  const [outputDir, setOutputDir] = useState(
    initialConfig?.output_dir || defaultOutputDir
  )
  const [sumstatsFileType, setSumstatsFileType] = useState<
    "merged" | "multi_chromosome"
  >(initialConfig?.sumstats_file_type || "merged")

  const targetPopulation = useMemo(
    () => populations.find((p) => p.type === "target") || null,
    [populations]
  )

  const auxiliaryPopulation = useMemo(
    () => populations.find((p) => p.type === "auxiliary") || null,
    [populations]
  )

  const validationPopulation = useMemo(
    () => populations.find((p) => p.type === "validation") || null,
    [populations]
  )

  const updatePopulation = useCallback(
    (
      type: "target" | "auxiliary" | "validation",
      updates: Partial<XpassPopulationEntry>
    ) => {
      setPopulations((prev) =>
        prev.map((p) => (p.type === type ? { ...p, ...updates } : p))
      )
    },
    []
  )

  const isValid = useCallback((): boolean => {
    const target = populations.find((p) => p.type === "target")
    const auxiliary = populations.find((p) => p.type === "auxiliary")
    if (!target?.name || !auxiliary?.name) return false
    return true
  }, [populations])

  const config = useMemo(
    (): Partial<XpassPreProcessingConfig> => ({
      populations,
      output_dir: outputDir,
      sumstats_file_type: sumstatsFileType,
    }),
    [populations, outputDir, sumstatsFileType]
  )

  return {
    config,
    populations,
    targetPopulation,
    auxiliaryPopulation,
    validationPopulation,
    updatePopulation,
    setOutputDir,
    setSumstatsFileType,
    isValid,
  }
}

export default useXpassConfiguration
