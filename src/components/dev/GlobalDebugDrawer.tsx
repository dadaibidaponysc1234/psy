"use client"
import React from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useActiveStep, useBenchmarkingStore } from "@/stores/benchmarking-store"
import { cn } from "@/lib/utils"
import { Bug } from "lucide-react"
import { getPrefillsByMode } from "./prefills"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import {
  sanitizeBridgeprsConfig,
  sanitizePrsiceConfig,
  sanitizePrscsxConfig,
  sanitizeSdprxConfig,
  buildBridgeprsProcessingPayload,
  buildPrscsxProcessingPayload,
  buildSdprxProcessingPayload,
} from "@/components/benchmarking/payload-builders"
import type {
  BridgeprsPreProcessingConfig,
  PrsicePreProcessingConfig,
  PrscsxPreProcessingConfig,
  SdprxPreProcessingConfig,
  EvaluationType,
  PrscsxProcessingPayload,
  BridgeprsProcessingPayload,
  SdprxProcessingPayload,
} from "@/components/benchmarking/tool-configuration/types"

// Global, dev-only debug drawer with sticky trigger button.
// Visible only when NEXT_PUBLIC_DEBUG=true. It is step-aware via Zustand store.
// Provides minimal/transitional/full (paste) prefills per step to enable dry runs.

const isDebugEnabled = (process.env.NEXT_PUBLIC_DEBUG || "").toLowerCase() === "true"

const MinimalDatasetStructure = {
  directories: [
    { name: "sumstats", path: "/sumstats", file_count: 1, total_size: 1024, total_size_formatted: "1 KB" },
    { name: "genotype", path: "/genotype", file_count: 3, total_size: 3_000_000, total_size_formatted: "3 MB" },
  ],
  files: [
    {
      name: "sumstats.csv",
      path: "/sumstats/sumstats.csv",
      size: 2048,
      size_formatted: "2 KB",
      file_type: "text/csv",
      is_previewable: true,
      last_modified: new Date().toISOString(),
      columns: ["SNP", "A1", "A2", "BETA", "P", "CHR", "BP", "SE", "N", "ID", "PS", "REF"],
    },
  ],
  total_files: 4,
  total_directories: 2,
  extracted_size: "~3 MB",
  root_path: "/",
}

function useDebugActions() {
  const store = useBenchmarkingStore()
  const { setStepData, setJobId, setJobStatus, setActiveStep, setHasServerUploads, setUploadedFiles, setUploadedFileIds, setUploadProgress, setMappingActiveTool, setToolPopulation, ensureToolFields, setToolFieldValue } = store

  const prefillMinimal = React.useCallback(() => {
    const step = store.activeStep
    const jobId = store.jobId ?? "DEBUG_JOB"

    if (step === "tools") {
      setStepData("tools", { selectedTools: ["PRSice"] })
      setJobId(jobId)
      setJobStatus("created")
      toast({ title: "Prefilled minimal tools", description: "Selected PRSice.", variant: "info" })
      return
    }

    if (step === "datasets") {
      setJobId(jobId)
      setJobStatus("uploaded")
      setHasServerUploads(true)
      setUploadedFiles([
        { id: "/sumstats/sumstats.csv", name: "sumstats.csv", size: 2048, type: "text/csv" },
        { id: "/genotype/chr1.bed", name: "chr1.bed", size: 1000, type: "application/octet-stream" },
        { id: "/genotype/chr1.bim", name: "chr1.bim", size: 1000, type: "application/octet-stream" },
        { id: "/genotype/chr1.fam", name: "chr1.fam", size: 1000, type: "application/octet-stream" },
      ])
      setUploadedFileIds([
        "/sumstats/sumstats.csv",
        "/genotype/chr1.bed",
        "/genotype/chr1.bim",
        "/genotype/chr1.fam",
      ])
      setUploadProgress(100)
      setStepData("__debug_dataset_structure", MinimalDatasetStructure)
      toast({ title: "Prefilled minimal dataset", description: "Uploaded 4 debug files.", variant: "info" })
      return
    }

    if (step === "populations") {
      const toolId = "prsice"
      setMappingActiveTool(toolId)
      setToolPopulation(toolId, { targetPopulation: "Target", sourcePopulation: "Source" })
      // Ensure core mapping fields exist but leave them unmapped for minimal
      ensureToolFields(toolId, [
        "target_population.sumstats_path",
        "target_population.genotype_path",
        "target_population.phenotype_path",
        "source_population.sumstats_path",
        "source_population.genotype_path",
        "source_population.phenotype_path",
      ])
      toast({ title: "Prefilled minimal populations", description: "Target/Source placeholders ready.", variant: "info" })
      return
    }

    if (step === "configure") {
      // Seed minimal config for PRSice only
      const cfgKey = `tool_config_${jobId}`
      const procKey = `tool_processing_config_${jobId}`
      const minimalPrsiceConfig = {
        target_population: {
          name: "Target",
          sumstats_path: "/sumstats/sumstats.csv",
          genotype_path: "/genotype",
          phenotype_path: "/phenotypes/traits.csv",
        },
        source_population: {
          name: "Source",
          sumstats_path: "/sumstats/sumstats.csv",
          genotype_path: "/genotype",
          phenotype_path: "/phenotypes/traits.csv",
        },
        output_dir: "/output/prsice",
        column_mappings: {
          SNP: "SNP",
          A1: "A1",
          A2: "A2",
          BETA: "BETA",
          P: "P",
          CHR: "CHR",
          BP: "BP",
        },
        phenotype_config: {
          target_population: { binary_traits: [], quantitative_traits: [] },
          source_population: { binary_traits: [], quantitative_traits: [] },
        },
        genotype_config: {
          file_type: "merged",
          population_reference: "target_population",
          file_patterns: { bed: "*.bed", bim: "*.bim", fam: "*.fam" },
        },
        options: {
          evaluation_type: "both",
          process_binary_phenotypes: true,
          process_quantitative_phenotypes: true,
          skip_missing_columns: false,
          overwrite_existing: false,
        },
      }
      setStepData(cfgKey, { prsice: minimalPrsiceConfig })
      setStepData(procKey, {})
      toast({ title: "Prefilled minimal config", description: "Seeded PRSice configuration.", variant: "info" })
      return
    }
  }, [store, setStepData, setJobId, setJobStatus, setHasServerUploads, setUploadedFiles, setUploadedFileIds, setUploadProgress, setMappingActiveTool, setToolPopulation, ensureToolFields])

  const prefillTransitional = React.useCallback(() => {
    const step = store.activeStep
    const jobId = store.jobId ?? "DEBUG_JOB"

    if (step === "populations") {
      const toolId = "prsice"
      setMappingActiveTool(toolId)
      setToolPopulation(toolId, { targetPopulation: "Yoruba", sourcePopulation: "European" })
      ensureToolFields(toolId, [
        "target_population.sumstats_path",
        "target_population.genotype_path",
        "source_population.sumstats_path",
      ])
      // Map only one field to simulate transitional state
      setToolFieldValue(toolId, "target_population.sumstats_path", {
        name: "sumstats.csv",
        path: "/sumstats/sumstats.csv",
        size: 2048,
        size_formatted: "2 KB",
        file_type: "text/csv",
        is_previewable: true,
        last_modified: new Date().toISOString(),
        columns: ["SNP", "A1", "A2", "BETA", "P"],
      } as any)
      toast({ title: "Prefilled transitional populations", description: "Mapped target sumstats only.", variant: "info" })
      return
    }

    if (step === "configure") {
      const cfgKey = `tool_config_${jobId}`
      // Transitional: seed config without some required column mappings
      const transitionalPrsiceConfig = {
        target_population: {
          name: "Yoruba",
          sumstats_path: "/sumstats/sumstats.csv",
          genotype_path: "/genotype",
          phenotype_path: "/phenotypes/traits.csv",
        },
        source_population: {
          name: "European",
          sumstats_path: "/sumstats/sumstats.csv",
          genotype_path: "/genotype",
          phenotype_path: "/phenotypes/traits.csv",
        },
        output_dir: "/output/prsice",
        column_mappings: {
          SNP: "SNP",
          A1: "A1",
          // A2 missing intentionally
          BETA: "BETA",
          P: "P",
          CHR: "CHR",
          // BP missing intentionally
        },
        phenotype_config: {
          target_population: { binary_traits: [], quantitative_traits: [] },
          source_population: { binary_traits: [], quantitative_traits: [] },
        },
        genotype_config: {
          file_type: "merged",
          population_reference: "target_population",
          file_patterns: { bed: "*.bed", bim: "*.bim", fam: "*.fam" },
        },
        options: {
          evaluation_type: "both",
          process_binary_phenotypes: true,
          process_quantitative_phenotypes: true,
          skip_missing_columns: false,
          overwrite_existing: false,
        },
      }
      setStepData(cfgKey, { prsice: transitionalPrsiceConfig })
      toast({ title: "Prefilled transitional config", description: "Seeded partial PRSice mappings.", variant: "info" })
      return
    }
  }, [store, setStepData, setMappingActiveTool, setToolPopulation, ensureToolFields, setToolFieldValue])

  const applyFullFromPaste = React.useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json)
      // Accept either raw localStorage dump or a map of step keys
      if (parsed && typeof parsed === "object") {
        // Common keys we expect to merge
        Object.entries(parsed).forEach(([key, value]) => {
          store.setStepData(String(key), value)
        })
        if (parsed.jobId) {
          setJobId(parsed.jobId)
        }
        if (parsed.jobStatus) {
          setJobStatus(parsed.jobStatus)
        }
        toast({ title: "Applied pasted state", description: "Merged job and step data.", variant: "info" })
      }
    } catch (e) {
      console.error("Failed to parse pasted JSON", e)
    }
  }, [store, setJobId, setJobStatus])

  return { prefillMinimal, prefillTransitional, applyFullFromPaste }
}

export function GlobalDebugDrawer() {
  const activeStep = useActiveStep()
  const { jobId } = useBenchmarkingStore()
  const [open, setOpen] = React.useState(false)
  const { prefillMinimal, prefillTransitional } = useDebugActions()
  const applyFullLive = React.useCallback(() => {
    const { jobId, jobStatus, tools, populations, datasetStructure } = getPrefillsByMode("full")
    const store = useBenchmarkingStore.getState()
    store.setJobId(jobId)
    store.setJobStatus(jobStatus as any)
    store.setStepData("tools", tools)
    store.setStepData("populations", populations)
    store.setStepData("__debug_dataset_structure", datasetStructure)
    toast({ title: "Applied full live dump", description: "Tools, populations, dataset structure set.", variant: "info" })
  }, [])

  if (!isDebugEnabled) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "fixed right-2 top-1/2 z-50 -translate-y-1/2",
            "rounded-full px-3 py-6 shadow-md bg-white/90 hover:bg-white"
          )}
          title="Open Debug Drawer"
        >
          <Bug className="mr-2 h-4 w-4" /> Debug
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[720px] sm:w-[820px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bug className="h-4 w-4" /> Dev Debug Drawer
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Active Step</div>
            <Badge variant="outline">{activeStep}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Job ID</div>
            <Badge variant="secondary">{jobId || "none"}</Badge>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" onClick={prefillMinimal}>
              Minimal
            </Button>
            <Button size="sm" variant="secondary" onClick={prefillTransitional}>
              Transitional
            </Button>
            <Button size="sm" variant="outline" onClick={applyFullLive}>
              Full (live dump)
            </Button>
          </div>

          <ToolConfigPreviews />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ToolConfigPreviews() {
  const store = useBenchmarkingStore()
  const { jobId, stepData } = store
  const selectedTools = ((stepData["tools"] as any)?.selectedTools || []) as string[]
  const normalizedTools = selectedTools.map((t) => String(t).toLowerCase())
  const dataset = stepData["__debug_dataset_structure"] || null
  const livePopulations = stepData["populations"] || null

  const configStorageKey = jobId ? `tool_config_${jobId}` : undefined
  const processingStorageKey = jobId ? `tool_processing_config_${jobId}` : undefined
  const storedConfigs = (configStorageKey ? (stepData[configStorageKey] as Record<string, any>) : {}) || {}
  const storedProcessing = (processingStorageKey ? (stepData[processingStorageKey] as Record<string, any>) : {}) || {}

  // Build sanitized pre-processing configs per tool
  const sanitizedConfigs: Record<string, any> = React.useMemo(() => {
    const out: Record<string, any> = {}
    normalizedTools.forEach((toolId) => {
      const raw = storedConfigs[toolId]
      if (!raw) return
      if (toolId === "bridgeprs") {
        out[toolId] = sanitizeBridgeprsConfig(raw as BridgeprsPreProcessingConfig)
      } else if (toolId === "prsice") {
        out[toolId] = sanitizePrsiceConfig(raw as PrsicePreProcessingConfig)
      } else if (toolId === "prscsx") {
        out[toolId] = sanitizePrscsxConfig(raw as PrscsxPreProcessingConfig)
      } else if (toolId === "sdprx") {
        out[toolId] = sanitizeSdprxConfig(raw as SdprxPreProcessingConfig)
      } else {
        out[toolId] = raw
      }
    })
    return out
  }, [normalizedTools, storedConfigs])

  // Resolve evaluation type per tool from sanitized config options (fallback to "both")
  const evaluationByTool: Record<string, EvaluationType> = React.useMemo(() => {
    const out: Record<string, EvaluationType> = {}
    normalizedTools.forEach((toolId) => {
      const cfg = sanitizedConfigs[toolId]
      out[toolId] = (cfg?.options?.evaluation_type || "both") as EvaluationType
    })
    return out
  }, [normalizedTools, sanitizedConfigs])

  // Build full processing payloads using shared builders, when processing state exists
  const builtProcessing: Record<string, PrscsxProcessingPayload | BridgeprsProcessingPayload | SdprxProcessingPayload | null> = React.useMemo(() => {
    const out: Record<string, PrscsxProcessingPayload | BridgeprsProcessingPayload | SdprxProcessingPayload | null> = {}
    normalizedTools.forEach((toolId) => {
      const processingState = storedProcessing[toolId]
      const cfg = sanitizedConfigs[toolId]
      const mode = evaluationByTool[toolId] || ("both" as EvaluationType)
      if (!processingState || !cfg) {
        out[toolId] = null
        return
      }
      if (toolId === "prscsx") {
        out[toolId] = buildPrscsxProcessingPayload(cfg as PrscsxPreProcessingConfig, processingState, mode)
      } else if (toolId === "bridgeprs") {
        out[toolId] = buildBridgeprsProcessingPayload(cfg as BridgeprsPreProcessingConfig, processingState, mode)
      } else if (toolId === "sdprx") {
        out[toolId] = buildSdprxProcessingPayload(cfg as SdprxPreProcessingConfig, processingState, mode)
      } else {
        out[toolId] = null
      }
    })
    return out
  }, [normalizedTools, sanitizedConfigs, storedProcessing, evaluationByTool])

  const requestBody = {
    config: {
      tools_to_run: normalizedTools,
      ...Object.fromEntries(
        normalizedTools.map((toolId) => [
          toolId,
          {
            pre_processing: sanitizedConfigs[toolId] ?? null,
            ...(builtProcessing[toolId] ? { processing: builtProcessing[toolId] } : {}),
          },
        ])
      ),
    },
  }

  const validationErrors: string[] = []
  if (!jobId) validationErrors.push("Missing job ID (required for URL)")
  if (normalizedTools.length === 0) validationErrors.push("No tools selected")
  normalizedTools.forEach((toolId) => {
    if (!storedConfigs[toolId]) {
      validationErrors.push(`Missing pre_processing for ${toolId}`)
    }
    // Show processing payload presence for tools that define it
    if (storedProcessing[toolId] == null) {
      // Only warn if tool is known to have processing state
      const toolsWithProcessing = new Set(["prscsx", "bridgeprs", "sdprx"]) // keep in sync with ToolConfiguration
      if (toolsWithProcessing.has(toolId)) {
        validationErrors.push(`Missing processing payload for ${toolId}`)
      }
    }
  })

  const json = (obj: any) => JSON.stringify(obj, null, 2)

  // Sanitize mapping payload for the Mapping tab: remove dataset structures and keep paths
  const sanitize = React.useCallback((input: any): any => {
    if (input == null) return input
    if (Array.isArray(input)) return input.map(sanitize)
    if (typeof input !== "object") return input
    const stripKeys = new Set([
      "__debug_dataset_structure",
      "datasetStructure",
      "directories",
      "files",
      "columns",
      "extracted_size",
      "total_files",
      "total_directories",
      "root_path",
    ])
    const out: Record<string, any> = {}
    Object.keys(input).forEach((k) => {
      if (stripKeys.has(k)) return
      const v = (input as any)[k]
      if (v && typeof v === "object") {
        // If it looks like a file-like object, show just the path (and name if helpful)
        if ("path" in v && typeof (v as any).path === "string") {
          out[k] = (v as any).path
        } else {
          out[k] = sanitize(v)
        }
      } else {
        out[k] = v
      }
    })
    return out
  }, [])

  const sanitizedPopulations = React.useMemo(() => sanitize(livePopulations), [livePopulations, sanitize])

  return (
    <div className="space-y-3">
      <Tabs defaultValue="state" className="w-full">
        <TabsList className="mb-2 w-full justify-start">
          <TabsTrigger value="state">State</TabsTrigger>
          <TabsTrigger value="mapping">Mapping</TabsTrigger>
          <TabsTrigger value="payload">Payload</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
        </TabsList>

        <TabsContent value="state">
          <Card>
            <CardContent className="p-0">
              <pre className="max-h-[40vh] overflow-auto p-4 text-xs">
                {json({
                  jobId,
                  tools: stepData["tools"],
                  configStorageKey: jobId ? `tool_config_${jobId}` : undefined,
                  processingStorageKey: jobId ? `tool_processing_config_${jobId}` : undefined,
                  storedConfigs: (jobId ? (stepData[`tool_config_${jobId}`] as Record<string, any>) : {}) || {},
                  storedProcessing: (jobId ? (stepData[`tool_processing_config_${jobId}`] as Record<string, any>) : {}) || {},
                  datasetStructure: dataset,
                })}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payload">
          <Card>
            <CardContent className="p-0">
              <pre className="max-h-[40vh] overflow-auto p-4 text-xs">
                {json({
                  sanitized: sanitizedConfigs,
                  builtProcessing,
                  requestBody,
                })}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation">
          <Card>
            <CardContent className="p-0">
              <pre className="max-h-[40vh] overflow-auto p-4 text-xs">
                {json({ errors: validationErrors })}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="mapping">
          <Card>
            <CardContent className="p-0">
              <div className="p-4 space-y-2">
                <div className="text-xs text-muted-foreground">Sanitized mapping (no dataset structures)</div>
                <pre className="max-h-[40vh] overflow-auto text-xs">
                  {json({ populations: sanitizedPopulations })}
                </pre>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs">Raw mapping payload (expand to view)</summary>
                  <pre className="max-h-[30vh] overflow-auto p-2 text-[10px]">
                    {json({ populations: livePopulations })}
                  </pre>
                </details>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}

export default GlobalDebugDrawer