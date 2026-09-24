"use client"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
  runKinds,
} from "@/components/benchmarking/job-config"
import type {
  EvaluationType,
  FieldSpec,
  Issue,
  ParamSpec,
  ParamValue,
  Role,
  ToolDefinition,
  ToolDraft,
  TraitKind,
} from "@/components/benchmarking/job-config"
import {
  FieldIssues,
  NumberInput,
} from "@/components/benchmarking/configure-step/form-parts"
import { fieldId } from "@/components/benchmarking/configure-step/issues"
import { withParam } from "@/components/benchmarking/configure-step/params"
import { EvaluationNote } from "@/components/benchmarking/configure-step/phenotype"

type Update = (change: (draft: ToolDraft) => ToolDraft) => void

const KIND_LABELS: Record<TraitKind, string> = {
  binary: "Binary",
  quantitative: "Quantitative",
}

interface ProcessingProps {
  definition: ToolDefinition
  draft: ToolDraft
  evaluationType: EvaluationType
  issues: Issue[]
  activeRun: TraitKind | undefined
  onRunChange: (kind: TraitKind) => void
  update: Update
}

/** One input for a field: a checkbox, a select or a number. */
function FieldInput({
  field,
  value,
  path,
  tool,
  issues,
  onChange,
}: {
  field: FieldSpec
  value: ParamValue | undefined
  path: string
  tool: ToolDraft["tool"]
  issues: Issue[]
  onChange: (value: ParamValue) => void
}) {
  const id = fieldId(tool, path)
  if (field.kind === "boolean") {
    return (
      <div id={id} className="flex items-start gap-3">
        <Checkbox
          id={`${id}-input`}
          checked={value === true}
          onCheckedChange={(checked) => onChange(Boolean(checked))}
        />
        <div className="space-y-1">
          <Label htmlFor={`${id}-input`} className="text-sm">
            {field.label}
          </Label>
          {field.help && (
            <p className="text-xs text-muted-foreground">{field.help}</p>
          )}
          <FieldIssues issues={issues} path={path} />
        </div>
      </div>
    )
  }
  return (
    <div id={id} className="space-y-2">
      <Label htmlFor={`${id}-input`} className="text-sm">
        {field.label}
      </Label>
      {field.kind === "select" ? (
        <Select
          value={typeof value === "string" ? value : undefined}
          onValueChange={onChange}
        >
          <SelectTrigger id={`${id}-input`}>
            <SelectValue placeholder={field.placeholder ?? "Select"} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <NumberInput
          id={`${id}-input`}
          integer={field.integer}
          placeholder={field.placeholder}
          value={typeof value === "number" ? value : null}
          onChange={onChange}
        />
      )}
      {field.help && (
        <p className="text-xs text-muted-foreground">{field.help}</p>
      )}
      <FieldIssues issues={issues} path={path} />
    </div>
  )
}

function TraitSelect({
  spec,
  definition,
  draft,
  kind,
  issues,
  onChange,
}: {
  spec: ParamSpec
  definition: ToolDefinition
  draft: ToolDraft
  kind: TraitKind
  issues: Issue[]
  onChange: (value: string) => void
}) {
  const path = `params.${kind}.${spec.key}`
  const target = draft.populations.find(
    (population) => population.role === "target"
  )
  const traits = target?.traits[kind] ?? []
  const value = draft.params[kind]?.[spec.key]
  const targetLabel = target
    ? describePopulation(definition, target)
    : "the target"
  return (
    <div id={fieldId(draft.tool, path)} className="space-y-2">
      <Label className="text-sm">{spec.label}</Label>
      {traits.length > 0 ? (
        <Select
          value={typeof value === "string" && value ? value : undefined}
          onValueChange={onChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select phenotype column" />
          </SelectTrigger>
          <SelectContent>
            {traits.map((trait) => (
              <SelectItem key={trait} value={trait}>
                {trait}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <p className="text-xs text-muted-foreground">
          No {kind} traits configured for {targetLabel}. Update the phenotype
          configuration to continue.
        </p>
      )}
      {spec.help && traits.length > 0 && (
        <p className="text-xs text-muted-foreground">{spec.help}</p>
      )}
      <FieldIssues issues={issues} path={path} />
    </div>
  )
}

/** A box per role for the tool's per-population parameters, e.g. XPASS+'s clumping. */
function PerRoleBoxes({
  specs,
  definition,
  draft,
  kind,
  issues,
  set,
}: {
  specs: Extract<ParamSpec, { kind: "per_role" }>[]
  definition: ToolDefinition
  draft: ToolDraft
  kind: TraitKind
  issues: Issue[]
  set: (key: string, value: ParamValue) => void
}) {
  const roles = specs[0].roles.filter((role) =>
    specs.every((spec) => spec.roles.includes(role))
  )
  const valueOf = (spec: ParamSpec) =>
    (draft.params[kind]?.[spec.key] ?? {}) as Record<string, ParamValue>

  const setRoleValue = (spec: ParamSpec, role: Role, value: ParamValue) =>
    set(spec.key, { ...valueOf(spec), [role]: value } as ParamValue)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {roles.map((role) => {
        const population = draft.populations.find(
          (candidate) => candidate.role === role
        )
        const title = population
          ? describePopulation(definition, population)
          : role
        return (
          <div key={role} className="space-y-4 rounded-lg border p-4">
            <p className="text-sm font-semibold">{title}</p>
            {specs.map((spec) => {
              const roleValue = valueOf(spec)[role]
              const base = `params.${kind}.${spec.key}.${role}`
              if (!Array.isArray(spec.of)) {
                return (
                  <FieldInput
                    key={spec.key}
                    field={{ ...spec.of, label: spec.label, help: spec.help }}
                    value={roleValue as ParamValue}
                    path={base}
                    tool={draft.tool}
                    issues={issues}
                    onChange={(value) => setRoleValue(spec, role, value)}
                  />
                )
              }
              const fields = (roleValue ?? {}) as Record<string, ParamValue>
              return (
                <div key={spec.key} className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {spec.label}
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {spec.of.map((field) => (
                      <FieldInput
                        key={field.key}
                        field={field}
                        value={fields[field.key]}
                        path={`${base}.${field.key}`}
                        tool={draft.tool}
                        issues={issues}
                        onChange={(value) =>
                          setRoleValue(spec, role, {
                            ...fields,
                            [field.key]: value,
                          } as ParamValue)
                        }
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function RunFields({
  definition,
  draft,
  kind,
  issues,
  update,
}: Omit<ProcessingProps, "evaluationType" | "activeRun" | "onRunChange"> & {
  kind: TraitKind
}) {
  const set = (key: string, value: ParamValue) =>
    update((current) => withParam(definition, current, kind, key, value))
  const perRole = definition.params.filter(
    (spec): spec is Extract<ParamSpec, { kind: "per_role" }> =>
      spec.kind === "per_role"
  )
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {definition.params.map((spec) => {
          if (spec.kind === "per_role") return null
          if (spec.kind === "trait")
            return (
              <TraitSelect
                key={spec.key}
                spec={spec}
                definition={definition}
                draft={draft}
                kind={kind}
                issues={issues}
                onChange={(value) => set(spec.key, value)}
              />
            )
          return (
            <FieldInput
              key={spec.key}
              field={spec}
              value={draft.params[kind]?.[spec.key]}
              path={`params.${kind}.${spec.key}`}
              tool={draft.tool}
              issues={issues}
              onChange={(value) => set(spec.key, value)}
            />
          )
        })}
      </div>
      {perRole.length > 0 && (
        <PerRoleBoxes
          specs={perRole}
          definition={definition}
          draft={draft}
          kind={kind}
          issues={issues}
          set={set}
        />
      )}
    </div>
  )
}

/** The method parameters for each run the evaluation type asks for. */
export function Processing(props: ProcessingProps) {
  const { definition, evaluationType, activeRun, onRunChange } = props
  const kinds = runKinds(evaluationType)
  const note = (
    <EvaluationNote
      evaluationType={evaluationType}
      what="configure {kind} processing"
    />
  )

  if (definition.paramsSharedAcrossRuns) {
    return (
      <div className="space-y-4">
        {note}
        <RunFields {...props} kind={kinds[0]} />
      </div>
    )
  }

  const active = activeRun && kinds.includes(activeRun) ? activeRun : kinds[0]
  return (
    <div className="space-y-4">
      {note}
      <Tabs
        value={active}
        onValueChange={(value) => onRunChange(value as TraitKind)}
      >
        <TabsList>
          {kinds.map((kind) => (
            <TabsTrigger key={kind} value={kind}>
              {KIND_LABELS[kind]}
            </TabsTrigger>
          ))}
        </TabsList>
        {kinds.map((kind) => (
          <TabsContent key={kind} value={kind} className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">
                {KIND_LABELS[kind]} Processing
              </p>
              <Badge variant="outline" className="text-xs lowercase">
                {kind}
              </Badge>
            </div>
            <RunFields {...props} kind={kind} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
