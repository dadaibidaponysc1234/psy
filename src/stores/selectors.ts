import { useBenchmarkingStore } from "@/stores/benchmarking-store"

export { useJobId } from "@/stores/benchmarking-store"

export const useJobMapping = () =>
  useBenchmarkingStore((state) =>
    state.jobId ? state.mappingState[state.jobId] : undefined
  )

export const usePrscsxConfig = () =>
  useBenchmarkingStore((state) => {
    if (!state.jobId) {
      return undefined
    }
    const jobMapping = state.mappingState[state.jobId]
    return jobMapping?.toolConfigs?.prscsx?.prscsx
  })

export const useMappingActions = () => {
  const setMappingActiveTool = useBenchmarkingStore(
    (state) => state.setMappingActiveTool
  )
  const setToolPopulation = useBenchmarkingStore(
    (state) => state.setToolPopulation
  )
  const setToolMappings = useBenchmarkingStore(
    (state) => state.setToolMappings
  )
  const setToolFieldValue = useBenchmarkingStore(
    (state) => state.setToolFieldValue
  )
  const ensureToolFields = useBenchmarkingStore(
    (state) => state.ensureToolFields
  )
  const setPrscsxTargetPopulation = useBenchmarkingStore(
    (state) => state.setPrscsxTargetPopulation
  )
  const addPrscsxBasePopulation = useBenchmarkingStore(
    (state) => state.addPrscsxBasePopulation
  )
  const updatePrscsxBasePopulation = useBenchmarkingStore(
    (state) => state.updatePrscsxBasePopulation
  )
  const removePrscsxBasePopulation = useBenchmarkingStore(
    (state) => state.removePrscsxBasePopulation
  )

  return {
    setMappingActiveTool,
    setToolPopulation,
    setToolMappings,
    setToolFieldValue,
    ensureToolFields,
    setPrscsxTargetPopulation,
    addPrscsxBasePopulation,
    updatePrscsxBasePopulation,
    removePrscsxBasePopulation,
  }
}
