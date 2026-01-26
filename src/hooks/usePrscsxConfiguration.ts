/**
 * usePrscsxConfiguration
 *
 * Hook for managing PRScsx-specific configuration state.
 * Handles populations, column mappings, and processing options.
 */

import { useState, useCallback, useMemo } from "react"
import type {
  PrscsxPreProcessingConfig,
  PrscsxPopulationConfig,
  PrscsxColumnKey,
} from "@/components/benchmarking/tool-configuration/types"

const DEFAULT_COLUMN_MAPPING: Record<PrscsxColumnKey, string> = {
  SNP: "",
  A1: "",
  A2: "",
  BETA: "",
  P: "",
}

export interface UsePrscsxConfigurationOptions {
  /** Initial configuration */
  initialConfig?: Partial<PrscsxPreProcessingConfig>
  /** Callback when config changes */
  onChange?: (config: PrscsxPreProcessingConfig) => void
}

export interface UsePrscsxConfigurationReturn {
  /** Current configuration */
  config: Partial<PrscsxPreProcessingConfig>
  /** Target population */
  targetPopulation: PrscsxPopulationConfig | null
  /** All populations */
  populations: PrscsxPopulationConfig[]
  /** Add a population */
  addPopulation: (population: PrscsxPopulationConfig) => void
  /** Remove a population */
  removePopulation: (name: string) => void
  /** Update a population */
  updatePopulation: (
    name: string,
    updates: Partial<PrscsxPopulationConfig>
  ) => void
  /** Set target population name */
  setTargetPopulation: (name: string) => void
  /** Update column mapping for a population */
  updateColumnMapping: (
    populationName: string,
    column: PrscsxColumnKey,
    value: string
  ) => void
  /** Get column mapping for a population */
  getColumnMapping: (populationName: string) => Record<PrscsxColumnKey, string>
  /** Update output directory */
  setOutputDir: (dir: string) => void
  /** Update sumstats file type */
  setSumstatsFileType: (type: "merged" | "multi_chromosome") => void
  /** Check if configuration is valid */
  isValid: () => boolean
}

/**
 * Hook for managing PRScsx configuration
 *
 * @example
 * const {
 *   config,
 *   populations,
 *   addPopulation,
 *   updateColumnMapping,
 *   isValid,
 * } = usePrscsxConfiguration({
 *   onChange: (c) => console.log('Config changed:', c),
 * })
 */
export function usePrscsxConfiguration({
  initialConfig,
  onChange,
}: UsePrscsxConfigurationOptions = {}): UsePrscsxConfigurationReturn {
  const [populations, setPopulations] = useState<PrscsxPopulationConfig[]>(
    initialConfig?.populations || []
  )
  // Find the target population from the populations array
  const initialTarget = initialConfig?.populations?.find(
    (p) => p.type === "target"
  )
  const [targetPopulationName, setTargetPopulationName] = useState<string>(
    initialTarget?.name || ""
  )
  const [columnMappings, setColumnMappings] = useState<
    Record<string, Record<PrscsxColumnKey, string>>
  >({})
  const [outputDir, setOutputDir] = useState(
    initialConfig?.output_dir ||
      "results/preprocessed_data/preprocessed_prscsx_output"
  )
  const [sumstatsFileType, setSumstatsFileType] = useState<
    "merged" | "multi_chromosome"
  >(initialConfig?.sumstats_file_type || "merged")

  const targetPopulation = useMemo(
    () => populations.find((p) => p.name === targetPopulationName) || null,
    [populations, targetPopulationName]
  )

  const addPopulation = useCallback((population: PrscsxPopulationConfig) => {
    setPopulations((prev) => [...prev, population])
    setColumnMappings((prev) => ({
      ...prev,
      [population.name]: { ...DEFAULT_COLUMN_MAPPING },
    }))
  }, [])

  const removePopulation = useCallback(
    (name: string) => {
      setPopulations((prev) => prev.filter((p) => p.name !== name))
      setColumnMappings((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
      if (targetPopulationName === name) {
        setTargetPopulationName("")
      }
    },
    [targetPopulationName]
  )

  const updatePopulation = useCallback(
    (name: string, updates: Partial<PrscsxPopulationConfig>) => {
      setPopulations((prev) =>
        prev.map((p) => (p.name === name ? { ...p, ...updates } : p))
      )
    },
    []
  )

  const updateColumnMapping = useCallback(
    (populationName: string, column: PrscsxColumnKey, value: string) => {
      setColumnMappings((prev) => ({
        ...prev,
        [populationName]: {
          ...(prev[populationName] || DEFAULT_COLUMN_MAPPING),
          [column]: value,
        },
      }))
    },
    []
  )

  const getColumnMapping = useCallback(
    (populationName: string): Record<PrscsxColumnKey, string> => {
      return columnMappings[populationName] || { ...DEFAULT_COLUMN_MAPPING }
    },
    [columnMappings]
  )

  const isValid = useCallback((): boolean => {
    if (populations.length === 0) return false
    if (!targetPopulationName) return false
    // Check that target exists in populations
    if (!populations.some((p) => p.name === targetPopulationName)) return false
    return true
  }, [populations, targetPopulationName])

  // Build config matching PrscsxPreProcessingConfig type
  const config = useMemo(
    (): Partial<PrscsxPreProcessingConfig> => ({
      populations,
      output_dir: outputDir,
      sumstats_file_type: sumstatsFileType,
      column_mappings: { by_population: columnMappings },
    }),
    [populations, outputDir, sumstatsFileType, columnMappings]
  )

  return {
    config,
    targetPopulation,
    populations,
    addPopulation,
    removePopulation,
    updatePopulation,
    setTargetPopulation: setTargetPopulationName,
    updateColumnMapping,
    getColumnMapping,
    setOutputDir,
    setSumstatsFileType,
    isValid,
  }
}

export default usePrscsxConfiguration
