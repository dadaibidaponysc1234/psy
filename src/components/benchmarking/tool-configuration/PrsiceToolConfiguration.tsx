"use client"

import React, { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { toast } from "react-hot-toast"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { getBenchmarkPreviewUrl } from "@/lib/config"
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Info,
  Loader2,
} from "lucide-react"

import type {
  PrsicePreProcessingConfig,
  ProcessingOptions,
  EvaluationType,
} from "./types"

const REQUIRED_COLUMNS = ["SNP", "CHR", "BP", "A1", "A2", "BETA", "P"]

const COLUMN_ALIASES: Record<string, string[]> = {
  SNP: ["SNP", "RSID", "RS", "ID", "MARKERNAME", "VARIANT_ID", "SNP_ID"],
  CHR: ["CHR", "CHROMOSOME", "#CHROM", "CHROM"],
  BP: [
    "BP",
    "POS",
    "PS",
    "POSITION",
    "BP_HG19",
    "BP_HG38",
    "CHR_POSB36",
    "BASE_PAIR_LOCATION",
  ],
  A1: ["A1", "ALLELE1", "EFFECT_ALLELE", "ALTERNATE_ALLELE", "ALT"],
  A2: [
    "A2",
    "ALLELE2",
    "ALLELE0",
    "NONEFFECT_ALLELE",
    "REFERENCE_ALLELE",
    "REF",
  ],
  BETA: [
    "BETA",
    "B",
    "EFFECT",
    "LOG_ODDS",
    "ESTIMATE",
    "EFFECT_SIZE",
  ],
  P: ["P", "PVAL", "P_VALUE", "P_DGC", "P_WALD"],
}

interface FilePreview {
  filename: string
  preview_lines: string[]
}

interface PhenotypeHeaders {
  target: string[]
  source: string[]
}

interface PrsiceToolConfigurationProps {
  toolId: string
  config: PrsicePreProcessingConfig
  jobId: string | null
  onConfigChange: (nextConfig: PrsicePreProcessingConfig) => void
  stepBadge?: React.ReactNode
  evaluationType: EvaluationType
}

export function PrsiceToolConfiguration({
  toolId,
  config,
  jobId,
  onConfigChange,
  stepBadge,
  evaluationType,
}: PrsiceToolConfigurationProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "column-mapping",
  ])
  const [preview, setPreview] = useState<FilePreview | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [phenotypeHeaders, setPhenotypeHeaders] = useState<PhenotypeHeaders>({
    target: [],
    source: [],
  })
  const [loadingPhenotypes, setLoadingPhenotypes] = useState({
    target: false,
    source: false,
  })
  const [phenotypeErrors, setPhenotypeErrors] = useState<{
    target?: string | null
    source?: string | null
  }>({})

  const allowBinaryTraits = evaluationType === "binary" || evaluationType === "both"
  const allowQuantitativeTraits =
    evaluationType === "quantitative" || evaluationType === "both"

  useEffect(() => {
    if (!config) return
    const targetPath = config?.target_population?.phenotype_path
    const sourcePath = config?.source_population?.phenotype_path

    if (!targetPath) {
      setPhenotypeHeaders((prev) => ({ ...prev, target: [] }))
    }
    if (!sourcePath) {
      setPhenotypeHeaders((prev) => ({ ...prev, source: [] }))
    }
  }, [config?.target_population?.phenotype_path, config?.source_population?.phenotype_path])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((item) => item !== section)
        : [...prev, section]
    )
  }

  const updateConfig = (
    updater: (current: PrsicePreProcessingConfig) => PrsicePreProcessingConfig
  ) => {
    onConfigChange(updater(config))
  }

  const updateOptions = (updates: Partial<ProcessingOptions>) => {
    updateConfig((current) => ({
      ...current,
      options: {
        ...current.options,
        ...updates,
      },
    }))
  }

  const updateColumnMapping = (field: string, header: string) => {
    updateConfig((current) => ({
      ...current,
      column_mappings: {
        ...current.column_mappings,
        [field]: header,
      },
    }))
  }

  const removeColumnMapping = (field: string) => {
    updateConfig((current) => {
      const { [field]: _removed, ...rest } = current.column_mappings
      return {
        ...current,
        column_mappings: rest,
      }
    })
  }

  const updatePhenotypeTraits = (
    population: "target_population" | "source_population",
    traitType: "binary_traits" | "quantitative_traits",
    values: string[]
  ) => {
    updateConfig((current) => ({
      ...current,
      phenotype_config: {
        ...current.phenotype_config,
        [population]: {
          ...current.phenotype_config[population],
          [traitType]: values,
        },
      },
    }))
  }

  const updateGenotypeConfig = (updates: Partial<PrsicePreProcessingConfig["genotype_config"]>) => {
    updateConfig((current) => ({
      ...current,
      genotype_config: {
        ...current.genotype_config,
        ...updates,
        file_patterns: {
          ...current.genotype_config.file_patterns,
          ...(updates.file_patterns || {}),
        },
      },
    }))
  }

  const fetchFilePreview = async () => {
    if (!config?.target_population?.sumstats_path || !jobId || isLoadingPreview)
      return

    setIsLoadingPreview(true)
    setPreviewError(null)

    try {
      const url = getBenchmarkPreviewUrl(
        jobId,
        config.target_population.sumstats_path
      )
      const response = await axios.get(url)
      const previewData: FilePreview = {
        filename:
          config.target_population.sumstats_path.split("/").pop() ||
          config.target_population.sumstats_path,
        preview_lines: response.data.preview_lines || [],
      }
      setPreview(previewData)

      const headers = (previewData.preview_lines?.[0] || "").split("\t")
      const autoMappings: Record<string, string> = {}
      const usedHeaders = new Set<string>()

      REQUIRED_COLUMNS.forEach((field) => {
        const aliases = COLUMN_ALIASES[field] || []
        const match = headers.find((header) => {
          if (usedHeaders.has(header)) return false
          return aliases.some((alias) => header.toLowerCase() === alias.toLowerCase())
        })

        if (match) {
          autoMappings[field] = match
          usedHeaders.add(match)
        }
      })

      if (Object.keys(autoMappings).length > 0) {
        updateConfig((current) => ({
          ...current,
          column_mappings: {
            ...current.column_mappings,
            ...autoMappings,
          },
        }))
        toast.success("Auto-mapped PRS columns based on headers")
      }
    } catch (error) {
      console.error("Failed to fetch preview", error)
      setPreviewError("Failed to load file preview")
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const fetchPhenotypePreview = async (population: "target" | "source") => {
    if (!jobId) return

    const filePath =
      population === "target"
        ? config?.target_population?.phenotype_path
        : config?.source_population?.phenotype_path

    if (!filePath) return

    setLoadingPhenotypes((prev) => ({
      ...prev,
      [population]: true,
    }))
    setPhenotypeErrors((prev) => ({
      ...prev,
      [population]: null,
    }))

    try {
      const url = getBenchmarkPreviewUrl(jobId, filePath)
      const response = await axios.get(url)
      const headers = (response.data.preview_lines?.[0] || "").split("\t")
      setPhenotypeHeaders((prev) => ({
        ...prev,
        [population]: headers,
      }))
    } catch (error) {
      console.error("Failed to fetch phenotype preview", error)
      setPhenotypeErrors((prev) => ({
        ...prev,
        [population]: "Failed to load phenotype preview",
      }))
    } finally {
      setLoadingPhenotypes((prev) => ({
        ...prev,
        [population]: false,
      }))
    }
  }

  const toggleTrait = (
    population: "target_population" | "source_population",
    traitType: "binary_traits" | "quantitative_traits",
    value: string,
    checked: boolean | string
  ) => {
    if (traitType === "binary_traits" && !allowBinaryTraits) return
    if (traitType === "quantitative_traits" && !allowQuantitativeTraits) return

    const isChecked = Boolean(checked)
    const currentTraits = config?.phenotype_config?.[population]?.[traitType] || []
    const next = new Set(currentTraits)
    if (isChecked) next.add(value)
    else next.delete(value)
    updatePhenotypeTraits(population, traitType, Array.from(next))
  }

  const availableHeaders = useMemo(() => {
    if (!preview) return []
    return preview.preview_lines?.[0]?.split("\t") || []
  }, [preview])

  const getAvailableOptions = (field: string) => {
    const headers = availableHeaders
    const mappedValues = Object.entries(config.column_mappings)
      .filter(([key]) => key !== field)
      .map(([, value]) => value)

    return headers.filter((header) => {
      if (config.column_mappings[field] === header) {
        return true
      }
      return !mappedValues.includes(header)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          PRSice Configuration
          {stepBadge}
        </CardTitle>
        <CardDescription>
          Configure column mappings, phenotype settings, and processing options
          for PRSice
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Collapsible
            open={expandedSections.includes("column-mapping")}
            onOpenChange={() => toggleSection("column-mapping")}
          >
            <CollapsibleTrigger asChild>
              <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div>
                  <h4 className="font-medium">Column Mapping</h4>
                  <p className="text-sm text-muted-foreground">
                    Map your file columns to expected PRS fields
                  </p>
                </div>
                {expandedSections.includes("column-mapping") ? (
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
                    {preview && (
                      <p className="mt-1 text-xs text-green-600">
                        ✓ Headers loaded – {availableHeaders.length} columns available
                      </p>
                    )}
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchFilePreview}
                      disabled={
                        !config?.target_population?.sumstats_path || isLoadingPreview
                      }
                    >
                      {isLoadingPreview ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="mr-2 h-4 w-4" />
                      )}
                      {preview ? "Reload Preview" : "Preview File"}
                    </Button>
                    {config?.target_population?.sumstats_path && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        File: {config.target_population.sumstats_path}
                      </div>
                    )}
                  </div>
                </div>

                {previewError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-red-600">{previewError}</p>
                      <Button variant="outline" size="sm" onClick={fetchFilePreview}>
                        Retry
                      </Button>
                    </div>
                  </div>
                )}

                {preview && (
                  <div className="rounded-lg border">
                    <div className="border-b bg-muted/50 p-3">
                      <h5 className="text-sm font-medium">
                        File Preview: {preview.filename}
                      </h5>
                      <p className="text-xs text-muted-foreground">
                        First 5 rows of your sumstats file
                      </p>
                    </div>
                    <div className="max-h-60 overflow-auto">
                      <table className="w-full text-xs">
                        <tbody>
                          {preview.preview_lines.slice(0, 5).map((line, index) => (
                            <tr key={index} className="border-b">
                              {line.split("\t").map((cell, cellIndex) => (
                                <td
                                  key={cellIndex}
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
                    const mappedHeader = config.column_mappings[field] || ""
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
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              Mapped
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700">
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
                              } else {
                                updateColumnMapping(field, value)
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                              {isMapped && (
                                <SelectItem value="__remove__">Remove mapping</SelectItem>
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
                          {!isMapped && availableHeaders.length === 0 && (
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
            </CollapsibleContent>
          </Collapsible>

          <Collapsible
            open={expandedSections.includes("phenotype-config")}
            onOpenChange={() => toggleSection("phenotype-config")}
          >
            <CollapsibleTrigger asChild>
              <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div>
                  <h4 className="font-medium">Phenotype Configuration</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure phenotype settings for target and source populations
                  </p>
                </div>
                {expandedSections.includes("phenotype-config") ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="space-y-6">
                <div className="flex flex-wrap gap-3">
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchPhenotypePreview("target")}
                      disabled={
                        loadingPhenotypes.target ||
                        !config?.target_population?.phenotype_path
                      }
                    >
                      {loadingPhenotypes.target ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="mr-2 h-4 w-4" />
                      )}
                      Preview Target Phenotype
                    </Button>
                    {config?.target_population?.phenotype_path && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        File: {config.target_population.phenotype_path}
                      </div>
                    )}
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchPhenotypePreview("source")}
                      disabled={
                        loadingPhenotypes.source ||
                        !config?.source_population?.phenotype_path
                      }
                    >
                      {loadingPhenotypes.source ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="mr-2 h-4 w-4" />
                      )}
                      Preview Source Phenotype
                    </Button>
                    {config?.source_population?.phenotype_path && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        File: {config.source_population.phenotype_path}
                      </div>
                    )}
                  </div>
                </div>

                {(phenotypeErrors.target || phenotypeErrors.source) && (
                  <div className="text-sm text-red-600">
                    {phenotypeErrors.target && <p>{phenotypeErrors.target}</p>}
                    {phenotypeErrors.source && <p>{phenotypeErrors.source}</p>}
                  </div>
                )}

                <div className="rounded-lg border border-dashed p-3">
                  <p className="text-xs text-muted-foreground">
                    Evaluation type is currently set to
                    <span className="ml-1 font-medium capitalize">{evaluationType}</span>.
                  </p>
                  {!allowBinaryTraits && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enable binary evaluation to select binary traits.
                    </p>
                  )}
                  {!allowQuantitativeTraits && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enable quantitative evaluation to select quantitative traits.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {["target", "source"].map((populationKey) => {
                    const population =
                      populationKey === "target"
                        ? "target_population"
                        : "source_population"
                    const headers = phenotypeHeaders[populationKey as "target" | "source"]
                    const binaryTraits = config.phenotype_config[population].binary_traits
                    const quantitativeTraits =
                      config.phenotype_config[population].quantitative_traits

                    return (
                      <div key={population} className="rounded-lg border p-4">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium capitalize">{populationKey} population</h5>
                          <Badge variant="outline" className="bg-muted text-xs">
                            Traits
                          </Badge>
                        </div>

                        {allowBinaryTraits && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-semibold uppercase text-muted-foreground">
                              Binary Traits
                            </p>
                            {headers.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Preview the phenotype file to load column headers.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {headers.map((header) => (
                                  <label
                                    key={header}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <Checkbox
                                      checked={binaryTraits.includes(header)}
                                      onCheckedChange={(checked) =>
                                        toggleTrait(
                                          population,
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
                          </div>
                        )}

                        {allowQuantitativeTraits && (
                          <div className="mt-4 space-y-2">
                            <p className="text-xs font-semibold uppercase text-muted-foreground">
                              Quantitative Traits
                            </p>
                            {headers.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Preview the phenotype file to load column headers.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {headers.map((header) => (
                                  <label
                                    key={header}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <Checkbox
                                      checked={quantitativeTraits.includes(header)}
                                      onCheckedChange={(checked) =>
                                        toggleTrait(
                                          population,
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

          <Collapsible
            open={expandedSections.includes("genotype-config")}
            onOpenChange={() => toggleSection("genotype-config")}
          >
            <CollapsibleTrigger asChild>
              <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div>
                  <h4 className="font-medium">Genotype Configuration</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure genotype file options and patterns
                  </p>
                </div>
                {expandedSections.includes("genotype-config") ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label className="text-sm">File Type</Label>
                    <Select
                      value={config.genotype_config.file_type}
                      onValueChange={(value) =>
                        updateGenotypeConfig({
                          file_type: value as PrsicePreProcessingConfig["genotype_config"]["file_type"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select file type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="merged">Merged (bed, bim, fam)</SelectItem>
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
                          population_reference: value as PrsicePreProcessingConfig["genotype_config"]["population_reference"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select population" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="target_population">Target Population</SelectItem>
                        <SelectItem value="source_population">Source Population</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible
            open={expandedSections.includes("processing-options")}
            onOpenChange={() => toggleSection("processing-options")}
          >
            <CollapsibleTrigger asChild>
              <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div>
                  <h4 className="font-medium">Processing Options</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure additional preprocessing behaviour
                  </p>
                </div>
                {expandedSections.includes("processing-options") ? (
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
                <label className="flex items-start gap-3 text-sm md:col-span-2">
                  <Info className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Adjust these options to control how the preprocessing behaves when encountering
                    previously generated outputs or missing data.
                  </span>
                </label>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  )
}
