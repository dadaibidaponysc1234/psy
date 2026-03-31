"use client"

import React, { useCallback, useMemo, useState, useEffect } from "react"
import benchmarkApi from "@/lib/benchmark-api"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getBenchmarkPreviewUrl } from "@/lib/config"
import { Eye, Loader2, ChevronDown, ChevronRight, Info } from "lucide-react"
import { toast } from "react-hot-toast"
import type {
  BridgeprsPreProcessingConfig,
  EvaluationType,
  BridgeprsColumnKey,
  BridgeprsProcessingState,
} from "./types"
import { COMMON_COLUMN_ALIASES, aliasMatches } from "./column-aliases"

interface BridgeprsToolConfigurationProps {
  toolId: string
  config: BridgeprsPreProcessingConfig
  jobId: string | null
  onConfigChange: (nextConfig: BridgeprsPreProcessingConfig) => void
  stepBadge?: React.ReactNode
  evaluationType: EvaluationType
  processingConfig: BridgeprsProcessingState
  onProcessingChange: (
    updater: (state: BridgeprsProcessingState) => BridgeprsProcessingState
  ) => void
}

export function BridgeprsToolConfiguration({
  toolId,
  config,
  jobId,
  onConfigChange,
  stepBadge,
  evaluationType,
  processingConfig,
  onProcessingChange,
}: BridgeprsToolConfigurationProps) {
  const targetLabel = config?.pop1?.name || "Target Population"
  const baseLabel = config?.pop2?.name || "Base Population"
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLines, setPreviewLines] = useState<string[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [expanded, setExpanded] = useState(true)
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [phenotypeHeaders, setPhenotypeHeaders] = useState<{
    pop1: string[]
    pop2: string[]
  }>({ pop1: [], pop2: [] })
  const [loadingPhenotypes, setLoadingPhenotypes] = useState<{
    pop1: boolean
    pop2: boolean
  }>({ pop1: false, pop2: false })
  const [phenotypeErrors, setPhenotypeErrors] = useState<{
    pop1?: string | null
    pop2?: string | null
  }>({})
  const allowBinaryTraits = useMemo(
    () => evaluationType === "binary" || evaluationType === "both",
    [evaluationType]
  )
  const allowQuantitativeTraits = useMemo(
    () => evaluationType === "quantitative" || evaluationType === "both",
    [evaluationType]
  )
  const REQUIRED_COLUMNS: BridgeprsColumnKey[] = [
    "CHR",
    "ID",
    "PS",
    "A1",
    "REF",
    "BETA",
    "SE",
    "P",
    "N",
  ]

  const COLUMN_ALIASES: Record<BridgeprsColumnKey, string[]> = {
    CHR: COMMON_COLUMN_ALIASES.CHR,
    ID: COMMON_COLUMN_ALIASES.SNP, // BridgePRS uses ID, map to SNP aliases
    PS: COMMON_COLUMN_ALIASES.PS,
    A1: COMMON_COLUMN_ALIASES.A1,
    REF: COMMON_COLUMN_ALIASES.REF,
    BETA: COMMON_COLUMN_ALIASES.BETA,
    SE: COMMON_COLUMN_ALIASES.SE,
    P: COMMON_COLUMN_ALIASES.P,
    N: COMMON_COLUMN_ALIASES.N,
  }

  type ProcessingModeKey = keyof BridgeprsProcessingState

  // Hoist active processing tab to parent to avoid remount-induced resets
  const initialProcessingTab: ProcessingModeKey = allowBinaryTraits
    ? "binary"
    : "quantitative"
  const [processingActiveTab, setProcessingActiveTab] =
    useState<ProcessingModeKey>(initialProcessingTab)
  useEffect(() => {
    const tabs: ProcessingModeKey[] = []
    if (allowBinaryTraits) tabs.push("binary")
    if (allowQuantitativeTraits) tabs.push("quantitative")
    if (!tabs.includes(processingActiveTab)) {
      setProcessingActiveTab(tabs[0] ?? "binary")
    }
  }, [allowBinaryTraits, allowQuantitativeTraits, processingActiveTab])

  const updatePopPath = (
    pop: "pop1" | "pop2",
    field:
      | "sumstats_path"
      | "phenotype_path"
      | "genotype_path"
      | "covariate_path",
    value: string
  ) => {
    onConfigChange({
      ...config,
      [pop]: {
        ...config[pop],
        [field]: value,
      },
    })
  }

  // Clear sumstats preview when target path changes
  useEffect(() => {
    setPreviewLines([])
    setHeaders([])
    setPreviewError(null)
  }, [config?.pop1?.sumstats_path])

  // Clear phenotype headers when any phenotype path changes
  useEffect(() => {
    setPhenotypeHeaders({ pop1: [], pop2: [] })
    setPhenotypeErrors({})
  }, [config?.pop1?.phenotype_path, config?.pop2?.phenotype_path])

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }, [])

  const setSectionOpen = useCallback((key: string, open: boolean) => {
    setExpandedSections((prev) => {
      if (open) {
        return prev.includes(key) ? prev : [...prev, key]
      }
      return prev.filter((k) => k !== key)
    })
  }, [])

  const updateProcessingMode = useCallback(
    (
      mode: ProcessingModeKey,
      updater: (
        state: BridgeprsProcessingState[ProcessingModeKey]
      ) => BridgeprsProcessingState[ProcessingModeKey]
    ) => {
      onProcessingChange((current) => ({
        ...current,
        [mode]: updater(current[mode]),
      }))
    },
    [onProcessingChange]
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

  const updateColumnMapping = (field: BridgeprsColumnKey, header: string) => {
    onConfigChange({
      ...config,
      column_mappings: {
        ...config.column_mappings,
        [field]: header,
      },
    })
  }

  const removeColumnMapping = (field: BridgeprsColumnKey) => {
    const next = { ...config.column_mappings }
    delete next[field]
    onConfigChange({
      ...config,
      column_mappings: next,
    })
  }

  const renderProcessingSection = () => {
    const tabs: ProcessingModeKey[] = []
    if (allowBinaryTraits) tabs.push("binary")
    if (allowQuantitativeTraits) tabs.push("quantitative")

    const renderMode = (mode: ProcessingModeKey) => {
      const state = processingConfig[mode]
      const traitOptions = traitOptionsForMode(mode)
      const isBinary = mode === "binary"
      const isMerged = config?.genotype_config?.file_type === "merged"
      const basenameRequired =
        isMerged &&
        !(state.bridgeprs_genotype_file && state.bridgeprs_genotype_file.trim())
      return (
        <div className="space-y-4">
          <div className="rounded-md border p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {isBinary ? "Binary" : "Quantitative"} Mode
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${toolId}-${mode}-fst`}>FST</Label>
                <Input
                  id={`${toolId}-${mode}-fst`}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  max={1}
                  value={state.fst}
                  placeholder="0.1"
                  onChange={(e) =>
                    updateProcessingMode(mode, (prev) => {
                      const raw = e.target.value
                      // Allow only digits and a single decimal point
                      let filtered = raw.replace(/[^\d.]/g, "")
                      const dotIndex = filtered.indexOf(".")
                      if (dotIndex !== -1) {
                        filtered =
                          filtered.slice(0, dotIndex + 1) +
                          filtered.slice(dotIndex + 1).replace(/\./g, "")
                      }
                      return {
                        ...prev,
                        fst: filtered,
                      }
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${toolId}-${mode}-n-base`}>
                  {`Sumstats size (${baseLabel})`}
                </Label>
                <Input
                  id={`${toolId}-${mode}-n-base`}
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={0}
                  value={state.sumstats_size_EUR}
                  placeholder="e.g. 100000"
                  onChange={(e) =>
                    updateProcessingMode(mode, (prev) => ({
                      ...prev,
                      sumstats_size_EUR: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${toolId}-${mode}-n-target`}>
                  {`Sumstats size (${targetLabel})`}
                </Label>
                <Input
                  id={`${toolId}-${mode}-n-target`}
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={0}
                  value={state.sumstats_size_AFR}
                  placeholder="e.g. 50000"
                  onChange={(e) =>
                    updateProcessingMode(mode, (prev) => ({
                      ...prev,
                      sumstats_size_AFR: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                />
              </div>
            </div>
            {isMerged && (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${toolId}-${mode}-bridgeprs-geno-prefix`}>
                    Genotype Prefix (basename)
                  </Label>
                  <Input
                    id={`${toolId}-${mode}-bridgeprs-geno-prefix`}
                    value={state.bridgeprs_genotype_file || ""}
                    placeholder={"e.g. geno or mygenoset"}
                    required
                    aria-invalid={basenameRequired}
                    onChange={(e) =>
                      updateProcessingMode(mode, (prev) => {
                        const raw = e.target.value || ""
                        const basename =
                          raw
                            .replace(/\\+/g, "/")
                            .split("/")
                            .filter(Boolean)
                            .pop() || ""
                        return {
                          ...prev,
                          bridgeprs_genotype_file: basename,
                        }
                      })
                    }
                  />
                  {basenameRequired && (
                    <p className="text-xs text-red-500">
                      Genotype prefix is required.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter basename (no path) or prefix of the geno files. If a
                    path is pasted, only the last segment is used.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase">Phenotype Column</Label>
            {traitOptions.length > 0 ? (
              <Select
                value={state.bridgeprs_phenotype || undefined}
                onValueChange={(value) =>
                  updateProcessingMode(mode, (prev) => ({
                    ...prev,
                    bridgeprs_phenotype: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={`Select ${isBinary ? "binary" : "quantitative"} trait`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {traitOptions.map((trait) => (
                    <SelectItem key={`${mode}-${trait}`} value={trait}>
                      {trait}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground">
                No {isBinary ? "binary" : "quantitative"} traits configured for{" "}
                {targetLabel}. Update the phenotype configuration to continue.
              </p>
            )}
          </div>
        </div>
      )
    }

    if (tabs.length === 0) return null
    // Active tab is controlled by parent state to prevent reset on re-render

    return (
      <Collapsible
        open={expandedSections.includes("processing")}
        onOpenChange={(open) => setSectionOpen("processing", open)}
      >
        <CollapsibleTrigger asChild>
          <div className="mt-6 flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <div>
              <h4 className="font-medium">Processing Configuration</h4>
              <p className="text-sm text-muted-foreground">
                Set runtime parameters for BridgePRS scoring
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
              value={processingActiveTab}
              onValueChange={(v) =>
                setProcessingActiveTab(v as ProcessingModeKey)
              }
              className="w-full"
            >
              <TabsList>
                {tabs.includes("binary") && (
                  <TabsTrigger value="binary" disabled={!allowBinaryTraits}>
                    Binary
                  </TabsTrigger>
                )}
                {tabs.includes("quantitative") && (
                  <TabsTrigger
                    value="quantitative"
                    disabled={!allowQuantitativeTraits}
                  >
                    Quantitative
                  </TabsTrigger>
                )}
              </TabsList>
              {tabs.includes("binary") && (
                <TabsContent value="binary">{renderMode("binary")}</TabsContent>
              )}
              {tabs.includes("quantitative") && (
                <TabsContent value="quantitative">
                  {renderMode("quantitative")}
                </TabsContent>
              )}
            </Tabs>
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  const getAvailableOptions = (field: BridgeprsColumnKey) => {
    const selected = new Set(Object.values(config.column_mappings || {}))
    const mapped = config.column_mappings?.[field]
    const aliasSource = COLUMN_ALIASES[field] || []

    // Manual fallback: if no headers loaded and there was a preview error, use aliases
    if (headers.length === 0 && previewError) {
      return mapped && !aliasSource.includes(mapped)
        ? [mapped, ...aliasSource]
        : aliasSource
    }

    // With preview headers, allow any header from preview (exclude already used)
    const options = headers.filter((h) => {
      const isCurrent = mapped === h
      if (isCurrent) return true
      return !selected.has(h)
    })
    return mapped && !options.includes(mapped) ? [mapped, ...options] : options
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
    setIsLoadingPreview(true)
    setPreviewError(null)
    try {
      const sumstatsType = config.sumstats_file_type || "merged"
      const url = getBenchmarkPreviewUrl(jobId, config.pop1.sumstats_path, {
        randomPick: sumstatsType === "multi_chromosome",
      })
      // Log request URL and the response payload for visibility
      console.log("[BridgePRS Preview] GET:", url)
      const response = await benchmarkApi.get(url)
      console.log("[BridgePRS Preview] Response:", response?.data)
      const lines: string[] = response?.data?.preview_lines || []
      setPreviewLines(lines)
      const first = (lines?.[0] || "").trim()
      const hdrs = first
        ? first.split("\t").length > 1
          ? first.split("\t").map((h: string) => h.trim())
          : first.split(/\s+/).map((h: string) => h.trim())
        : []
      setHeaders(hdrs)

      // Auto-map based on aliases (Target-only)
      if (hdrs.length > 0) {
        const autoMappings: Partial<Record<BridgeprsColumnKey, string>> = {}
        const used = new Set<string>()
        REQUIRED_COLUMNS.forEach((field) => {
          const match = hdrs.find((header) => {
            if (used.has(header)) return false
            return aliasMatches(field, header)
          })
          if (match) {
            autoMappings[field] = match
            used.add(match)
          }
        })
        if (Object.keys(autoMappings).length > 0) {
          onConfigChange({
            ...config,
            column_mappings: {
              ...config.column_mappings,
              ...autoMappings,
            },
          })
          toast.success("Auto-mapped BridgePRS columns from Target headers")
        } else {
          toast.success("Preview loaded: no auto-mapping candidates found")
        }
      }
    } catch (e) {
      console.error("Failed to fetch preview", e)
      setPreviewError("Failed to load file preview")
      toast.error("Failed to load preview. Check jobId and file path.")
    } finally {
      setIsLoadingPreview(false)
    }
  }, [jobId, config?.pop1?.sumstats_path, isLoadingPreview])

  const fetchPhenotypePreview = useCallback(
    async (population: "pop1" | "pop2") => {
      if (!jobId) return

      const filePath =
        population === "pop1"
          ? config?.pop1?.phenotype_path
          : config?.pop2?.phenotype_path
      if (!filePath) return

      setLoadingPhenotypes((prev) => ({ ...prev, [population]: true }))
      setPhenotypeErrors((prev) => ({ ...prev, [population]: null }))

      try {
        const url = getBenchmarkPreviewUrl(jobId, filePath)
        const response = await benchmarkApi.get(url)
        const first = (response.data.preview_lines?.[0] || "").trim()
        const headers = first
          ? first.split("\t").length > 1
            ? first.split("\t").map((h: string) => h.trim())
            : first.split(/\s+/).map((h: string) => h.trim())
          : []
        setPhenotypeHeaders((prev) => ({ ...prev, [population]: headers }))
      } catch (error) {
        console.error("Failed to fetch phenotype preview", error)
        setPhenotypeErrors((prev) => ({
          ...prev,
          [population]: "Failed to load phenotype preview",
        }))
      } finally {
        setLoadingPhenotypes((prev) => ({ ...prev, [population]: false }))
      }
    },
    [jobId, config?.pop1?.phenotype_path, config?.pop2?.phenotype_path]
  )

  const updateGenotypeConfig = (
    partial: Partial<BridgeprsPreProcessingConfig["genotype_config"]>
  ) => {
    const next: BridgeprsPreProcessingConfig["genotype_config"] = {
      ...config.genotype_config,
      ...partial,
      file_patterns: {
        ...config.genotype_config.file_patterns,
        ...(partial.file_patterns ?? {}),
      },
    }
    onConfigChange({ ...config, genotype_config: next })
  }

  const updateOptions = (
    partial: Partial<BridgeprsPreProcessingConfig["options"]>
  ) => {
    const next = {
      ...config.options,
      ...partial,
    }
    onConfigChange({ ...config, options: next })
  }

  const toggleTrait = (
    population: "pop1" | "pop2",
    traitType: "binary_traits" | "quantitative_traits",
    header: string,
    checked: boolean | string
  ) => {
    const currentTraits =
      traitType === "binary_traits"
        ? config.phenotype_config[population].binary_traits
        : config.phenotype_config[population].quantitative_traits

    const exists = currentTraits.includes(header)
    let nextTraits = currentTraits
    const isChecked = checked === true || checked === "true"

    if (isChecked && !exists) {
      nextTraits = [...currentTraits, header]
    } else if (!isChecked && exists) {
      nextTraits = currentTraits.filter((h) => h !== header)
    }

    const nextConfig: BridgeprsPreProcessingConfig = {
      ...config,
      phenotype_config: {
        ...config.phenotype_config,
        [population]: {
          ...config.phenotype_config[population],
          [traitType]: nextTraits,
        },
      },
    }

    onConfigChange(nextConfig)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>BridgePRS Configuration</CardTitle>
              <CardDescription>
                Configure column mappings, phenotype settings, and processing
                options for BridgePRS
              </CardDescription>
            </div>
            <div>{stepBadge}</div>
          </div>
        </CardHeader>
        <CardContent>
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div>
                  <h4 className="font-medium">Column Mapping (Target)</h4>
                  <p className="text-sm text-muted-foreground">
                    Map your Target sumstats columns to BridgePRS fields
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
                        preview selects a random file. Ensure headers are
                        uniform across files; if they differ, reload preview or
                        map using a representative file.
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
                  <div className="text-sm text-destructive">{previewError}</div>
                )}

                {previewError && (
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                    Preview failed. Manual mapping is enabled below; choices are
                    limited to known aliases per required column.
                  </p>
                )}

                {previewLines.length > 0 && (
                  <div className="rounded-lg border shadow-sm">
                    <div className="flex items-center justify-between gap-2 border-b p-2 text-sm">
                      <div className="min-w-0 truncate font-medium">
                        {config.pop1.sumstats_path.split("/").pop() ||
                          config.pop1.sumstats_path}
                      </div>
                      <div className="flex-shrink-0 text-muted-foreground">
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
                    const mappedHeader = config.column_mappings?.[field] || ""
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
                          {/* Clear button removed per request */}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <div className="mt-6 flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div>
                  <h4 className="font-medium">Phenotype Configuration</h4>
                  <p className="text-sm text-muted-foreground">
                    Preview phenotype headers and select traits for each
                    population
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

                {(phenotypeErrors.pop1 || phenotypeErrors.pop2) && (
                  <div className="text-sm text-red-600">
                    {phenotypeErrors.pop1 && <p>{phenotypeErrors.pop1}</p>}
                    {phenotypeErrors.pop2 && <p>{phenotypeErrors.pop2}</p>}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {["pop1", "pop2"].map((population) => {
                    const headers =
                      phenotypeHeaders[population as "pop1" | "pop2"]
                    const traits =
                      config.phenotype_config[population as "pop1" | "pop2"]
                    const hasPhenotypeFile = Boolean(
                      population === "pop1"
                        ? config.pop1.phenotype_path
                        : config.pop2.phenotype_path
                    )
                    const loading =
                      loadingPhenotypes[population as "pop1" | "pop2"]

                    return (
                      <div key={population} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">
                              {population === "pop1"
                                ? config.pop1.name || "Population 1"
                                : config.pop2.name || "Population 2"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {population === "pop1"
                                ? config.pop1.phenotype_path ||
                                  "No phenotype file mapped"
                                : config.pop2.phenotype_path ||
                                  "No phenotype file mapped"}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              fetchPhenotypePreview(
                                population as "pop1" | "pop2"
                              )
                            }
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
                            Provide a phenotype path in the mapping step to
                            configure traits for this population.
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
                                    key={`${population}-b-${header}`}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <Checkbox
                                      checked={traits.binary_traits.includes(
                                        header
                                      )}
                                      onCheckedChange={(checked) =>
                                        toggleTrait(
                                          population as "pop1" | "pop2",
                                          "binary_traits",
                                          header,
                                          checked
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
                                    key={`${population}-q-${header}`}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <Checkbox
                                      checked={traits.quantitative_traits.includes(
                                        header
                                      )}
                                      onCheckedChange={(checked) =>
                                        toggleTrait(
                                          population as "pop1" | "pop2",
                                          "quantitative_traits",
                                          header,
                                          checked
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
          <Collapsible>
            <CollapsibleTrigger asChild>
              <div className="mt-6 flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
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
                  <Label className="flex items-center gap-2 text-sm">
                    Population Reference
                    <Badge variant="outline">Coming soon</Badge>
                  </Label>
                  <Select
                    // Keep value bound to config; default is pop1
                    value={config.genotype_config.population_reference}
                    onValueChange={(value) =>
                      updateGenotypeConfig({
                        population_reference:
                          value as BridgeprsPreProcessingConfig["genotype_config"]["population_reference"],
                      })
                    }
                  >
                    <SelectTrigger
                      disabled
                      aria-disabled
                      className="cursor-not-allowed opacity-80"
                    >
                      <SelectValue placeholder="Select population" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pop1">
                        {config.pop1.name || "Target Population"}
                      </SelectItem>
                      <SelectItem value="pop2">
                        {config.pop2.name || "Base Population"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {/* <p className="text-xs text-muted-foreground">Defaults to target population; editing disabled for now.</p> */}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label className="text-sm">File Patterns (bed)</Label>
                  <Input
                    value={config.genotype_config.file_patterns.bed}
                    onChange={(event) =>
                      updateGenotypeConfig({
                        file_patterns: {
                          ...config.genotype_config.file_patterns,
                          bed: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm">File Patterns (bim)</Label>
                  <Input
                    value={config.genotype_config.file_patterns.bim}
                    onChange={(event) =>
                      updateGenotypeConfig({
                        file_patterns: {
                          ...config.genotype_config.file_patterns,
                          bim: event.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label className="text-sm">File Patterns (fam)</Label>
                  <Input
                    value={config.genotype_config.file_patterns.fam}
                    onChange={(event) =>
                      updateGenotypeConfig({
                        file_patterns: {
                          ...config.genotype_config.file_patterns,
                          fam: event.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <div className="mt-6 flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div>
                  <h4 className="font-medium">Preprocessing Options</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure preprocessing behaviour for BridgePRS
                  </p>
                </div>
                <ChevronRight className="h-4 w-4" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={config.options.skip_missing_columns}
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
                    checked={config.options.overwrite_existing}
                    onCheckedChange={(checked) =>
                      updateOptions({ overwrite_existing: Boolean(checked) })
                    }
                  />
                  <span>
                    Overwrite existing outputs
                    <span className="block text-xs text-muted-foreground">
                      Replace previously generated preprocessing outputs
                    </span>
                  </span>
                </label>
                {config?.sumstats_file_type === "multi_chromosome" && (
                  <label className="flex items-start gap-3 text-sm">
                    <Checkbox
                      checked={Boolean(config.options.sumstats_strict_single)}
                      onCheckedChange={(checked) =>
                        updateOptions({
                          sumstats_strict_single: Boolean(checked),
                        })
                      }
                    />
                    <span>
                      Enforce one sumstats file per chromosome
                      <span className="block text-xs text-muted-foreground">
                        Sets strictness for sumstats files. If multiple files
                        exist for the same chromosome, the pipeline fails when
                        enabled; when disabled, one file is auto-selected and
                        the selection criteria is logged.
                      </span>
                    </span>
                  </label>
                )}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fixed-n">
                    Fixed N (override sample size)
                  </Label>
                  <Input
                    id="fixed-n"
                    type="number"
                    min={0}
                    value={
                      typeof config.fixed_N === "number"
                        ? String(config.fixed_N)
                        : ""
                    }
                    placeholder="Leave blank to infer from column N"
                    onChange={(e) => {
                      const v = e.target.value.trim()
                      const next = v === "" ? null : Number(v)
                      onConfigChange({
                        ...config,
                        fixed_N: isNaN(Number(v)) ? null : next,
                      })
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    When set, BridgePRS uses this value instead of column N.
                  </span>
                </div>
                {/* Removed evaluation-type info note per request */}
              </div>
            </CollapsibleContent>
          </Collapsible>
          {renderProcessingSection()}
        </CardContent>
      </Card>
    </div>
  )
}
