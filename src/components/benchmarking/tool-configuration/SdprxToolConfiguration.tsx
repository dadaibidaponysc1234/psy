"use client"

import React, { useCallback, useMemo, useState, useEffect } from "react"
import axios from "axios"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Eye, Loader2, ChevronDown, ChevronRight, Info } from "lucide-react"
import { toast } from "react-hot-toast"
import { getBenchmarkPreviewUrl, REFERENCE_PATHS } from "@/lib/config"
import type {
  EvaluationType,
  SdprxPreProcessingConfig,
  SdprxColumnKey,
  SdprxProcessingState,
  SdprxProcessingModeState,
} from "./types"
import { COMMON_COLUMN_ALIASES, aliasMatches } from "./column-aliases"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChromosomeMultiSelect } from "@/components/ui/chromosome-multi-select"

interface SdprxToolConfigurationProps {
  toolId: string
  config: SdprxPreProcessingConfig
  jobId: string | null
  onConfigChange: (nextConfig: SdprxPreProcessingConfig) => void
  stepBadge?: React.ReactNode
  evaluationType: EvaluationType
  processingConfig?: SdprxProcessingState
  onProcessingChange?: (
    updater: (state: SdprxProcessingState) => SdprxProcessingState
  ) => void
}

export function SdprxToolConfiguration({
  toolId,
  config,
  jobId,
  onConfigChange,
  stepBadge,
  evaluationType,
  processingConfig,
  onProcessingChange,
}: SdprxToolConfigurationProps) {
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLines, setPreviewLines] = useState<string[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [expanded, setExpanded] = useState(true)
  const [expandedSections, setExpandedSections] = useState<string[]>([])

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }, [])
  const REQUIRED_COLUMNS: SdprxColumnKey[] = ["SNP", "A1", "A2", "N"]

  // Use centralized aliases to keep parity with PRSice/PRScsx/BridgePRS
  const COLUMN_ALIASES: Record<SdprxColumnKey, string[]> = {
    SNP: COMMON_COLUMN_ALIASES.SNP,
    A1: COMMON_COLUMN_ALIASES.A1,
    A2: COMMON_COLUMN_ALIASES.A2,
    N: COMMON_COLUMN_ALIASES.N,
    Z: COMMON_COLUMN_ALIASES.Z,
  }

  const updateColumnMapping = (field: SdprxColumnKey, header: string) => {
    onConfigChange({
      ...config,
      column_mappings: {
        ...(config?.column_mappings || {}),
        [field]: header,
      },
    })
  }

  const removeColumnMapping = (field: SdprxColumnKey) => {
    const next = { ...(config?.column_mappings || {}) }
    delete next[field]
    onConfigChange({
      ...config,
      column_mappings: next,
    })
  }

  const fetchTargetPreview = useCallback(async () => {
    if (isLoadingPreview) return
    if (!jobId) {
      setPreviewError("Missing job ID for preview")
      toast.error("No job ID. Create a job before previewing.")
      return
    }
    if (!config?.pop1?.sumstats_path) {
      setPreviewError("Missing Target sumstats path")
      toast.error("Set the Target sumstats path before preview.")
      return
    }
    try {
      setIsLoadingPreview(true)
      setPreviewError(null)
      const sumstatsType = config.sumstats_file_type || "merged"
      const url = getBenchmarkPreviewUrl(jobId, config.pop1.sumstats_path, {
        randomPick: sumstatsType === "multi_chromosome",
      })
      console.log("[SDPRX Preview] GET:", url)
      const response = await axios.get(url)
      console.log("[SDPRX Preview] Response:", response?.data)
      const lines: string[] = response?.data?.preview_lines || []
      setPreviewLines(lines)

      const firstLine = (lines[0] || "").trim()
      const hdrs =
        firstLine.length > 0
          ? firstLine.includes("\t")
            ? firstLine.split("\t").map((h) => h.trim())
            : firstLine.split(/\s+/).map((h) => h.trim())
          : []
      setHeaders(hdrs)

      // Auto-map based on aliases
      const autoMappings: Partial<Record<SdprxColumnKey, string>> = {}
      const selected = new Set(Object.values(config?.column_mappings || {}))
      const options = hdrs.filter((h) => !selected.has(h))
      REQUIRED_COLUMNS.forEach((field) => {
        if (config?.column_mappings?.[field]) return
        const match = options.find((header) => {
          return aliasMatches(field, header)
        })
        if (match) autoMappings[field] = match
      })
      if (Object.keys(autoMappings).length > 0) {
        onConfigChange({
          ...config,
          column_mappings: {
            ...(config?.column_mappings || {}),
            ...autoMappings,
          },
        })
        toast.success("Auto-mapped SDPRX columns from Target headers")
      } else {
        toast.success("Preview loaded: no auto-mapping candidates found")
      }
    } catch (e) {
      console.error("Failed to fetch preview", e)
      setPreviewError("Failed to load file preview")
      toast.error("Failed to load preview. Check jobId and file path.")
    } finally {
      setIsLoadingPreview(false)
    }
  }, [
    jobId,
    config?.pop1?.sumstats_path,
    isLoadingPreview,
    config,
    onConfigChange,
  ])

  const allowBinaryTraits = useMemo(
    () => evaluationType === "binary" || evaluationType === "both",
    [evaluationType]
  )
  const allowQuantitativeTraits = useMemo(
    () => evaluationType === "quantitative" || evaluationType === "both",
    [evaluationType]
  )

  // SDPRX Processing Configuration (lifted & adapted from PRScsx)
  type ProcessingModeKey = keyof SdprxProcessingState

  const buildDefaultSdprxProcessingState = useCallback(
    (cfg: SdprxPreProcessingConfig): SdprxProcessingState => {
      const refPop = cfg?.genotype_config?.population_reference || "pop1"
      const geno =
        refPop === "pop2" ? cfg?.pop2?.genotype_path : cfg?.pop1?.genotype_path
      const chromStr =
        Array.isArray(cfg?.genotype_config?.chrom) &&
        cfg.genotype_config.chrom.length > 0
          ? cfg.genotype_config.chrom.join(",")
          : ""
      const baseDefaults = {
        ss1: cfg?.pop1?.sumstats_path || "",
        ss2: cfg?.pop2?.sumstats_path || "",
        // For merged runs, sdprx_genotype_file is a basename; default to "geno".
        sdprx_genotype_file: "geno",
        n1: "",
        n2: "",
        force_shared: false,
        load_ld: REFERENCE_PATHS.SDPRX_LD_REF,
        valid: "",
        chrom: chromStr,
        rho: "",
        output_dir: cfg?.output_dir || "",
        score_file: "",
        plink_output_prefix: "",
        plink_genotype_prefix: "",
        pheno: "",
        log_dir: "",
      }
      return {
        binary: { ...baseDefaults },
        quantitative: { ...baseDefaults },
      }
    },
    []
  )

  const [localProcessingConfig, setLocalProcessingConfig] =
    useState<SdprxProcessingState>(() =>
      buildDefaultSdprxProcessingState(config)
    )

  // Keep local processing defaults in sync when config changes (only if parent does not manage processing)
  useEffect(() => {
    if (!processingConfig) {
      setLocalProcessingConfig(buildDefaultSdprxProcessingState(config))
    }
  }, [config, processingConfig, buildDefaultSdprxProcessingState])

  const effectiveProcessing: SdprxProcessingState =
    processingConfig ?? localProcessingConfig

  // Keep processing chrom in sync with genotype_config.chrom for multi-chromosome only
  useEffect(() => {
    if (config?.genotype_config?.file_type !== "multi_chromosome") return
    const chromStr =
      Array.isArray(config?.genotype_config?.chrom) &&
      (config.genotype_config.chrom?.length ?? 0) > 0
        ? (config.genotype_config.chrom as number[]).join(",")
        : ""
    const needsUpdate =
      effectiveProcessing.binary.chrom !== chromStr ||
      effectiveProcessing.quantitative.chrom !== chromStr
    if (!needsUpdate) return
    if (onProcessingChange) {
      onProcessingChange((current) => ({
        ...current,
        binary: { ...current.binary, chrom: chromStr },
        quantitative: { ...current.quantitative, chrom: chromStr },
      }))
    } else {
      setLocalProcessingConfig((current) => ({
        ...current,
        binary: { ...current.binary, chrom: chromStr },
        quantitative: { ...current.quantitative, chrom: chromStr },
      }))
    }
  }, [
    config?.genotype_config?.chrom,
    config?.genotype_config?.file_type,
    onProcessingChange,
    effectiveProcessing,
  ])

  const updateProcessingMode = useCallback(
    (
      mode: ProcessingModeKey,
      updater: (
        state: SdprxProcessingState[ProcessingModeKey]
      ) => SdprxProcessingState[ProcessingModeKey]
    ) => {
      if (onProcessingChange) {
        onProcessingChange((current) => ({
          ...current,
          [mode]: updater(current[mode]),
        }))
      } else {
        setLocalProcessingConfig((current) => ({
          ...current,
          [mode]: updater(current[mode]),
        }))
      }
    },
    [onProcessingChange, setLocalProcessingConfig]
  )

  const traitOptionsForMode = useCallback(
    (mode: ProcessingModeKey): string[] => {
      const traitKey =
        mode === "binary" ? "binary_traits" : "quantitative_traits"
      const options = config?.phenotype_config?.pop1?.[traitKey] || []
      return options
    },
    [config?.phenotype_config?.pop1]
  )

  const renderProcessingMode = (mode: ProcessingModeKey) => {
    const isBinary = mode === "binary"
    const modeEnabled = isBinary ? allowBinaryTraits : allowQuantitativeTraits
    if (!modeEnabled) return null

    const state = effectiveProcessing[mode]
    const traitOptions = traitOptionsForMode(mode)
    const isMerged = config?.genotype_config?.file_type === "merged"

    return (
      <div className="space-y-4">
        <div className="rounded-md border p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {isBinary ? "Binary" : "Quantitative"} Mode
          </p>

          {/* Editable numeric fields */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${toolId}-${mode}-n1`}>N1 (Target)</Label>
              <Input
                id={`${toolId}-${mode}-n1`}
                value={state.n1}
                placeholder={"e.g. 500"}
                onChange={(e) =>
                  updateProcessingMode(mode, (prev) => ({
                    ...prev,
                    n1: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${toolId}-${mode}-n2`}>N2 (Base)</Label>
              <Input
                id={`${toolId}-${mode}-n2`}
                value={state.n2}
                placeholder={"e.g. 500"}
                onChange={(e) =>
                  updateProcessingMode(mode, (prev) => ({
                    ...prev,
                    n2: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          {/* Editable fields: rho, force_shared, chromosome & genotype prefix (merged only) */}
          <div
            className={`mt-4 grid grid-cols-1 gap-4 ${isMerged ? "md:grid-cols-4" : "md:grid-cols-2"}`}
          >
            <div className="space-y-2">
              <Label htmlFor={`${toolId}-${mode}-rho`}>Rho</Label>
              <Input
                id={`${toolId}-${mode}-rho`}
                value={state.rho}
                placeholder="e.g. 0.8"
                onChange={(e) =>
                  updateProcessingMode(mode, (prev) => ({
                    ...prev,
                    rho: e.target.value,
                  }))
                }
              />
            </div>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={state.force_shared}
                onCheckedChange={(checked) =>
                  updateProcessingMode(mode, (prev) => ({
                    ...prev,
                    force_shared: Boolean(checked),
                  }))
                }
              />
              <span>
                Force shared LD
                <span className="block text-xs text-muted-foreground">
                  Treat LD structure as shared between populations
                </span>
              </span>
            </label>
            {isMerged ? (
              <div className="space-y-2">
                <Label htmlFor={`${toolId}-${mode}-chrom`}>Chromosome</Label>
                <Input
                  id={`${toolId}-${mode}-chrom`}
                  value={state.chrom}
                  placeholder={"e.g. 1,2,3 or X"}
                  onChange={(e) =>
                    updateProcessingMode(mode, (prev) => ({
                      ...prev,
                      chrom: e.target.value,
                    }))
                  }
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor={`${toolId}-${mode}-chrom`}>Chromosome</Label>
                <Input
                  id={`${toolId}-${mode}-chrom`}
                  value={
                    Array.isArray(config?.genotype_config?.chrom)
                      ? ((config?.genotype_config?.chrom as number[]) || []).join(",")
                      : ""
                  }
                  readOnly
                  disabled
                  className="cursor-not-allowed bg-muted text-muted-foreground"
                  placeholder="Chromosomes controlled via Genotype Configuration"
                />
                <p className="text-xs text-muted-foreground">
                  Controlled via Genotype Configuration; updates in real time.
                </p>
              </div>
            )}
            {isMerged && (
              <div className="space-y-2">
                <Label htmlFor={`${toolId}-${mode}-sdprx-geno-prefix`}>
                  Genotype Prefix (basename)
                </Label>
                <Input
                  id={`${toolId}-${mode}-sdprx-geno-prefix`}
                  value={state.sdprx_genotype_file}
                  placeholder={"e.g. geno"}
                  onChange={(e) =>
                    updateProcessingMode(mode, (prev) => ({
                      ...prev,
                      sdprx_genotype_file: e.target.value,
                    }))
                  }
                />
              </div>
            )}
          </div>

          {/* Informational note about hardcoded paths */}
          <div className="mt-3 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            Paths (sumstats, genotype, phenotype, output, plink, logs) are
            auto-configured based on preprocessing output and the selected
            populations, following the reference config. Only{" "}
            {isMerged
              ? "N1, N2, Chromosome, Rho, Genotype Prefix, and Force Shared"
              : "N1, N2, Rho, and Force Shared"}{" "}
            are editable here.
          </div>
        </div>
      </div>
    )
  }

  const getAvailableOptions = useCallback(
    (field: SdprxColumnKey) => {
      const selected = new Set(Object.values(config?.column_mappings || {}))
      const mapped = config?.column_mappings?.[field]
      const aliasSource = COLUMN_ALIASES[field] || []

      // Manual fallback when headers are unavailable
      if (headers.length === 0 && previewError) {
        return mapped && !aliasSource.includes(mapped)
          ? [mapped, ...aliasSource]
          : aliasSource
      }

      const options = headers.filter((h) => {
        const isCurrent = mapped === h
        if (isCurrent) return true
        return !selected.has(h)
      })
      return mapped && !options.includes(mapped)
        ? [mapped, ...options]
        : options
    },
    [headers, config?.column_mappings, previewError]
  )

  const updateOptions = (
    partial: Partial<SdprxPreProcessingConfig["options"]>
  ) => {
    const next = {
      ...(config?.options ?? {}),
      ...partial,
    }
    onConfigChange({ ...config, options: next })
  }

  // Phenotype preview state
  const [phenotypeHeaders, setPhenotypeHeaders] = useState<{
    pop1: string[]
    pop2: string[]
  }>({ pop1: [], pop2: [] })
  const [loadingPhenotypes, setLoadingPhenotypes] = useState<{
    pop1: boolean
    pop2: boolean
  }>({ pop1: false, pop2: false })
  const [phenotypeError, setPhenotypeError] = useState<string | null>(null)

  const fetchPhenotypePreview = useCallback(
    async (which: "pop1" | "pop2") => {
      if (!jobId) {
        setPhenotypeError("Missing job ID for preview")
        toast.error("No job ID. Create a job before previewing.")
        return
      }
      const phenoPath =
        which === "pop1"
          ? config?.pop1?.phenotype_path
          : config?.pop2?.phenotype_path
      if (!phenoPath) {
        setPhenotypeError("Missing phenotype path for selected population")
        toast.error("Set the phenotype path before preview.")
        return
      }
      setLoadingPhenotypes((prev) => ({ ...prev, [which]: true }))
      setPhenotypeError(null)
      try {
        const url = getBenchmarkPreviewUrl(jobId, phenoPath)
        const response = await axios.get(url)
        const lines: string[] = response?.data?.preview_lines || []
        const firstLine = (lines[0] || "").trim()
        const hdrs =
          firstLine.length > 0
            ? firstLine.includes("\t")
              ? firstLine.split("\t").map((h) => h.trim())
              : firstLine.split(/\s+/).map((h) => h.trim())
            : []
        setPhenotypeHeaders((prev) => ({ ...prev, [which]: hdrs }))
        toast.success(`Loaded ${hdrs.length} phenotype columns for ${which}`)
      } catch (err) {
        console.error("Failed to fetch phenotype preview", err)
        setPhenotypeError("Failed to load phenotype preview")
        toast.error("Failed to load phenotype preview")
      } finally {
        setLoadingPhenotypes((prev) => ({ ...prev, [which]: false }))
      }
    },
    [jobId, config?.pop1?.phenotype_path, config?.pop2?.phenotype_path]
  )

  const toggleTrait = (
    populationKey: "pop1" | "pop2",
    traitType: "binary_traits" | "quantitative_traits",
    header: string,
    checked: boolean
  ) => {
    const currentTraits =
      config.phenotype_config?.[populationKey]?.[traitType] || []
    const nextTraits = checked
      ? Array.from(new Set([...currentTraits, header]))
      : currentTraits.filter((h) => h !== header)

    onConfigChange({
      ...config,
      phenotype_config: {
        ...config.phenotype_config,
        [populationKey]: {
          ...(config.phenotype_config?.[populationKey] || {
            binary_traits: [],
            quantitative_traits: [],
          }),
          [traitType]: nextTraits,
        },
      },
    })
  }

  const targetLabel = config?.pop1?.name || "Target Population"

  const updateGenotypeConfig = (
    partial: Partial<SdprxPreProcessingConfig["genotype_config"]>
  ) => {
    const prev = config?.genotype_config ?? {
      file_type: "merged",
      population_reference: "pop1",
      file_patterns: { bed: "", bim: "", fam: "" },
    }
    const next: SdprxPreProcessingConfig["genotype_config"] = {
      ...prev,
      ...partial,
      file_patterns: {
        ...(prev.file_patterns || {}),
        ...(partial.file_patterns ?? {}),
      },
    }
    onConfigChange({ ...config, genotype_config: next })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>SDPRX Configuration</CardTitle>
          <CardDescription>
            Configure preprocessing settings and column mappings for SDPRX.
          </CardDescription>
        </div>
        {stepBadge ?? <Badge variant="outline">Step 5</Badge>}
      </CardHeader>
      <CardContent className="space-y-6">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
              <div>
                <h4 className="font-medium">Column Mapping (Target)</h4>
                <p className="text-sm text-muted-foreground">
                  Map your Target sumstats columns to SDPRX fields
                </p>
              </div>
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Preview your sumstats file to see available columns
                  </p>
                  {config?.sumstats_file_type === "multi_chromosome" && (
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 text-orange-500" />
                      Multi-chromosome input: if the path is a directory,
                      preview selects a random file. Ensure headers are uniform
                      across files; if they differ, reload preview or map using
                      a representative file.
                    </p>
                  )}
                  {previewLines.length > 0 && (
                    <p className="mt-1 text-xs text-green-600">
                      ✓ Headers loaded – {headers.length} columns available
                    </p>
                  )}
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchTargetPreview}
                    disabled={isLoadingPreview}
                  >
                    {isLoadingPreview ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Loading
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />{" "}
                        {previewLines.length > 0
                          ? "Reload Preview"
                          : "Preview File"}
                      </>
                    )}
                  </Button>
                  {config?.pop1?.sumstats_path && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      File: {config.pop1.sumstats_path}
                    </div>
                  )}
                </div>
              </div>

              {previewError && (
                <>
                  <div className="text-sm text-destructive">{previewError}</div>
                  <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                    Preview failed. Manual mapping is enabled below; choices are
                    limited to known aliases per required column.
                  </p>
                </>
              )}

              {/* File path moved under the preview button above to match PRSice layout */}
              {previewLines.length > 0 && (
                <div className="rounded-lg border shadow-sm">
                  <div className="flex items-center justify-between border-b p-2 text-sm">
                    <div className="font-medium">
                      {config.pop1.sumstats_path.split("/").pop() ||
                        config.pop1.sumstats_path}
                    </div>
                    <div className="text-muted-foreground">
                      {headers.length} columns detected
                    </div>
                  </div>
                  <div className="overflow-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          {(() => {
                            const first = (previewLines[0] || "").trim()
                            const cells = first.includes("\t")
                              ? first.split("\t")
                              : first.length > 0
                                ? first.split(/\s+/)
                                : []
                            return cells.map((h, i) => (
                              <th
                                key={`h-${i}`}
                                className="whitespace-nowrap px-2 py-1 text-left font-medium"
                              >
                                {h}
                              </th>
                            ))
                          })()}
                        </tr>
                      </thead>
                      <tbody>
                        {previewLines.slice(1, 6).map((line, rowIndex) => (
                          <tr key={`r-${rowIndex}`} className="border-b">
                            {(() => {
                              const trimmed = line.trim()
                              const cells = trimmed.includes("\t")
                                ? trimmed.split("\t")
                                : trimmed.length > 0
                                  ? trimmed.split(/\s+/)
                                  : []
                              return cells.map((cell, cellIndex) => (
                                <td
                                  key={`c-${cellIndex}`}
                                  className="whitespace-nowrap px-2 py-1"
                                >
                                  {cell}
                                </td>
                              ))
                            })()}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {REQUIRED_COLUMNS.map((field) => {
                  const mappedHeader = config?.column_mappings?.[field] || ""
                  const options = getAvailableOptions(field)
                  const isMapped = Boolean(mappedHeader)

                  return (
                    <div
                      key={field}
                      className="rounded-lg border p-4 shadow-sm transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{field}</p>
                          <p className="text-xs text-muted-foreground">
                            {COLUMN_ALIASES[field]?.join(", ")}
                          </p>
                        </div>
                        {isMapped ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700"
                          >
                            Mapped
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700"
                          >
                            Required
                          </Badge>
                        )}
                      </div>

                      <div className="mt-3 space-y-2">
                        <Label className="text-xs">Column Header</Label>
                        <Select
                          value={mappedHeader || undefined}
                          onValueChange={(value) => {
                            if (value === "__remove__") {
                              removeColumnMapping(field)
                              toast.success(`Cleared mapping for ${field}`)
                            } else {
                              updateColumnMapping(field, value)
                              toast.success(`Mapped ${field} to ${value}`)
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {isMapped && (
                              <SelectItem value="__remove__">
                                Remove mapping
                              </SelectItem>
                            )}
                            {options.length > 0 ? (
                              options.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-options" disabled>
                                No available columns
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Phenotype Configuration */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
              <div>
                <h4 className="font-medium">Phenotype Configuration</h4>
                <p className="text-sm text-muted-foreground">
                  Preview phenotype headers and select traits for Pop1 and Pop2
                  populations
                </p>
              </div>
              <ChevronRight className="h-4 w-4" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed p-3">
                <p className="text-xs text-muted-foreground">
                  Evaluation type is currently set to
                  <span className="ml-1 font-medium capitalize">
                    {evaluationType}
                  </span>
                  .
                </p>
                {!allowBinaryTraits && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enable binary evaluation to select binary traits.
                  </p>
                )}
                {!allowQuantitativeTraits && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enable quantitative evaluation to select quantitative
                    traits.
                  </p>
                )}
              </div>

              {phenotypeError && (
                <div className="text-sm text-destructive">{phenotypeError}</div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[
                  {
                    key: "pop1" as const,
                    label: config?.pop1?.name || "Target Population",
                    path: config?.pop1?.phenotype_path,
                    traits: config?.phenotype_config?.pop1 || {
                      binary_traits: [],
                      quantitative_traits: [],
                    },
                  },
                  {
                    key: "pop2" as const,
                    label: config?.pop2?.name || "Base Population",
                    path: config?.pop2?.phenotype_path,
                    traits: config?.phenotype_config?.pop2 || {
                      binary_traits: [],
                      quantitative_traits: [],
                    },
                  },
                ].map(({ key, label, path, traits }) => {
                  const headers = phenotypeHeaders[key]
                  const loading = loadingPhenotypes[key]
                  const hasPhenotypeFile = Boolean(path)
                  return (
                    <div key={`pheno-${key}`} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            {path || "No phenotype file mapped"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchPhenotypePreview(key)}
                          disabled={loading || !hasPhenotypeFile}
                        >
                          {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="mr-2 h-4 w-4" />
                          )}
                          Preview Phenotype
                        </Button>
                      </div>

                      {!hasPhenotypeFile ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Provide a phenotype path to configure traits for this
                          population.
                        </p>
                      ) : headers.length === 0 ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Preview the phenotype file to load column headers.
                        </p>
                      ) : (
                        <div className="mt-4 space-y-4">
                          {allowBinaryTraits && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase text-muted-foreground">
                                Binary Traits
                              </p>
                              {headers.map((header) => (
                                <label
                                  key={`${key}-b-${header}`}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <Checkbox
                                    checked={traits.binary_traits.includes(
                                      header
                                    )}
                                    onCheckedChange={(checked) =>
                                      toggleTrait(
                                        key,
                                        "binary_traits",
                                        header,
                                        Boolean(checked)
                                      )
                                    }
                                  />
                                  <span>{header}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          {allowQuantitativeTraits && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase text-muted-foreground">
                                Quantitative Traits
                              </p>
                              {headers.map((header) => (
                                <label
                                  key={`${key}-q-${header}`}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <Checkbox
                                    checked={traits.quantitative_traits.includes(
                                      header
                                    )}
                                    onCheckedChange={(checked) =>
                                      toggleTrait(
                                        key,
                                        "quantitative_traits",
                                        header,
                                        Boolean(checked)
                                      )
                                    }
                                  />
                                  <span>{header}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Genotype Configuration */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
              <div>
                <h4 className="font-medium">Genotype Configuration</h4>
                <p className="text-sm text-muted-foreground">
                  Configure PLINK file handling and patterns
                </p>
              </div>
              <ChevronRight className="h-4 w-4" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Population Reference</Label>
                  <Badge variant="outline" className="text-xs">
                    Coming soon
                  </Badge>
                </div>
                <Select value="pop1">
                  <SelectTrigger disabled>
                    <SelectValue
                      placeholder={config?.pop1?.name || "Target Population"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pop1">
                      {config?.pop1?.name || "Target Population"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {config?.genotype_config?.file_type === "multi_chromosome" && (
              <div className="mt-6 space-y-3">
                <Label className="text-sm">Chromosomes</Label>
                <ChromosomeMultiSelect
                  value={config?.genotype_config?.chrom || []}
                  onChange={(next) => updateGenotypeConfig({ chrom: next })}
                />
                <p className="text-xs text-muted-foreground">
                  Select one or more chromosomes to process. Leave empty to
                  process all.
                </p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label className="text-sm">File Patterns (bed)</Label>
                <Input
                  value={config?.genotype_config?.file_patterns?.bed ?? ""}
                  onChange={(event) =>
                    updateGenotypeConfig({
                      file_patterns: { bed: event.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm">File Patterns (bim)</Label>
                <Input
                  value={config?.genotype_config?.file_patterns?.bim ?? ""}
                  onChange={(event) =>
                    updateGenotypeConfig({
                      file_patterns: { bim: event.target.value },
                    })
                  }
                />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label className="text-sm">File Patterns (fam)</Label>
                <Input
                  value={config?.genotype_config?.file_patterns?.fam ?? ""}
                  onChange={(event) =>
                    updateGenotypeConfig({
                      file_patterns: { fam: event.target.value },
                    })
                  }
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Preprocessing Options */}
        <Collapsible
          open={expandedSections.includes("preprocessing")}
          onOpenChange={() => toggleSection("preprocessing")}
        >
          <CollapsibleTrigger asChild>
            <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
              <div>
                <h4 className="font-medium">Preprocessing Options</h4>
                <p className="text-sm text-muted-foreground">
                  Adjust preprocessing behavior for SDPRX
                </p>
              </div>
              {expandedSections.includes("preprocessing") ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  checked={Boolean(config?.options?.skip_missing_columns)}
                  onCheckedChange={(checked) =>
                    updateOptions({ skip_missing_columns: Boolean(checked) })
                  }
                />
                <span>
                  Skip missing columns
                  <span className="block text-xs text-muted-foreground">
                    Ignore rows where required columns are missing
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  checked={Boolean(config?.options?.overwrite_existing)}
                  onCheckedChange={(checked) =>
                    updateOptions({ overwrite_existing: Boolean(checked) })
                  }
                />
                <span>
                  Overwrite existing outputs
                  <span className="block text-xs text-muted-foreground">
                    Allow replacing previously generated files during
                    preprocessing
                  </span>
                </span>
              </label>
              {config?.sumstats_file_type === "multi_chromosome" && (
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={Boolean(config?.options?.sumstats_strict_single)}
                    onCheckedChange={(checked) =>
                      updateOptions({ sumstats_strict_single: Boolean(checked) })
                    }
                  />
                  <span>
                    Enforce one sumstats file per chromosome
                    <span className="block text-xs text-muted-foreground">
                      Sets strictness for sumstats files. If multiple files exist
                      for the same chromosome, the pipeline fails when enabled;
                      when disabled, one file is auto-selected and the selection
                      criteria is logged.
                    </span>
                  </span>
                </label>
              )}
              {/* Removed evaluation-type info note per request */}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Processing Configuration */}
        <Collapsible
          open={expandedSections.includes("processing")}
          onOpenChange={() => toggleSection("processing")}
        >
          <CollapsibleTrigger asChild>
            <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
              <div>
                <h4 className="font-medium">Processing Configuration</h4>
                <p className="text-sm text-muted-foreground">
                  Set runtime parameters for SDPRX scoring
                </p>
              </div>
              {expandedSections.includes("processing") ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed p-3">
                <p className="text-xs text-muted-foreground">
                  Evaluation type is currently set to
                  <span className="ml-1 font-medium capitalize">
                    {evaluationType}
                  </span>
                  .
                </p>
                {!allowBinaryTraits && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enable binary evaluation to configure binary processing.
                  </p>
                )}
                {!allowQuantitativeTraits && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enable quantitative evaluation to configure quantitative
                    processing.
                  </p>
                )}
              </div>
              <Tabs
                defaultValue={allowBinaryTraits ? "binary" : "quantitative"}
                className="w-full"
              >
                <TabsList>
                  <TabsTrigger value="binary" disabled={!allowBinaryTraits}>
                    Binary
                  </TabsTrigger>
                  <TabsTrigger
                    value="quantitative"
                    disabled={!allowQuantitativeTraits}
                  >
                    Quantitative
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="binary">
                  {renderProcessingMode("binary")}
                </TabsContent>
                <TabsContent value="quantitative">
                  {renderProcessingMode("quantitative")}
                </TabsContent>
              </Tabs>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
