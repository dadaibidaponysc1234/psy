"use client"

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  Loader2,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  describePopulation,
  isColumnRequired,
  isGwasNRequired,
} from "@/components/benchmarking/job-config"
import type {
  Issue,
  PopulationDraft,
  ToolDefinition,
  ToolDraft,
} from "@/components/benchmarking/job-config"
import { providedPaths } from "@/components/benchmarking/job-config/serialize"
import type { DatasetStructure } from "@/components/benchmarking/mapping-step/dataset"
import { fieldId } from "@/components/benchmarking/configure-step/issues"
import {
  FieldIssues,
  NumberInput,
} from "@/components/benchmarking/configure-step/form-parts"
import {
  aliasesFor,
  autoMap,
  headerOptions,
  splitLine,
  sumstatsPreviewFiles,
} from "@/components/benchmarking/configure-step/preview"
import {
  previewKey,
  usePreviews,
} from "@/components/benchmarking/configure-step/use-previews"

const REMOVE = "__remove__"

type Update = (change: (draft: ToolDraft) => ToolDraft) => void

const withPopulation =
  (id: string, change: (population: PopulationDraft) => PopulationDraft) =>
  (draft: ToolDraft): ToolDraft => ({
    ...draft,
    populations: draft.populations.map((population) =>
      population.id === id ? change(population) : population
    ),
  })

/** The populations whose summary statistics are mapped here, in the order of the tool's roles. */
export function sumstatsPopulations(
  definition: ToolDefinition,
  draft: ToolDraft
): PopulationDraft[] {
  return definition.populations.flatMap((rule) =>
    draft.populations.filter(
      (population) =>
        population.role === rule.role &&
        providedPaths(definition, population).includes("sumstats_path")
    )
  )
}

const GWAS_HELP: Record<ToolDefinition["gwasN"], (label: string) => string> = {
  required: (tool) =>
    `The number of individuals in this population's GWAS. ${tool} needs it.`,
  unless_n_column: () =>
    "Needed when the N column isn't mapped. If both are given, the N column is used.",
  optional: (tool) => `Optional: ${tool} doesn't use it today.`,
}

interface ColumnMappingProps {
  jobId: string
  definition: ToolDefinition
  draft: ToolDraft
  structure: DatasetStructure | null
  issues: Issue[]
  activePopulation: string
  onPopulationChange: (id: string) => void
  update: Update
}

/** Maps each population's summary-statistics columns, with a preview of its file. */
export function ColumnMapping({
  activePopulation,
  onPopulationChange,
  ...props
}: ColumnMappingProps) {
  const populations = sumstatsPopulations(props.definition, props.draft)
  if (populations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No populations are configured yet. Return to the mapping step to add
        them.
      </p>
    )
  }
  const active = populations.some(
    (population) => population.id === activePopulation
  )
    ? activePopulation
    : populations[0].id

  return (
    <Tabs value={active} onValueChange={onPopulationChange}>
      <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap border-b border-border bg-transparent p-0">
        {populations.map((population) => {
          const isActive = population.id === active
          const rule = props.definition.populations.find(
            (candidate) => candidate.role === population.role
          )
          return (
            <TabsTrigger
              key={population.id}
              value={population.id}
              className="group rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-semibold transition-all duration-200 hover:bg-muted/40 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              <span className="flex items-center gap-2">
                {population.name.trim() || rule?.label}
                <Badge
                  variant="outline"
                  className={`hidden border text-xs sm:inline-flex ${
                    isActive
                      ? "border-white bg-white text-primary"
                      : "border-orange-200 bg-orange-100 text-orange-700"
                  }`}
                >
                  {rule?.label ?? population.role}
                </Badge>
              </span>
            </TabsTrigger>
          )
        })}
      </TabsList>
      {populations.map((population, index) => (
        <TabsContent key={population.id} value={population.id} className="pt-4">
          <PopulationColumns
            {...props}
            population={population}
            earlier={populations.slice(0, index)}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function PopulationColumns({
  jobId,
  definition,
  draft,
  structure,
  issues,
  update,
  population,
  earlier,
}: Omit<ColumnMappingProps, "activePopulation" | "onPopulationChange"> & {
  population: PopulationDraft
  earlier: PopulationDraft[]
}) {
  const { entries, cursors, load, setCursor } = usePreviews()
  const label = describePopulation(definition, population)
  const columns = [
    ...definition.columns.required,
    ...definition.columns.optional,
  ]
  const mapping = population.column_mapping

  const source = population.sumstats_path.trim()
  const files = sumstatsPreviewFiles(
    structure,
    source,
    draft.sumstats_file_type
  )
  const cursorKey = previewKey(jobId, source)
  const index = Math.min(cursors[cursorKey] ?? 0, Math.max(files.length - 1, 0))
  // Unknown to the listing: preview the path itself, letting the backend pick in a folder.
  const previewPath = files[index] ?? source
  const randomPick =
    files.length === 0 && draft.sumstats_file_type === "multi_chromosome"
  const entry = source ? entries[previewKey(jobId, previewPath)] : undefined
  const preview = entry?.status === "ready" ? entry.preview : null
  const headers = preview?.headers ?? []
  const failed = entry?.status === "error"
  const loading = entry?.status === "loading"

  const setMapping = (column: string, value: string | null) =>
    update(
      withPopulation(population.id, (current) => {
        const next = { ...current.column_mapping }
        if (value === null) delete next[column]
        else next[column] = value
        return { ...current, column_mapping: next }
      })
    )

  const previewAndMap = async (path: string) => {
    if (!source) {
      toast.error(
        "Set the sumstats path on the mapping page before previewing."
      )
      return
    }
    const loaded = await load(jobId, path, { randomPick })
    if (!loaded) {
      toast.error("Failed to load preview. Check the file path.")
      return
    }
    const filled = autoMap(columns, loaded.headers, mapping)
    const added = columns.filter((column) => filled[column] !== mapping[column])
    update(
      withPopulation(population.id, (current) => ({
        ...current,
        column_mapping: autoMap(
          columns,
          loaded.headers,
          current.column_mapping
        ),
      }))
    )
    toast.success(
      added.length > 0
        ? `Auto-mapped ${added.length} column${added.length === 1 ? "" : "s"} for ${label}`
        : "Preview loaded: no auto-mapping candidates found"
    )
  }

  const step = (by: number) => {
    const next = (index + by + files.length) % files.length
    setCursor(cursorKey, next)
    const cached = entries[previewKey(jobId, files[next])]
    if (cached?.status !== "ready") void previewAndMap(files[next])
  }

  const reusable = earlier.filter(
    (other) => Object.keys(other.column_mapping).length > 0
  )
  const gwasPath = `populations.${population.id}.gwas_n`
  const gwasRequired = isGwasNRequired(definition, population)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Preview your sumstats file to see available columns
          </p>
          {files.length > 1 && (
            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 text-orange-500" />
              This dataset has {files.length} files. Step through them with the
              arrows; their headers should match.
            </p>
          )}
          {preview && (
            <p className="mt-1 text-xs text-green-600">
              ✓ Headers loaded – {headers.length} columns available
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-2">
            {files.length > 1 && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                aria-label="Previous file"
                disabled={loading}
                onClick={() => step(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={loading || !source}
              onClick={() => void previewAndMap(previewPath)}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              {preview ? "Reload Preview" : "Preview File"}
            </Button>
            {files.length > 1 && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                aria-label="Next file"
                disabled={loading}
                onClick={() => step(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
          {source && (
            <div className="mt-2 text-xs text-muted-foreground">
              File: {files.length > 1 ? files[index] : source}
              {files.length > 1 && ` (${index + 1} of ${files.length})`}
            </div>
          )}
        </div>
      </div>

      {failed && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-red-600">Failed to load file preview</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void previewAndMap(previewPath)}
            >
              Retry
            </Button>
          </div>
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            Preview failed. Manual mapping is enabled below; choices are limited
            to known aliases per column.
          </p>
        </div>
      )}

      {preview && preview.lines.length > 0 && (
        <div className="rounded-lg border shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b p-2 text-sm">
            <div className="min-w-0 truncate font-medium">
              File Preview: {preview.filename}
            </div>
            <div className="flex-shrink-0 text-muted-foreground">
              First 5 rows of the sumstats file
            </div>
          </div>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  {headers.map((header, cell) => (
                    <th
                      key={`h-${cell}`}
                      className="whitespace-nowrap px-2 py-1 text-left font-medium"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.lines.slice(1, 6).map((line, row) => (
                  <tr key={`r-${row}`} className="border-b">
                    {splitLine(line).map((value, cell) => (
                      <td
                        key={`c-${cell}`}
                        className="whitespace-nowrap px-2 py-1"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reusable.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs text-muted-foreground">
            Same columns as another population?
          </Label>
          <Select
            value=""
            onValueChange={(id) => {
              const from = reusable.find((other) => other.id === id)
              if (!from) return
              update(
                withPopulation(population.id, (current) => ({
                  ...current,
                  column_mapping: { ...from.column_mapping },
                }))
              )
              toast.success(
                `Reused ${describePopulation(definition, from)}'s mapping`
              )
            }}
          >
            <SelectTrigger className="h-8 w-auto min-w-[14rem] text-xs">
              <SelectValue placeholder="Reuse mapping from…" />
            </SelectTrigger>
            <SelectContent>
              {reusable.map((other) => (
                <SelectItem key={other.id} value={other.id}>
                  {describePopulation(definition, other)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {columns.map((column) => {
          const value = mapping[column]?.trim() ?? ""
          const path = `populations.${population.id}.column_mapping.${column}`
          const options = headerOptions(column, headers, mapping, failed)
          const missingFromFile = Boolean(
            preview && value && !headers.includes(value)
          )
          return (
            <div
              key={column}
              id={fieldId(draft.tool, path)}
              className="rounded-lg border p-4 shadow-sm transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{column}</p>
                  <p className="text-xs text-muted-foreground">
                    {aliasesFor(column).join(", ")}
                  </p>
                </div>
                {value ? (
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700"
                  >
                    Mapped
                  </Badge>
                ) : isColumnRequired(definition, population, column) ? (
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    Required
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-slate-50 text-slate-600"
                  >
                    Optional
                  </Badge>
                )}
              </div>
              <div className="mt-3 space-y-2">
                <Label className="text-xs">Column Header</Label>
                <Select
                  value={value || undefined}
                  onValueChange={(next) => {
                    if (next === REMOVE) {
                      setMapping(column, null)
                      toast.success(`Cleared mapping for ${column}`)
                    } else {
                      setMapping(column, next)
                      toast.success(`Mapped ${column} to ${next}`)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {value && (
                      <SelectItem value={REMOVE}>Remove mapping</SelectItem>
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
                {missingFromFile && (
                  <p className="flex items-center gap-1 text-xs text-orange-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Not in this file
                  </p>
                )}
                {!value && headers.length === 0 && !failed && (
                  <p className="text-xs text-muted-foreground">
                    Preview the file to populate headers
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div
        id={fieldId(draft.tool, gwasPath)}
        className="rounded-lg border p-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <Label
            htmlFor={`${fieldId(draft.tool, gwasPath)}-input`}
            className="text-sm font-medium"
          >
            GWAS Sample Size
          </Label>
          {population.gwas_n !== null ? (
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Entered
            </Badge>
          ) : gwasRequired ? (
            <Badge variant="outline" className="bg-red-50 text-red-700">
              Required
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-slate-50 text-slate-600">
              Optional
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {GWAS_HELP[definition.gwasN](definition.label)}
        </p>
        <div className="mt-3 max-w-xs">
          <NumberInput
            id={`${fieldId(draft.tool, gwasPath)}-input`}
            integer
            placeholder="e.g. 50000"
            value={population.gwas_n}
            onChange={(gwas_n) =>
              update(
                withPopulation(population.id, (current) => ({
                  ...current,
                  gwas_n,
                }))
              )
            }
          />
        </div>
        <FieldIssues issues={issues} path={gwasPath} />
      </div>
    </div>
  )
}
