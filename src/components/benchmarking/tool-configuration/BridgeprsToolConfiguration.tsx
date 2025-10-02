"use client"

import React, { useCallback, useMemo, useState } from "react"
import axios from "axios"
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

interface BridgeprsToolConfigurationProps {
  toolId: string
  config: BridgeprsPreProcessingConfig
  jobId: string | null
  onConfigChange: (nextConfig: BridgeprsPreProcessingConfig) => void
  stepBadge?: React.ReactNode
  evaluationType: EvaluationType
  processingConfig: BridgeprsProcessingState
  onProcessingChange: (
    updater: (
      state: BridgeprsProcessingState
    ) => BridgeprsProcessingState
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
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLines, setPreviewLines] = useState<string[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [expanded, setExpanded] = useState(true)
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
    CHR: ["CHR", "CHROM", "CHROMOSOME"],
    ID: ["ID", "SNP", "RSID"],
    PS: ["PS", "POSTERIOR", "POSTERIOR_SCORE"],
    A1: ["A1", "ALT", "ALLELE1"],
    REF: ["REF", "A2", "REF_ALLELE", "ALLELE2"],
    BETA: ["BETA", "B", "EFFECT", "LOG_ODDS", "EFFECT_SIZE"],
    SE: ["SE", "STDERR", "STANDARD_ERROR"],
    P: ["P", "PVAL", "PVALUE", "P_VALUE"],
    N: ["N", "SAMPLES", "N_SAMPLES"],
  }

  type ProcessingModeKey = keyof BridgeprsProcessingState

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

  const ProcessingEditor = () => {
    const tabs: ProcessingModeKey[] = []
    if (allowBinaryTraits) tabs.push("binary")
    if (allowQuantitativeTraits) tabs.push("quantitative")

    const renderMode = (mode: ProcessingModeKey) => {
      const state = processingConfig[mode]
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${toolId}-${mode}-phenotype`}>Phenotype name</Label>
            <Input
              id={`${toolId}-${mode}-phenotype`}
              value={state.bridgeprs_phenotype}
              placeholder="e.g. BMI or case_control"
              onChange={(e) =>
                updateProcessingMode(mode, (prev) => ({
                  ...prev,
                  bridgeprs_phenotype: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${toolId}-${mode}-fst`}>FST</Label>
            <Input
              id={`${toolId}-${mode}-fst`}
              value={state.fst}
              placeholder="e.g. 0.12"
              onChange={(e) =>
                updateProcessingMode(mode, (prev) => ({
                  ...prev,
                  fst: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${toolId}-${mode}-n-eur`}>Sumstats size (EUR)</Label>
            <Input
              id={`${toolId}-${mode}-n-eur`}
              value={state.sumstats_size_EUR}
              placeholder="e.g. 100000"
              onChange={(e) =>
                updateProcessingMode(mode, (prev) => ({
                  ...prev,
                  sumstats_size_EUR: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${toolId}-${mode}-n-afr`}>Sumstats size (AFR)</Label>
            <Input
              id={`${toolId}-${mode}-n-afr`}
              value={state.sumstats_size_AFR}
              placeholder="e.g. 50000"
              onChange={(e) =>
                updateProcessingMode(mode, (prev) => ({
                  ...prev,
                  sumstats_size_AFR: e.target.value,
                }))
              }
            />
          </div>
        </div>
      )
    }

    if (tabs.length === 0) return null

    const defaultValue = tabs[0]
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Processing Options</CardTitle>
          <CardDescription>
            Set phenotype and study parameters for BridgePRS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultValue} className="w-full">
            <TabsList>
              {tabs.includes("binary") && (
                <TabsTrigger value="binary">Binary</TabsTrigger>
              )}
              {tabs.includes("quantitative") && (
                <TabsTrigger value="quantitative">Quantitative</TabsTrigger>
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
        </CardContent>
      </Card>
    )
  }

  const getAvailableOptions = (field: BridgeprsColumnKey) => {
    const selected = new Set(Object.values(config.column_mappings || {}))
    const options = headers.filter((h) => !selected.has(h))
    const mapped = config.column_mappings?.[field]
    // Always include the currently mapped option at the front
    return mapped ? [mapped, ...options.filter((o) => o !== mapped)] : options
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
      const url = getBenchmarkPreviewUrl(jobId, config.pop1.sumstats_path)
      const response = await axios.get(url)
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
          const aliases = COLUMN_ALIASES[field] || []
          const match = hdrs.find((header) => {
            if (used.has(header)) return false
            return aliases.some(
              (alias) => header.toLowerCase() === alias.toLowerCase()
            )
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
        const response = await axios.get(url)
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
                  <div className="text-sm text-muted-foreground">
                    Target: {targetLabel}
                  </div>
                  <Button
                    variant="ghost"
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
                </div>

                {previewError && (
                  <div className="text-sm text-destructive">{previewError}</div>
                )}

                {config?.pop1?.sumstats_path && (
                  <div className="text-xs text-muted-foreground">
                    File: {config.pop1.sumstats_path}
                  </div>
                )}

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
                            {(previewLines[0] || "").split("\t").map((h, i) => (
                              <th
                                key={`h-${i}`}
                                className="whitespace-nowrap px-2 py-1 text-left font-medium"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewLines.slice(1, 6).map((line, rowIndex) => (
                            <tr key={`r-${rowIndex}`} className="border-b">
                              {line.split("\t").map((cell, cellIndex) => (
                                <td
                                  key={`c-${cellIndex}`}
                                  className="whitespace-nowrap px-2 py-1"
                                >
                                  {cell}
                                </td>
                              ))}
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
                            <p className="text-xs text-muted-foreground">
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
                  <Label className="text-sm">File Type</Label>
                  <Select
                    value={config.genotype_config.file_type}
                    onValueChange={(value) =>
                      updateGenotypeConfig({
                        file_type:
                          value as BridgeprsPreProcessingConfig["genotype_config"]["file_type"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select file type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="merged">
                        Merged (bed, bim, fam)
                      </SelectItem>
                      <SelectItem value="split_by_chromosome">
                        Split by Chromosome (bed, bim, fam)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm">Population Reference</Label>
                  <Select
                    value={config.genotype_config.population_reference}
                    onValueChange={(value) =>
                      updateGenotypeConfig({
                        population_reference:
                          value as BridgeprsPreProcessingConfig["genotype_config"]["population_reference"],
                      })
                    }
                  >
                    <SelectTrigger>
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
                <label className="flex items-start gap-3 text-xs text-muted-foreground md:col-span-2">
                  <Info className="mt-0.5 h-4 w-4" />
                  Evaluation type is managed globally on this step; options here
                  control BridgePRS preprocessing behaviour only.
                </label>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  )
}
