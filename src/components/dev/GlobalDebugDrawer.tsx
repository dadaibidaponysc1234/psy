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

  const configStorageKey = jobId ? `tool_config_${jobId}` : undefined
  const processingStorageKey = jobId ? `tool_processing_config_${jobId}` : undefined
  const storedConfigs = (configStorageKey ? (stepData[configStorageKey] as Record<string, any>) : {}) || {}
  const storedProcessing = (processingStorageKey ? (stepData[processingStorageKey] as Record<string, any>) : {}) || {}

  const requestBody = {
    config: {
      tools_to_run: normalizedTools,
      ...Object.fromEntries(
        normalizedTools.map((toolId) => [
          toolId,
          {
            pre_processing: storedConfigs[toolId] ?? null,
            ...(toolId === "prscsx" && storedProcessing[toolId]
              ? { processing: storedProcessing[toolId] }
              : {}),
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
    if (toolId === "prscsx" && !storedProcessing[toolId]) {
      validationErrors.push("Missing processing payload for prscsx (binary/quantitative)")
    }
  })

  const json = (obj: any) => JSON.stringify(obj, null, 2)

  return (
    <div className="space-y-3">
      <Tabs defaultValue="state" className="w-full">
        <TabsList className="mb-2 w-full justify-start">
          <TabsTrigger value="state">State</TabsTrigger>
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
                  configStorageKey,
                  processingStorageKey,
                  storedConfigs,
                  storedProcessing,
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
                {json({ requestBody })}
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
      </Tabs>
    </div>
  )
}

export default GlobalDebugDrawer