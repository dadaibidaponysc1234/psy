"use client"

import { Eye, Loader2 } from "lucide-react"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  describePopulation,
  runKinds,
} from "@/components/benchmarking/job-config"
import type {
  EvaluationType,
  Issue,
  PathKey,
  PopulationDraft,
  SplitDraft,
  ToolDefinition,
  ToolDraft,
  TraitKind,
} from "@/components/benchmarking/job-config"
import {
  providedPaths,
  takesCovariates,
} from "@/components/benchmarking/job-config/serialize"
import type { DatasetStructure } from "@/components/benchmarking/mapping-step/dataset"
import {
  FieldIssues,
  NumberInput,
} from "@/components/benchmarking/configure-step/form-parts"
import { fieldId } from "@/components/benchmarking/configure-step/issues"
import { previewFiles } from "@/components/benchmarking/configure-step/preview"
import {
  previewKey,
  usePreviews,
} from "@/components/benchmarking/configure-step/use-previews"

type Update = (change: (draft: ToolDraft) => ToolDraft) => void

const KIND_TITLES: Record<TraitKind, string> = {
  binary: "Binary Traits",
  quantitative: "Quantitative Traits",
}

interface PhenotypeProps {
  jobId: string
  definition: ToolDefinition
  draft: ToolDraft
  evaluationType: EvaluationType
  structure: DatasetStructure | null
  issues: Issue[]
  update: Update
}

/** "Evaluation type is currently set to Both." and what that turns off. */
export function EvaluationNote({
  evaluationType,
  what,
}: {
  evaluationType: EvaluationType
  what: string
}) {
  const kinds = runKinds(evaluationType)
  return (
    <div className="rounded-lg border border-dashed p-3">
      <p className="text-xs text-muted-foreground">
        Evaluation type is currently set to
        <span className="ml-1 font-medium capitalize">{evaluationType}</span>.
      </p>
      {(["binary", "quantitative"] as TraitKind[])
        .filter((kind) => !kinds.includes(kind))
        .map((kind) => (
          <p key={kind} className="mt-1 text-xs text-muted-foreground">
            Enable {kind} evaluation to {what.replace("{kind}", kind)}.
          </p>
        ))}
    </div>
  )
}

/** Loads a file's headers for picking columns: a folder shows its first file. */
export function useHeaders(
  jobId: string,
  structure: DatasetStructure | null,
  path: string
) {
  const { entries, load } = usePreviews()
  const file = previewFiles(structure, path)[0] ?? path.trim()
  const entry = file ? entries[previewKey(jobId, file)] : undefined
  return {
    headers: entry?.status === "ready" ? entry.preview.headers : [],
    loading: entry?.status === "loading",
    failed: entry?.status === "error",
    load: async () => {
      if (!file) return
      const loaded = await load(jobId, file)
      if (loaded)
        toast.success(
          `Loaded ${loaded.headers.length} columns from ${loaded.filename}`
        )
      else toast.error("Failed to load preview. Check the file path.")
    },
  }
}

function PreviewButton({
  label,
  loading,
  disabled,
  onClick,
}: {
  label: string
  loading: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={loading || disabled}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Eye className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  )
}

/** A checkbox per column; ticked columns missing from the loaded headers still show, ticked. */
function ColumnTicks({
  columns,
  ticked,
  onToggle,
}: {
  columns: string[]
  ticked: string[]
  onToggle: (column: string, on: boolean) => void
}) {
  const all = [
    ...columns,
    ...ticked.filter((column) => !columns.includes(column)),
  ]
  return (
    <div className="space-y-2">
      {all.map((column) => (
        <label key={column} className="flex items-center gap-2 text-xs">
          <Checkbox
            checked={ticked.includes(column)}
            onCheckedChange={(checked) => onToggle(column, Boolean(checked))}
          />
          <span>{column}</span>
        </label>
      ))}
    </div>
  )
}

function TraitCard({
  jobId,
  definition,
  draft,
  evaluationType,
  structure,
  issues,
  update,
  population,
}: PhenotypeProps & { population: PopulationDraft }) {
  const hasFile = providedPaths(definition, population).includes(
    "phenotype_path"
  )
  const path = hasFile ? population.phenotype_path.trim() : ""
  const { headers, loading, failed, load } = useHeaders(jobId, structure, path)
  const kinds = runKinds(evaluationType)
  const anyTicked = kinds.some((kind) => population.traits[kind].length > 0)

  const toggle = (kind: TraitKind, column: string, on: boolean) =>
    update((current) => ({
      ...current,
      populations: current.populations.map((candidate) => {
        if (candidate.id !== population.id) return candidate
        const traits = candidate.traits[kind].filter(
          (trait) => trait !== column
        )
        return {
          ...candidate,
          traits: {
            ...candidate.traits,
            [kind]: on ? [...traits, column] : traits,
          },
        }
      }),
    }))

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            {describePopulation(definition, population)}
          </p>
          <p className="text-xs text-muted-foreground">
            {path || "No phenotype file mapped"}
          </p>
        </div>
        <PreviewButton
          label="Preview Phenotype"
          loading={loading}
          disabled={!path}
          onClick={() => void load()}
        />
      </div>

      {failed && (
        <p className="mt-3 text-xs text-red-600">
          Failed to load phenotype preview
        </p>
      )}
      {!path ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Provide a phenotype path in the mapping step to configure traits for
          this population.
        </p>
      ) : headers.length === 0 && !anyTicked ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Preview the phenotype file to load column headers.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {kinds.map((kind) => {
            const traitPath = `populations.${population.id}.traits.${kind}`
            return (
              <div
                key={kind}
                id={fieldId(draft.tool, traitPath)}
                className="space-y-2"
              >
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {KIND_TITLES[kind]}
                </p>
                <ColumnTicks
                  columns={headers}
                  ticked={population.traits[kind]}
                  onToggle={(column, on) => toggle(kind, column, on)}
                />
                <FieldIssues issues={issues} path={traitPath} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CovariateColumns({
  jobId,
  definition,
  draft,
  structure,
  update,
  population,
}: PhenotypeProps & { population: PopulationDraft }) {
  const path = population.covariate_path.trim()
  const { headers, loading, failed, load } = useHeaders(jobId, structure, path)
  const ticked = draft.covariates.columns
  const idColumns = [
    draft.covariates.id_mapping.fid,
    draft.covariates.id_mapping.iid,
  ]

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold">
            {describePopulation(definition, population)}
          </p>
          <p className="text-xs text-muted-foreground">
            {path || "No covariate file mapped"}
          </p>
        </div>
        <PreviewButton
          label="Preview Covariate File"
          loading={loading}
          disabled={!path}
          onClick={() => void load()}
        />
      </div>
      {failed && (
        <p className="mt-2 text-xs text-red-600">
          Failed to load covariate preview
        </p>
      )}
      {headers.length === 0 && ticked.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Preview the covariate file to choose covariate columns.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Covariate Columns
          </p>
          <ColumnTicks
            columns={headers.filter((column) => !idColumns.includes(column))}
            ticked={ticked}
            onToggle={(column, on) =>
              update((current) => {
                const rest = current.covariates.columns.filter(
                  (other) => other !== column
                )
                return {
                  ...current,
                  covariates: {
                    ...current.covariates,
                    columns: on ? [...rest, column] : rest,
                  },
                }
              })
            }
          />
        </div>
      )}
    </div>
  )
}

function Covariates(props: PhenotypeProps) {
  const { definition, draft, issues, update } = props
  const withFile = draft.populations.filter((population) =>
    providedPaths(definition, population).includes("covariate_path" as PathKey)
  )
  if (!takesCovariates(definition) || withFile.length === 0) return null
  const idPath = "covariates.id_mapping"

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Covariates</p>
        <p className="text-xs text-muted-foreground">
          Map the column identifiers used for individual IDs in covariate files.
        </p>
      </div>
      <div
        id={fieldId(draft.tool, idPath)}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {(["fid", "iid"] as const).map((key) => (
          <div key={key} className="space-y-2">
            <Label className="text-xs uppercase">{key}</Label>
            <Input
              value={draft.covariates.id_mapping[key]}
              placeholder={key.toUpperCase()}
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  covariates: {
                    ...current.covariates,
                    id_mapping: {
                      ...current.covariates.id_mapping,
                      [key]: event.target.value,
                    },
                  },
                }))
              }
            />
          </div>
        ))}
      </div>
      <FieldIssues issues={issues} path={idPath} />
      {definition.hasCovariateColumns &&
        withFile.map((population) => (
          <CovariateColumns
            key={population.id}
            {...props}
            population={population}
          />
        ))}
    </div>
  )
}

const SPLIT_METHODS: Record<SplitDraft["method"], string> = {
  proportions: "By proportion",
  column: "By a phenotype column",
}

/** How the target's people are split into the model's training and validation sets. */
function TrainValidationSplit(props: PhenotypeProps) {
  const { jobId, definition, draft, structure, issues, update } = props
  const split = draft.split
  const target = draft.populations.find(
    (population) => population.role === "target"
  )
  const { headers } = useHeaders(
    jobId,
    structure,
    target?.phenotype_path.trim() ?? ""
  )
  if (!split) return null
  const set = (change: Partial<SplitDraft>) =>
    update((current) => ({
      ...current,
      split: { ...split, ...current.split, ...change } as SplitDraft,
    }))
  const id = (path: string) => fieldId(draft.tool, path)
  const columns = [
    ...headers,
    ...(split.column && !headers.includes(split.column) ? [split.column] : []),
  ]

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Training and validation split</p>
        <p className="text-xs text-muted-foreground">
          {definition.label} trains on one part of{" "}
          {target ? describePopulation(definition, target) : "the target"} and
          validates on the rest.
        </p>
      </div>
      <div id={id("split.method")} className="space-y-2">
        <Label className="text-xs uppercase">Split</Label>
        <Select
          value={split.method}
          onValueChange={(method) =>
            set({ method: method as SplitDraft["method"] })
          }
        >
          <SelectTrigger className="md:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SPLIT_METHODS) as SplitDraft["method"][]).map(
              (method) => (
                <SelectItem key={method} value={method}>
                  {SPLIT_METHODS[method]}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        <FieldIssues issues={issues} path="split.method" />
      </div>
      {split.method === "proportions" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div id={id("split.train")} className="space-y-2">
            <Label htmlFor={`${id("split.train")}-input`} className="text-sm">
              Training share
            </Label>
            <NumberInput
              id={`${id("split.train")}-input`}
              placeholder="0.7"
              value={split.train}
              onChange={(train) => set({ train })}
            />
            <p className="text-xs text-muted-foreground">
              Between 0 and 1; the rest validate.
            </p>
            <FieldIssues issues={issues} path="split.train" />
          </div>
          <div id={id("split.seed")} className="space-y-2">
            <Label htmlFor={`${id("split.seed")}-input`} className="text-sm">
              Seed
            </Label>
            <NumberInput
              id={`${id("split.seed")}-input`}
              integer
              placeholder="42"
              value={split.seed}
              onChange={(seed) => set({ seed })}
            />
            <p className="text-xs text-muted-foreground">
              The same seed puts the same people in each set.
            </p>
            <FieldIssues issues={issues} path="split.seed" />
          </div>
        </div>
      ) : (
        <div id={id("split.column")} className="space-y-2">
          <Label className="text-sm">Split column</Label>
          {columns.length > 0 ? (
            <Select
              value={split.column || undefined}
              onValueChange={(column) => set({ column })}
            >
              <SelectTrigger className="md:w-72">
                <SelectValue placeholder="Select phenotype column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">
              Preview the target&apos;s phenotype file above to choose the
              column.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Each person&apos;s value must be <code>train</code> or{" "}
            <code>val</code>; people with neither are left out.
          </p>
          <FieldIssues issues={issues} path="split.column" />
        </div>
      )}
    </div>
  )
}

/** Traits per population, and covariates for tools whose populations can take a covariate file. */
export function Phenotype(props: PhenotypeProps) {
  const { definition, draft } = props
  const withPhenotype = definition.populations.flatMap((rule) =>
    [...rule.requiredPaths, ...rule.optionalPaths].includes("phenotype_path")
      ? draft.populations.filter((population) => population.role === rule.role)
      : []
  )
  return (
    <div className="space-y-4">
      <div id={fieldId(draft.tool, "evaluation_type")}>
        <EvaluationNote
          evaluationType={props.evaluationType}
          what="select {kind} traits"
        />
        <FieldIssues issues={props.issues} path="evaluation_type" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {withPhenotype.map((population) => (
          <TraitCard key={population.id} {...props} population={population} />
        ))}
      </div>
      <Covariates {...props} />
      {definition.trainValidationSplit && <TrainValidationSplit {...props} />}
    </div>
  )
}
