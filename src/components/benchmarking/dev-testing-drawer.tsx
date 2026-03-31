"use client"

import React, { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Wrench,
  ChevronUp,
  ChevronDown,
  Zap,
  FileInput,
  FileStack,
  ListChecks,
  Loader2,
} from "lucide-react"
import { toast } from "react-hot-toast"
import benchmarkApi from "@/lib/benchmark-api"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"
import { getBenchmarkConfigUrl } from "@/lib/config"
import testConfig from "../../../reference/test-config.json"

// ─── Helpers ────────────────────────────────────────────────────────────

/** Build a mock DirectoryItem for the zustand store (mapping expects objects with .path) */
const mockDir = (path: string) => ({
  name: path.split("/").pop() || path,
  path,
  file_count: 0,
  total_size: 0,
  total_size_formatted: "0 B",
})

/** Build a mock FileInfo for the zustand store */
const mockFile = (path: string) => ({
  name: path.split("/").pop() || path,
  path,
  size: 0,
  size_formatted: "0 B",
  file_type: "unknown",
  is_previewable: false,
  last_modified: new Date().toISOString(),
})

/** Decide whether a path points to a file (has extension) or directory */
const mockPath = (path: string) => {
  if (!path) return null
  // If it has a common file extension, treat as file
  if (/\.\w{1,6}$/.test(path.split("/").pop() || "")) return mockFile(path)
  return mockDir(path)
}

const isXpassFamily = (id: string) => {
  const k = id.toLowerCase()
  return k === "xpass" || k === "xpass+"
}

type TestToolConfig = {
  pre_processing: Record<string, any>
  processing?: Record<string, any>
}

const getToolConfig = (toolId: string): TestToolConfig | undefined => {
  return (testConfig as Record<string, any>)[toolId.toLowerCase()] as
    | TestToolConfig
    | undefined
}

// ─── Fill Mapping Store ─────────────────────────────────────────────────

function fillMappingForTool(
  toolId: string,
  store: ReturnType<typeof useBenchmarkingStore.getState>
) {
  const toolKey = toolId.toLowerCase()
  const tc = getToolConfig(toolKey)
  if (!tc) {
    toast.error(`No test config for ${toolId}`)
    return
  }

  const pre = tc.pre_processing

  // Set the mapping store's active tool
  store.setMappingActiveTool(toolKey)

  if (toolKey === "prscsx") {
    fillPrscsxMapping(pre, store)
  } else if (isXpassFamily(toolKey)) {
    fillXpassMapping(toolKey, pre, store)
  } else if (toolKey === "bridgeprs" || toolKey === "sdprx") {
    fillPop1Pop2Mapping(toolKey, pre, store)
  } else if (toolKey === "prsice") {
    fillPrsiceMapping(pre, store)
  }

  // Set genotype file type and sumstats file type
  const fileType =
    pre.genotype_config?.file_type || "multi_chromosome"
  const sumstatsType = pre.sumstats_file_type || fileType
  store.setToolFieldValue(toolKey, "genotype_config.file_type", fileType)
  store.setToolFieldValue(
    toolKey,
    "pre_processing.sumstats_file_type",
    sumstatsType
  )
}

function fillPrsiceMapping(
  pre: Record<string, any>,
  store: ReturnType<typeof useBenchmarkingStore.getState>
) {
  const target = pre.target_population || {}
  const source = pre.source_population || {}

  store.setToolPopulation("prsice", {
    targetPopulation: target.name || "AFR",
    sourcePopulation: source.name || "EUR",
  })

  const fields: Record<string, any> = {}
  if (target.sumstats_path)
    fields["target_population.sumstats_path"] = mockPath(target.sumstats_path)
  if (target.genotype_path)
    fields["target_population.genotype_path"] = mockPath(target.genotype_path)
  if (target.phenotype_path)
    fields["target_population.phenotype_path"] = mockPath(target.phenotype_path)
  if (source.sumstats_path)
    fields["source_population.sumstats_path"] = mockPath(source.sumstats_path)
  if (source.genotype_path)
    fields["source_population.genotype_path"] = mockPath(source.genotype_path)
  if (source.phenotype_path)
    fields["source_population.phenotype_path"] = mockPath(source.phenotype_path)

  store.setToolMappings("prsice", fields)
}

function fillPop1Pop2Mapping(
  toolKey: string,
  pre: Record<string, any>,
  store: ReturnType<typeof useBenchmarkingStore.getState>
) {
  const pop1 = pre.pop1 || {}
  const pop2 = pre.pop2 || {}

  store.setToolPopulation(toolKey, {
    targetPopulation: pop1.name || "AFR",
    sourcePopulation: pop2.name || "EUR",
  })

  const fields: Record<string, any> = {}
  if (pop1.sumstats_path)
    fields["pop1.sumstats_path"] = mockPath(pop1.sumstats_path)
  if (pop1.genotype_path)
    fields["pop1.genotype_path"] = mockPath(pop1.genotype_path)
  if (pop1.phenotype_path)
    fields["pop1.phenotype_path"] = mockPath(pop1.phenotype_path)
  if (pop2.sumstats_path)
    fields["pop2.sumstats_path"] = mockPath(pop2.sumstats_path)
  if (pop2.genotype_path)
    fields["pop2.genotype_path"] = mockPath(pop2.genotype_path)
  if (pop2.phenotype_path)
    fields["pop2.phenotype_path"] = mockPath(pop2.phenotype_path)

  store.setToolMappings(toolKey, fields)
}

function fillXpassMapping(
  toolKey: string,
  pre: Record<string, any>,
  store: ReturnType<typeof useBenchmarkingStore.getState>
) {
  const pops: Array<Record<string, string>> = pre.populations || []
  const target = pops.find((p) => p.type === "target")
  const auxiliary = pops.find((p) => p.type === "auxiliary")
  const validation = pops.find((p) => p.type === "validation")

  store.setToolPopulation(toolKey, {
    targetPopulation: target?.name || "AFR",
    sourcePopulation: auxiliary?.name || "EUR",
  })

  const fields: Record<string, any> = {}

  if (target) {
    if (target.sumstats_path)
      fields["pop1.sumstats_path"] = mockPath(target.sumstats_path)
    if (target.genotype_path)
      fields["pop1.genotype_path"] = mockPath(target.genotype_path)
  }
  if (auxiliary) {
    if (auxiliary.sumstats_path)
      fields["pop2.sumstats_path"] = mockPath(auxiliary.sumstats_path)
    if (auxiliary.genotype_path)
      fields["pop2.genotype_path"] = mockPath(auxiliary.genotype_path)
  }
  if (validation) {
    fields["validation_population.name"] = validation.name || ""
    if (validation.sumstats_path)
      fields["pop3.sumstats_path"] = mockPath(validation.sumstats_path)
    if (validation.genotype_path)
      fields["pop3.genotype_path"] = mockPath(validation.genotype_path)
  }

  store.setToolMappings(toolKey, fields)
}

function fillPrscsxMapping(
  pre: Record<string, any>,
  store: ReturnType<typeof useBenchmarkingStore.getState>
) {
  const pops: Array<Record<string, string>> = pre.populations || []
  const targetPop = pops.find((p) => p.type === "target") || pops[0]
  const basePops = pops.filter((p) => p.type !== "target")

  // First, clear existing PRScsx bases by getting current state
  const state = useBenchmarkingStore.getState()
  const jobId = state.jobId
  if (!jobId) return

  const currentPrscsx =
    state.mappingState[jobId]?.toolConfigs?.prscsx?.prscsx
  if (currentPrscsx) {
    // Remove all but the first base (can't remove last one)
    const bases = [...currentPrscsx.bases]
    for (let i = bases.length - 1; i > 0; i--) {
      store.removePrscsxBasePopulation(bases[i].id)
    }
  }

  // Set target population
  store.setPrscsxTargetPopulation({
    name: targetPop?.name || "AFR",
    sumstatsPath: targetPop?.sumstats_path || "",
    genotypePath: targetPop?.genotype_path || "",
    phenotypePath: targetPop?.phenotype_path || "",
    covariatePath: targetPop?.covariate_path || "",
    includeCovariate: !!targetPop?.covariate_path,
  })

  // Set target field values
  const fields: Record<string, any> = {}
  if (targetPop?.sumstats_path)
    fields["prscsx.target.sumstats_path"] = mockPath(targetPop.sumstats_path)
  if (targetPop?.genotype_path)
    fields["prscsx.target.genotype_path"] = mockPath(targetPop.genotype_path)
  if (targetPop?.phenotype_path)
    fields["prscsx.target.phenotype_path"] = mockPath(targetPop.phenotype_path)
  if (targetPop?.covariate_path)
    fields["prscsx.target.covariate_path"] = mockPath(targetPop.covariate_path)

  // Get current prscsx state after target was set — need the first base ID
  const updatedState = useBenchmarkingStore.getState()
  const updatedPrscsx =
    updatedState.mappingState[jobId]?.toolConfigs?.prscsx?.prscsx

  // Update the existing first base
  if (basePops.length > 0 && updatedPrscsx?.bases[0]) {
    const firstBase = updatedPrscsx.bases[0]
    store.updatePrscsxBasePopulation(firstBase.id, {
      name: basePops[0].name || "EUR",
      sumstatsPath: basePops[0].sumstats_path || "",
      genotypePath: basePops[0].genotype_path || "",
      phenotypePath: basePops[0].phenotype_path || "",
      covariatePath: basePops[0].covariate_path || "",
      includeGenotype: !!basePops[0].genotype_path,
      includePhenotype: !!basePops[0].phenotype_path,
      includeCovariate: !!basePops[0].covariate_path,
    })

    if (basePops[0].sumstats_path)
      fields[`prscsx.base.${firstBase.id}.sumstats_path`] = mockPath(
        basePops[0].sumstats_path
      )
    if (basePops[0].genotype_path)
      fields[`prscsx.base.${firstBase.id}.genotype_path`] = mockPath(
        basePops[0].genotype_path
      )
    if (basePops[0].phenotype_path)
      fields[`prscsx.base.${firstBase.id}.phenotype_path`] = mockPath(
        basePops[0].phenotype_path
      )
  }

  // Add additional bases if more than one
  for (let i = 1; i < basePops.length; i++) {
    const bp = basePops[i]
    const newId = store.addPrscsxBasePopulation({
      name: bp.name || "",
      includeGenotype: !!bp.genotype_path,
      includePhenotype: !!bp.phenotype_path,
      includeCovariate: !!bp.covariate_path,
    })

    if (bp.sumstats_path)
      fields[`prscsx.base.${newId}.sumstats_path`] = mockPath(bp.sumstats_path)
    if (bp.genotype_path)
      fields[`prscsx.base.${newId}.genotype_path`] = mockPath(bp.genotype_path)
    if (bp.phenotype_path)
      fields[`prscsx.base.${newId}.phenotype_path`] = mockPath(
        bp.phenotype_path
      )
  }

  store.setToolMappings("prscsx", fields)
}

// ─── Fill Tool Config (via custom events) ───────────────────────────────

/** Event name used to communicate fill requests to ToolConfiguration */
export const DEV_FILL_TOOL_CONFIG_EVENT = "dev-fill-tool-config"

export interface DevFillToolConfigDetail {
  toolIds: string[]
  configs: Record<string, any> // toolId -> full test config entry
}

function dispatchFillToolConfig(toolIds: string[]) {
  const configs: Record<string, any> = {}
  toolIds.forEach((id) => {
    const tc = getToolConfig(id)
    if (tc) configs[id.toLowerCase()] = tc
  })

  const event = new CustomEvent<DevFillToolConfigDetail>(
    DEV_FILL_TOOL_CONFIG_EVENT,
    {
      detail: { toolIds: toolIds.map((id) => id.toLowerCase()), configs },
    }
  )
  window.dispatchEvent(event)
}

// ─── Component ──────────────────────────────────────────────────────────

export function DevTestingDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [customPickOpen, setCustomPickOpen] = useState(false)
  const [customSelection, setCustomSelection] = useState<
    Record<string, boolean>
  >({})
  const [isJumping, setIsJumping] = useState(false)

  const store = useBenchmarkingStore()
  const {
    activeStep,
    jobId,
    stepData,
    setActiveStep,
    addCompletedStep,
    setStepData,
  } = store

  const selectedTools: string[] = useMemo(() => {
    const tools = stepData["tools"]?.selectedTools
    return (tools ?? []) as string[]
  }, [stepData])

  const normalizedTools = useMemo(
    () => selectedTools.map((t) => t.toLowerCase()),
    [selectedTools]
  )

  // Determine current active tool tab
  const getActiveTool = useCallback((): string | null => {
    if (activeStep === "populations") {
      const current = useBenchmarkingStore.getState()
      const jobMapping = current.jobId ? current.mappingState[current.jobId] : undefined
      return jobMapping?.activeTool || normalizedTools[0] || null
    }
    if (activeStep === "configure") {
      const current = useBenchmarkingStore.getState()
      return current.configActiveTab || normalizedTools[0] || null
    }
    return null
  }, [activeStep, normalizedTools])

  // ─── Actions ──────────────────────────────────────────────────────

  const handleFillThisTool = useCallback(() => {
    const activeTool = getActiveTool() || normalizedTools[0]
    if (!activeTool) {
      toast.error("No active tool to fill")
      return
    }

    if (activeStep === "populations") {
      fillMappingForTool(activeTool, useBenchmarkingStore.getState())
      toast.success(`Filled mapping for ${activeTool}`)
    } else if (activeStep === "configure") {
      dispatchFillToolConfig([activeTool])
      toast.success(`Filled config for ${activeTool}`)
    }
  }, [activeStep, normalizedTools])

  const handleFillCustom = useCallback(() => {
    const selected = Object.entries(customSelection)
      .filter(([, v]) => v)
      .map(([k]) => k)

    if (selected.length === 0) {
      toast.error("Select at least one tool to fill")
      return
    }

    if (activeStep === "populations") {
      const currentStore = useBenchmarkingStore.getState()
      selected.forEach((toolId) => fillMappingForTool(toolId, currentStore))
      toast.success(`Filled mapping for ${selected.join(", ")}`)
    } else if (activeStep === "configure") {
      dispatchFillToolConfig(selected)
      toast.success(`Filled config for ${selected.join(", ")}`)
    }

    setCustomPickOpen(false)
  }, [activeStep, customSelection])

  const handleFillAll = useCallback(() => {
    if (activeStep === "populations") {
      const currentStore = useBenchmarkingStore.getState()
      normalizedTools.forEach((toolId) =>
        fillMappingForTool(toolId, currentStore)
      )
      toast.success("Filled mapping for all tools")
    } else if (activeStep === "configure") {
      dispatchFillToolConfig(normalizedTools)
      toast.success("Filled config for all tools")
    }
  }, [activeStep, normalizedTools])

  const handleJump = useCallback(async () => {
    if (!jobId) {
      toast.error("No job ID")
      return
    }

    setIsJumping(true)

    try {
      // 1. Fill all mapping state (so store is consistent)
      const currentStore = useBenchmarkingStore.getState()
      normalizedTools.forEach((toolId) =>
        fillMappingForTool(toolId, currentStore)
      )

      // 2. Build request body directly from test config (it IS a successful submission)
      const requestBody = {
        config: {
          tools_to_run: normalizedTools,
          ...Object.fromEntries(
            normalizedTools
              .map((toolId) => {
                const tc = getToolConfig(toolId)
                if (!tc) return null
                return [toolId, tc]
              })
              .filter(Boolean) as [string, TestToolConfig][]
          ),
        },
      }

      // 3. POST to backend
      await benchmarkApi.post(getBenchmarkConfigUrl(jobId), requestBody, {
        headers: { "Content-Type": "application/json" },
      })

      // 4. Mark steps as completed and set step data
      addCompletedStep("populations")
      addCompletedStep("configure")
      setStepData("configure", {
        configs: {},
        processing: {},
        submitted: true,
        jobId,
        timestamp: new Date().toISOString(),
      })

      // 5. Navigate to results
      setActiveStep("results")

      toast.success("Jumped to results!")
    } catch (error: any) {
      console.error("[DevTestingDrawer] Jump failed", error)
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        "Jump failed"
      toast.error(`Jump failed: ${msg}`)
    } finally {
      setIsJumping(false)
    }
  }, [jobId, normalizedTools, addCompletedStep, setStepData, setActiveStep])

  const toggleCustomTool = (toolId: string) => {
    setCustomSelection((prev) => ({ ...prev, [toolId]: !prev[toolId] }))
  }

  // ─── Early exits (after all hooks) ────────────────────────────────

  // Only render in development
  if (process.env.NODE_ENV === "production") return null

  // Only show after upload (i.e. on mapping page or beyond)
  const isVisible =
    activeStep === "populations" ||
    activeStep === "configure" ||
    activeStep === "results" ||
    activeStep === "job-status"

  if (!isVisible || !jobId) return null

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="fixed right-0 top-1/2 z-50 -translate-y-1/2">
      {isOpen ? (
        <div className="w-72 rounded-l-lg border border-r-0 border-amber-500/30 bg-card shadow-lg">
          {/* Header */}
          <div
            className="flex cursor-pointer items-center justify-between rounded-tl-lg bg-amber-500/10 px-3 py-2"
            onClick={() => setIsOpen(false)}
          >
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-500">
                Dev Testing
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-amber-500" />
          </div>

          {/* Content */}
          <div className="space-y-2 p-3">
            {/* Active page indicator */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Page:</span>
              <Badge variant="outline" className="text-xs">
                {activeStep}
              </Badge>
              {normalizedTools.length > 0 && (
                <>
                  <span>Tools:</span>
                  <Badge variant="outline" className="text-xs">
                    {normalizedTools.length}
                  </Badge>
                </>
              )}
            </div>

            {/* Fill This Tool */}
            {(activeStep === "populations" || activeStep === "configure") && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={handleFillThisTool}
                >
                  <FileInput className="h-3.5 w-3.5" />
                  Fill This Tool
                </Button>

                {/* Custom Fill */}
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => setCustomPickOpen(!customPickOpen)}
                  >
                    <ListChecks className="h-3.5 w-3.5" />
                    Custom Fill
                    {customPickOpen ? (
                      <ChevronUp className="ml-auto h-3 w-3" />
                    ) : (
                      <ChevronDown className="ml-auto h-3 w-3" />
                    )}
                  </Button>

                  {customPickOpen && (
                    <div className="mt-1 space-y-1 rounded border bg-muted/50 p-2">
                      {normalizedTools.map((toolId) => (
                        <label
                          key={toolId}
                          className="flex items-center gap-2 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={!!customSelection[toolId]}
                            onChange={() => toggleCustomTool(toolId)}
                            className="rounded"
                          />
                          {toolId}
                        </label>
                      ))}
                      <Button
                        variant="default"
                        size="sm"
                        className="mt-1 w-full text-xs"
                        onClick={handleFillCustom}
                        disabled={
                          !Object.values(customSelection).some(Boolean)
                        }
                      >
                        Apply Custom Fill
                      </Button>
                    </div>
                  )}
                </div>

                {/* Fill All */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={handleFillAll}
                >
                  <FileStack className="h-3.5 w-3.5" />
                  Fill All
                </Button>
              </>
            )}

            {/* Jump */}
            <Button
              variant="default"
              size="sm"
              className="w-full justify-start gap-2 bg-amber-500 text-white hover:bg-amber-600"
              onClick={handleJump}
              disabled={isJumping}
            >
              {isJumping ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              {isJumping ? "Jumping..." : "Jump to Results"}
            </Button>
          </div>
        </div>
      ) : (
        <button
          className="flex items-center gap-1 rounded-l-md border border-r-0 border-amber-500/30 bg-card px-2 py-3 shadow-lg hover:bg-amber-500/10"
          onClick={() => setIsOpen(true)}
        >
          <Wrench className="h-4 w-4 text-amber-500" />
        </button>
      )}
    </div>
  )
}
