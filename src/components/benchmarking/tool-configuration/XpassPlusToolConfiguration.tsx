"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import benchmarkApi from "@/lib/benchmark-api"
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
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChromosomeMultiSelect } from "@/components/ui/chromosome-multi-select"
import { Eye, Loader2, Info, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "react-hot-toast"

import { getBenchmarkPreviewUrl } from "@/lib/config"
import type {
  EvaluationType,
  XpassColumnKey,
  XpassPreProcessingConfig,
  XpassProcessingState,
} from "./types"
import { COMMON_COLUMN_ALIASES, aliasMatches } from "./column-aliases"

interface XpassPlusToolConfigurationProps {
  toolId: string
  config: XpassPreProcessingConfig
  jobId: string | null
  onConfigChange: (nextConfig: XpassPreProcessingConfig) => void
  stepBadge?: React.ReactNode
  evaluationType: EvaluationType
  processingConfig?: XpassProcessingState
  onProcessingChange?: (
    updater: (state: XpassProcessingState) => XpassProcessingState
  ) => void
}

const REQUIRED_COLUMNS: XpassColumnKey[] = ["SNP", "A1", "A2", "N"]
const OPTIONAL_COLUMNS: XpassColumnKey[] = ["Z"]
const COLUMN_ALIASES: Record<XpassColumnKey, string[]> = {
  SNP: COMMON_COLUMN_ALIASES.SNP,
  A1: COMMON_COLUMN_ALIASES.A1,
  A2: COMMON_COLUMN_ALIASES.A2,
  N: COMMON_COLUMN_ALIASES.N,
  Z: COMMON_COLUMN_ALIASES.Z,
}

type FilePreview = {
  filename: string
  preview_lines: string[]
}

type PreviewState = {
  previews: Record<string, FilePreview | null>
  loading: Record<string, boolean>
  errors: Record<string, string | null>
}

const EMPTY_PREVIEW_STATE: PreviewState = {
  previews: {},
  loading: {},
  errors: {},
}

const DEFAULT_GENOTYPE_PATTERNS = { bed: "*.bed", bim: "*.bim", fam: "*.fam" }

export function XpassPlusToolConfiguration({
  toolId,
  config,
  jobId,
  onConfigChange,
  stepBadge,
  evaluationType,
  processingConfig,
  onProcessingChange,
}: XpassPlusToolConfigurationProps) {
  const toolLabel = "XPASS+"
  const populations = useMemo(
    () => (Array.isArray(config.populations) ? config.populations : []),
    [config.populations]
  )

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    mapping: true,
    genotype: true,
    options: true,
    processing: true,
  })

  const [activePopulation, setActivePopulation] = useState<string>(
    populations[0]?.name || ""
  )

  // Binary/Quantitative processing tabs state
  const allowBinaryTraits = evaluationType !== "quantitative"
  const allowQuantitativeTraits = evaluationType !== "binary"
  const [processingActiveTab, setProcessingActiveTab] = useState<"binary" | "quantitative">(
    allowBinaryTraits ? "binary" : "quantitative"
  )

  const [{ previews, loading, errors }, setPreviewState] =
    useState<PreviewState>(EMPTY_PREVIEW_STATE)

  const [headersByPopulation, setHeadersByPopulation] = useState<
    Record<string, string[]>
  >({})

  const sumstatsFileType = config.sumstats_file_type || "merged"
  const genotypeFileType = config.genotype_config?.file_type || "merged"
  const genotypePatterns =
    config.genotype_config?.file_patterns || DEFAULT_GENOTYPE_PATTERNS

  useEffect(() => {
    if (populations.length === 0) {
      if (activePopulation !== "") {
        setActivePopulation("")
      }
      return
    }

    if (!populations.find((population) => population.name === activePopulation)) {
      setActivePopulation(populations[0]?.name || "")
    }
  }, [populations, activePopulation])

  useEffect(() => {
    const columnMappings = config.column_mappings?.by_population || {}
    const nextMappings: Record<
      string,
      Partial<Record<XpassColumnKey, string>>
    > = {}

    populations.forEach((population) => {
      nextMappings[population.name] = {
        ...(columnMappings[population.name] || {}),
      }
    })

    if (Object.keys(nextMappings).length !== Object.keys(columnMappings).length) {
      onConfigChange({
        ...config,
        column_mappings: { by_population: nextMappings },
      })
    }
  }, [config, populations, onConfigChange])

  useEffect(() => {
    const options = config.options ?? {}
    const allowBinary = evaluationType !== "quantitative"
    const allowQuant = evaluationType !== "binary"

    if (
      options.evaluation_type !== evaluationType ||
      options.process_binary_phenotypes !== allowBinary ||
      options.process_quantitative_phenotypes !== allowQuant
    ) {
      onConfigChange({
        ...config,
        options: {
          ...options,
          evaluation_type: evaluationType,
          process_binary_phenotypes: allowBinary,
          process_quantitative_phenotypes: allowQuant,
        },
      })
    }
  }, [config, evaluationType, onConfigChange])

  const updateConfig = useCallback(
    (
      updater: (current: XpassPreProcessingConfig) => XpassPreProcessingConfig
    ) => {
      onConfigChange(updater(config))
    },
    [config, onConfigChange]
  )

  const updateOptions = useCallback(
    (next: Partial<XpassPreProcessingConfig["options"]>) => {
      updateConfig((current) => ({
        ...current,
        options: {
          ...(current.options ?? {}),
          ...next,
        },
      }))
    },
    [updateConfig]
  )

  const setColumnMapping = useCallback(
    (populationName: string, key: XpassColumnKey, value: string) => {
      updateConfig((current) => {
        const byPopulation = current.column_mappings?.by_population || {}
        const updatedPopulation = {
          ...(byPopulation[populationName] || {}),
          [key]: value,
        }

        return {
          ...current,
          column_mappings: {
            by_population: {
              ...byPopulation,
              [populationName]: updatedPopulation,
            },
          },
        }
      })
    },
    [updateConfig]
  )

  const removeColumnMapping = useCallback(
    (populationName: string, key: XpassColumnKey) => {
      updateConfig((current) => {
        const byPopulation = current.column_mappings?.by_population || {}
        const nextForPopulation = { ...(byPopulation[populationName] || {}) }
        delete nextForPopulation[key]

        return {
          ...current,
          column_mappings: {
            by_population: {
              ...byPopulation,
              [populationName]: nextForPopulation,
            },
          },
        }
      })
    },
    [updateConfig]
  )

  const updateGenotypeConfig = useCallback(
    (next: Partial<XpassPreProcessingConfig["genotype_config"]>) => {
      updateConfig((current) => ({
        ...current,
        genotype_config: {
          ...current.genotype_config,
          ...next,
          file_patterns: {
            ...DEFAULT_GENOTYPE_PATTERNS,
            ...(current.genotype_config?.file_patterns || {}),
            ...(next.file_patterns || {}),
          },
        },
      }))
    },
    [updateConfig]
  )

  // Sumstats file type is derived from mapping. No direct UI control here.

  const parseHeaders = useCallback((lines: string[]): string[] => {
    if (!Array.isArray(lines) || lines.length === 0) return []
    const first = (lines[0] || "").trim()
    if (!first) return []
    if (first.includes("\t")) {
      return first.split("\t").map((header) => header.trim())
    }
    return first.split(/\s+/).map((header) => header.trim())
  }, [])

  const updateProcessing = useCallback(
    (updater: (current: XpassProcessingState) => XpassProcessingState) => {
      if (!onProcessingChange) return
      const base: XpassProcessingState =
        processingConfig || {
          compPRS: "T",
          sd_method: "LD_block",
          compPosMean: "T",
          outputName: "xpass_plus",
          xpass_pop1: populations.find((p) => p.type === "target")?.name || "",
          output_dir: "results/prs_results/xpass+",
          log_dir: "results/log_files/xpass+",
          clump_params: {
            pop1: { kb: 1000, r2: 0.1, p: 0.05 },
            pop2: { kb: 1000, r2: 0.1, p: 0.05 },
          },
          use_pop1_snps: true,
          use_pop2_snps: true,
        }
      onProcessingChange((curr) => updater(curr || base))
    },
    [onProcessingChange, processingConfig, populations]
  )

  const fetchPreview = useCallback(
    async (populationName: string) => {
      if (!jobId) {
        toast.error("Preview unavailable – no job in progress")
        return
      }

      const population = populations.find((pop) => pop.name === populationName)
      if (!population?.sumstats_path) {
        toast.error("Provide a sumstats path before previewing")
        return
      }

      setPreviewState((prev) => ({
        previews: prev.previews,
        errors: { ...prev.errors, [populationName]: null },
        loading: { ...prev.loading, [populationName]: true },
      }))

      try {
        const url = getBenchmarkPreviewUrl(jobId, population.sumstats_path, {
          randomPick: sumstatsFileType === "multi_chromosome",
        })
        const response = await benchmarkApi.get(url)
        const preview: FilePreview = {
          filename:
            population.sumstats_path.split("/").pop() ||
            population.sumstats_path,
          preview_lines: response.data?.preview_lines || [],
        }

        const headers = parseHeaders(preview.preview_lines)
        setHeadersByPopulation((prev) => ({
          ...prev,
          [populationName]: headers,
        }))

        if (headers.length > 0) {
          const autoMappings: Partial<Record<XpassColumnKey, string>> = {}
          const used = new Set<string>()

          REQUIRED_COLUMNS.forEach((field) => {
            const match = headers.find((header) => {
              if (used.has(header)) return false
              return aliasMatches(field, header)
            })
            if (match) {
              autoMappings[field] = match
              used.add(match)
            }
          })

          if (Object.keys(autoMappings).length > 0) {
            updateConfig((current) => {
              const byPopulation = current.column_mappings?.by_population || {}
              return {
                ...current,
                column_mappings: {
                  by_population: {
                    ...byPopulation,
                    [populationName]: {
                      ...(byPopulation[populationName] || {}),
                      ...autoMappings,
                    },
                  },
                },
              }
            })
            toast.success(
              `Mapped ${Object.keys(autoMappings).length} columns for ${populationName}`
            )
          } else {
            toast.success(`Preview loaded for ${populationName}`)
          }
        } else {
          toast.success(`Preview loaded for ${populationName}`)
        }

        setPreviewState((prev) => ({
          previews: { ...prev.previews, [populationName]: preview },
          errors: prev.errors,
          loading: { ...prev.loading, [populationName]: false },
        }))
      } catch (error) {
        console.error("[XPASS+] Failed to fetch preview", error)
        setPreviewState((prev) => ({
          previews: { ...prev.previews, [populationName]: null },
          errors: {
            ...prev.errors,
            [populationName]: "Failed to load preview. Check path and try again.",
          },
          loading: { ...prev.loading, [populationName]: false },
        }))
        toast.error("Failed to load preview. Check logs for details.")
      }
    }, [jobId, populations, sumstatsFileType, parseHeaders, updateConfig])

  const getAvailableHeaders = useCallback(
    (populationName: string, currentField: XpassColumnKey) => {
      const headers = headersByPopulation[populationName] || []
      const mappings =
        config.column_mappings?.by_population?.[populationName] || {}
      const mappedValues = Object.entries(mappings)
        .filter(([key]) => key !== currentField)
        .map(([, value]) => value)

      const current = mappings[currentField]
      const error = errors[populationName]
      const aliasSource = COLUMN_ALIASES[currentField] || []

      // Manual fallback: if no headers are loaded and there was a preview error, use aliases
      if ((!headers || headers.length === 0) && error) {
        return current && !aliasSource.includes(current)
          ? [current, ...aliasSource]
          : aliasSource
      }

      const filtered = headers.filter((header) => {
        if (!header) return false
        if (current === header) return true
        return !mappedValues.includes(header)
      })

      return current && !filtered.includes(current)
        ? [current, ...filtered]
        : filtered
    },
    [config.column_mappings?.by_population, headersByPopulation, errors]
  )

  const toggleSection = useCallback(
    (section: keyof typeof expandedSections) => {
      setExpandedSections((prev) => ({
        ...prev,
        [section]: !prev[section],
      }))
    },
    []
  )

  const hasPopulations = populations.length > 0
  const isMultiChromSumstats = sumstatsFileType === "multi_chromosome"
  const isMultiChromGenotype = genotypeFileType === "multi_chromosome"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {toolLabel} Configuration
          {stepBadge}
        </CardTitle>
        <CardDescription>
          Map summary statistics, configure genotype handling, and adjust
          preprocessing options for {toolLabel}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Collapsible
          open={expandedSections.mapping}
          onOpenChange={() => toggleSection("mapping")}
        >
          <CollapsibleTrigger asChild>
            <div className="flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 transition-colors hover:bg-muted/50">
              <div>
                <h4 className="font-medium">Column Mapping</h4>
                <p className="text-sm text-muted-foreground">
                  Map {toolLabel}-required headers for each configured population.
                </p>
              </div>
              {expandedSections.mapping ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            {/* Sumstats file type is determined during mapping; preview will adapt automatically. */}

            {!hasPopulations ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No populations are configured yet. Return to the mapping step to
                add target, auxiliary, and optional validation populations.
              </div>
            ) : (
              <Tabs
                value={activePopulation}
                onValueChange={setActivePopulation}
                className="space-y-4"
              >
                <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap border-b border-border bg-transparent p-0">
                  {populations.map((population) => {
                    const isActive = activePopulation === population.name
                    const badgeClasses = isActive
                      ? "border-white bg-white text-primary"
                      : "border-orange-200 bg-orange-100 text-orange-700"

                    const typeLabel =
                      population.type === "target"
                        ? "Target"
                        : population.type === "auxiliary"
                          ? "Auxiliary"
                          : "Validation"

                    return (
                      <TabsTrigger
                        key={population.name}
                        value={population.name}
                        className="group rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-semibold transition-all duration-200 hover:bg-muted/40 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-white"
                      >
                        <span className="flex items-center gap-2">
                          {population.name}
                          {population.type && (
                            <Badge
                              variant="outline"
                              className={`hidden border text-xs sm:inline-flex ${badgeClasses}`}
                            >
                              {typeLabel}
                            </Badge>
                          )}
                        </span>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                {populations.map((population) => {
                  const mappings =
                    config.column_mappings?.by_population?.[population.name] ||
                    {}
                  const headers = headersByPopulation[population.name] || []
                  const preview = previews[population.name]
                  const error = errors[population.name]
                  const isBusy = loading[population.name]

                  return (
                    <TabsContent
                      key={population.name}
                      value={population.name}
                      className="space-y-4"
                    >
                      <div className="space-y-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">
                                Preview your sumstats file to see available
                                columns
                              </p>
                              {isMultiChromSumstats && (
                                <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                  <Info className="h-3.5 w-3.5 text-orange-500" />
                                  Multi-chromosome input: if the path is a
                                  directory, preview selects a random file.
                                  Ensure headers are uniform across files; if
                                  they differ, reload preview or map using a
                                  representative file.
                                </p>
                              )}
                              {preview && (
                                <p className="mt-1 text-xs text-green-600">
                                  ✓ Headers loaded – {headers.length} columns
                                  detected
                                </p>
                              )}
                            </div>
                            <div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchPreview(population.name)}
                                disabled={isBusy || !population.sumstats_path}
                              >
                                {isBusy ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Eye className="mr-2 h-4 w-4" />
                                )}
                                {preview ? "Reload Preview" : "Preview File"}
                              </Button>
                              {population.sumstats_path && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  File: {population.sumstats_path}
                                </div>
                              )}
                            </div>
                          </div>

                          {error && (
                            <div className="space-y-2">
                              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                                {error}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Manual mapping enabled. Options are limited to
                                known aliases per required column.
                              </p>
                            </div>
                          )}

                          {preview && preview.preview_lines.length > 0 && (
                            <div className="rounded-md border">
                              <div className="border-b bg-muted/50 p-3">
                                <h5 className="text-sm font-medium">
                                  File Preview: {preview.filename}
                                </h5>
                                <p className="text-xs text-muted-foreground">
                                  First 5 rows of the sumstats file
                                </p>
                              </div>
                              <div className="max-h-64 overflow-auto">
                                <table className="w-full text-xs">
                                  <tbody>
                                    {preview.preview_lines
                                      .slice(0, 5)
                                      .map((line, idx) => (
                                        <tr key={idx} className="border-b">
                                          {(() => {
                                            const trimmed = line.trim()
                                            const cells = trimmed.includes("\t")
                                              ? trimmed.split("\t")
                                              : trimmed.length > 0
                                                ? trimmed.split(/\s+/)
                                                : []
                                            return cells.map(
                                              (cell, cellIdx) => (
                                                <td
                                                  key={cellIdx}
                                                  className="whitespace-nowrap px-2 py-1"
                                                >
                                                  {cell}
                                                </td>
                                              )
                                            )
                                          })()}
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {[...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].map((field) => {
                              const options = getAvailableHeaders(
                                population.name,
                                field
                              )
                              const currentValue = mappings[field]
                              const isMapped = Boolean(currentValue)
                              const isRequired = REQUIRED_COLUMNS.includes(field)

                              return (
                                <div
                                  key={`${population.name}-${field}`}
                                  className="rounded-lg border p-4 shadow-sm transition-colors hover:bg-muted/40"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium">
                                        {field}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {COLUMN_ALIASES[field].join(", ")}
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
                                      isRequired ? (
                                        <Badge
                                          variant="outline"
                                          className="bg-red-50 text-red-700"
                                        >
                                          Required
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="bg-slate-50 text-slate-600"
                                        >
                                          Optional
                                        </Badge>
                                      )
                                    )}
                                  </div>

                                  <div className="mt-3 space-y-2">
                                    <Label className="text-xs">
                                      Column Header
                                    </Label>
                                    <Select
                                      value={currentValue || undefined}
                                      onValueChange={(value) => {
                                        if (value === "__remove__") {
                                          removeColumnMapping(
                                            population.name,
                                            field
                                          )
                                        } else {
                                          setColumnMapping(
                                            population.name,
                                            field,
                                            value
                                          )
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
                                            <SelectItem
                                              key={option}
                                              value={option}
                                            >
                                              <span>{option}</span>
                                            </SelectItem>
                                          ))
                                        ) : (
                                          <SelectItem
                                            value="no-options"
                                            disabled
                                          >
                                            No available columns
                                          </SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                    {!isMapped && headers.length === 0 && (
                                      <p className="text-xs text-muted-foreground">
                                        Preview the file to populate headers
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  )
                })}
              </Tabs>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Collapsible
          open={expandedSections.genotype}
          onOpenChange={() => toggleSection("genotype")}
        >
          <CollapsibleTrigger asChild>
            <div className="flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 transition-colors hover:bg-muted/50">
              <div>
                <h4 className="font-medium">Genotype Configuration</h4>
                <p className="text-sm text-muted-foreground">
                  Configure how {toolLabel} locates PLINK genotype data.
                </p>
              </div>
              {expandedSections.genotype ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 px-4 pb-4">
            {/* Genotype file layout is set during mapping. Chromosome and patterns remain editable. */}

            {isMultiChromGenotype && (
              <div className="space-y-2">
                <Label className="text-xs uppercase">Chromosomes</Label>
                <ChromosomeMultiSelect
                  value={(config.genotype_config?.chrom as number[]) || []}
                  onChange={(next) => updateGenotypeConfig({ chrom: next })}
                />
                <p className="text-xs text-muted-foreground">
                  Select one or more chromosomes to process. Leave empty to
                  process all chromosome directories.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {["bed", "bim", "fam"].map((key) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs uppercase">
                    {key.toUpperCase()} pattern
                  </Label>
                  <Input
                    value={(genotypePatterns as any)[key] || ""}
                    onChange={(event) =>
                      updateGenotypeConfig({
                        file_patterns: {
                          ...genotypePatterns,
                          [key]: event.target.value,
                        },
                      })
                    }
                    placeholder={`*.${key}`}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible
          open={expandedSections.options}
          onOpenChange={() => toggleSection("options")}
        >
          <CollapsibleTrigger asChild>
            <div className="flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 transition-colors hover:bg-muted/50">
              <div>
                <h4 className="font-medium">Preprocessing Options</h4>
                <p className="text-sm text-muted-foreground">
                  Control how {toolLabel} handles missing data and existing outputs.
                </p>
              </div>
              {expandedSections.options ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 px-4 pb-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={Boolean(config.options?.skip_missing_columns)}
                  onCheckedChange={(checked) =>
                    updateOptions({ skip_missing_columns: Boolean(checked) })
                  }
                />
                <span>
                  Skip missing columns
                  <span className="block text-xs text-muted-foreground">
                    Ignore rows that do not contain all required headers.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={Boolean(config.options?.overwrite_existing)}
                  onCheckedChange={(checked) =>
                    updateOptions({ overwrite_existing: Boolean(checked) })
                  }
                />
                <span>
                  Overwrite existing outputs
                  <span className="block text-xs text-muted-foreground">
                    Replace previously generated preprocessing artefacts.
                  </span>
                </span>
              </label>
              {isMultiChromSumstats && (
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(config.options?.sumstats_strict_single)}
                    onCheckedChange={(checked) =>
                      updateOptions({
                        sumstats_strict_single: Boolean(checked),
                      })
                    }
                  />
                  <span>
                    Enforce one sumstats file per chromosome
                    <span className="block text-xs text-muted-foreground">
                      Fail preprocessing when multiple files exist for the same
                      chromosome instead of auto-selecting one.
                    </span>
                  </span>
                </label>
              )}
            </div>
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Evaluation type is controlled globally and currently set to
              <span className="ml-1 font-medium capitalize">
                {evaluationType}
              </span>
              .
            </div>
      </CollapsibleContent>
    </Collapsible>

    {/* XPASS+ Processing Configuration */}
    <Collapsible
      open={expandedSections.processing}
      onOpenChange={() => toggleSection("processing")}
    >
      <CollapsibleTrigger asChild>
        <div className="flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 transition-colors hover:bg-muted/50">
          <div>
            <h4 className="font-medium">Processing Configuration</h4>
            <p className="text-sm text-muted-foreground">
              Configure XPASS+ scoring inputs for the selected evaluation type.
            </p>
          </div>
          {expandedSections.processing ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 px-4 pb-4">
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
              Enable quantitative evaluation to configure quantitative processing.
            </p>
          )}
        </div>

        <Tabs
          value={processingActiveTab}
          onValueChange={(v) => setProcessingActiveTab(v as "binary" | "quantitative")}
          className="w-full"
        >
          <TabsList>
            {allowBinaryTraits && (
              <TabsTrigger value="binary" disabled={!allowBinaryTraits}>
                Binary
              </TabsTrigger>
            )}
            {allowQuantitativeTraits && (
              <TabsTrigger value="quantitative" disabled={!allowQuantitativeTraits}>
                Quantitative
              </TabsTrigger>
            )}
          </TabsList>

          {/* Binary Processing Tab */}
          {allowBinaryTraits && (
            <TabsContent value="binary" />
          )}

          {/* Quantitative Processing Tab */}
          {allowQuantitativeTraits && (
            <TabsContent value="quantitative" />
          )}
        </Tabs>

        {/* Shared XPASS+ Processing Options */}
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Target population for scoring</Label>
                <Badge variant="outline" className="text-xs">Auto-detected</Badge>
              </div>
              {(() => {
                const targetPop = populations.find((p) => p.type === "target")?.name || ""
                return (
                  <Select value={targetPop}>
                    <SelectTrigger disabled aria-disabled className="cursor-not-allowed opacity-80">
                      <SelectValue placeholder="Select target population" />
                    </SelectTrigger>
                    <SelectContent>
                      {populations.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              })()}
            </div>

            <label className="mt-6 flex items-start gap-2 text-sm">
              <Checkbox
                checked={(processingConfig?.compPosMean || "T") === "T"}
                onCheckedChange={(checked) =>
                  updateProcessing((curr) => ({
                    ...curr,
                    compPosMean: Boolean(checked) ? "T" : "F",
                  }))
                }
              />
              <span>
                Compute position mean
                <span className="block text-xs text-muted-foreground">
                  Use positional mean across clumps where applicable.
                </span>
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">Clump params – Pop1</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <span className="block text-xs text-muted-foreground">Window (kb)</span>
                  <Input
                    type="number"
                    step="1"
                    value={String(processingConfig?.clump_params?.pop1?.kb ?? 1000)}
                    onChange={(e) =>
                      updateProcessing((curr) => ({
                        ...curr,
                        clump_params: {
                          pop1: {
                            kb: Number(e.target.value) || 0,
                            r2: curr.clump_params?.pop1?.r2 ?? 0.1,
                            p: curr.clump_params?.pop1?.p ?? 0.05,
                          },
                          pop2: curr.clump_params?.pop2 ?? { kb: 1000, r2: 0.1, p: 0.05 },
                        },
                      }))
                    }
                    placeholder="kb"
                  />
                </div>
                <div className="space-y-1">
                  <span className="block text-xs text-muted-foreground">LD r2</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={String(processingConfig?.clump_params?.pop1?.r2 ?? 0.1)}
                    onChange={(e) =>
                      updateProcessing((curr) => ({
                        ...curr,
                        clump_params: {
                          pop1: {
                            kb: curr.clump_params?.pop1?.kb ?? 1000,
                            r2: Number(e.target.value) || 0,
                            p: curr.clump_params?.pop1?.p ?? 0.05,
                          },
                          pop2: curr.clump_params?.pop2 ?? { kb: 1000, r2: 0.1, p: 0.05 },
                        },
                      }))
                    }
                    placeholder="r2"
                  />
                </div>
                <div className="space-y-1">
                  <span className="block text-xs text-muted-foreground">P-value</span>
                  <Input
                    type="number"
                    step="0.0001"
                    value={String(processingConfig?.clump_params?.pop1?.p ?? 0.05)}
                    onChange={(e) =>
                      updateProcessing((curr) => ({
                        ...curr,
                        clump_params: {
                          pop1: {
                            kb: curr.clump_params?.pop1?.kb ?? 1000,
                            r2: curr.clump_params?.pop1?.r2 ?? 0.1,
                            p: Number(e.target.value) || 0,
                          },
                          pop2: curr.clump_params?.pop2 ?? { kb: 1000, r2: 0.1, p: 0.05 },
                        },
                      }))
                    }
                    placeholder="p"
                  />
                </div>
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs">
                <Checkbox
                  checked={Boolean(processingConfig?.use_pop1_snps ?? true)}
                  onCheckedChange={(checked) =>
                    updateProcessing((curr) => ({
                      ...curr,
                      use_pop1_snps: Boolean(checked),
                    }))
                  }
                />
                Use Pop1 SNPs
              </label>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">Clump params – Pop2</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <span className="block text-xs text-muted-foreground">Window (kb)</span>
                  <Input
                    type="number"
                    step="1"
                    value={String(processingConfig?.clump_params?.pop2?.kb ?? 1000)}
                    onChange={(e) =>
                      updateProcessing((curr) => ({
                        ...curr,
                        clump_params: {
                          pop1: curr.clump_params?.pop1 ?? { kb: 1000, r2: 0.1, p: 0.05 },
                          pop2: {
                            kb: Number(e.target.value) || 0,
                            r2: curr.clump_params?.pop2?.r2 ?? 0.1,
                            p: curr.clump_params?.pop2?.p ?? 0.05,
                          },
                        },
                      }))
                    }
                    placeholder="kb"
                  />
                </div>
                <div className="space-y-1">
                  <span className="block text-xs text-muted-foreground">LD r2</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={String(processingConfig?.clump_params?.pop2?.r2 ?? 0.1)}
                    onChange={(e) =>
                      updateProcessing((curr) => ({
                        ...curr,
                        clump_params: {
                          pop1: curr.clump_params?.pop1 ?? { kb: 1000, r2: 0.1, p: 0.05 },
                          pop2: {
                            kb: curr.clump_params?.pop2?.kb ?? 1000,
                            r2: Number(e.target.value) || 0,
                            p: curr.clump_params?.pop2?.p ?? 0.05,
                          },
                        },
                      }))
                    }
                    placeholder="r2"
                  />
                </div>
                <div className="space-y-1">
                  <span className="block text-xs text-muted-foreground">P-value</span>
                  <Input
                    type="number"
                    step="0.0001"
                    value={String(processingConfig?.clump_params?.pop2?.p ?? 0.05)}
                    onChange={(e) =>
                      updateProcessing((curr) => ({
                        ...curr,
                        clump_params: {
                          pop1: curr.clump_params?.pop1 ?? { kb: 1000, r2: 0.1, p: 0.05 },
                          pop2: {
                            kb: curr.clump_params?.pop2?.kb ?? 1000,
                            r2: curr.clump_params?.pop2?.r2 ?? 0.1,
                            p: Number(e.target.value) || 0,
                          },
                        },
                      }))
                    }
                    placeholder="p"
                  />
                </div>
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs">
                <Checkbox
                  checked={Boolean(processingConfig?.use_pop2_snps ?? true)}
                  onCheckedChange={(checked) =>
                    updateProcessing((curr) => ({
                      ...curr,
                      use_pop2_snps: Boolean(checked),
                    }))
                  }
                />
                Use Pop2 SNPs
              </label>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>

      </CardContent>
    </Card>
  )
}
