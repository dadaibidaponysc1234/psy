"use client"

import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChromosomeMultiSelect } from "@/components/ui/chromosome-multi-select"
import { Label } from "@/components/ui/label"
import { normalizeChromosomes } from "@/components/benchmarking/job-config"
import type {
  DatasetQuirks,
  EvaluationType,
  Issue,
  ToolDefinition,
  ToolDraft,
  TraitKind,
} from "@/components/benchmarking/job-config"
import {
  takesCovariates,
  takesSumstats,
} from "@/components/benchmarking/job-config/serialize"
import type { DatasetStructure } from "@/components/benchmarking/mapping-step/dataset"
import { ColumnMapping } from "@/components/benchmarking/configure-step/column-mapping"
import {
  FieldIssues,
  FormSection,
} from "@/components/benchmarking/configure-step/form-parts"
import {
  fieldId,
  locateIssue,
  SECTION_ORDER,
  SECTION_TITLES,
  type SectionId,
} from "@/components/benchmarking/configure-step/issues"
import { Phenotype } from "@/components/benchmarking/configure-step/phenotype"
import {
  FieldInput,
  Processing,
} from "@/components/benchmarking/configure-step/processing"

/** Which sections are open and which tabs are showing; the page moves these to jump to an issue. */
export interface FormNav {
  open: Partial<Record<SectionId, boolean>>
  population?: string
  run?: TraitKind
}

/** Only Column Mapping starts open, as on the old forms. */
export const INITIAL_NAV: FormNav = { open: { columns: true } }

/** The sections a tool's form has. */
export function formSections(definition: ToolDefinition): SectionId[] {
  return SECTION_ORDER.filter((section) => {
    if (section === "columns") return takesSumstats(definition)
    if (section === "phenotype")
      return definition.hasTraits || takesCovariates(definition)
    if (section === "processing") return definition.params.length > 0
    return true
  })
}

interface ToolFormProps {
  jobId: string
  definition: ToolDefinition
  draft: ToolDraft
  evaluationType: EvaluationType
  /** Fixes the job's shared dataset needs, if any. */
  quirks?: DatasetQuirks
  structure: DatasetStructure | null
  /** This tool's issues. */
  issues: Issue[]
  nav: FormNav
  onNavChange: (nav: FormNav) => void
  update: (change: (draft: ToolDraft) => ToolDraft) => void
}

/** One tool's Configure form: the same sections, in the same order, for every tool. */
export function ToolForm(props: ToolFormProps) {
  const { definition, draft, issues, nav, onNavChange, update } = props
  const label = definition.label
  const countIn = (section: SectionId) =>
    issues.filter((issue) => locateIssue(issue)?.section === section).length

  const descriptions: Record<SectionId, string> = {
    columns: `Map sumstats headers for each population used by ${label}`,
    phenotype:
      "Preview phenotype headers and select traits for each population",
    genotype: "Configure genotype file options",
    processing: `Configure ${label} scoring inputs for the selected evaluation type.`,
  }

  const content: Record<SectionId, () => ReactNode> = {
    columns: () => (
      <ColumnMapping
        {...props}
        activePopulation={nav.population ?? ""}
        onPopulationChange={(population) => onNavChange({ ...nav, population })}
      />
    ),
    phenotype: () => <Phenotype {...props} />,
    genotype: () => (
      <div className="space-y-4">
        {definition.chromosomeSelection ? (
          <div id={fieldId(draft.tool, "genotype.chrom")} className="space-y-2">
            <Label className="text-xs uppercase">Chromosomes</Label>
            <ChromosomeMultiSelect
              value={draft.genotype.chrom}
              onChange={(chrom) =>
                update((current) => ({
                  ...current,
                  genotype: {
                    ...current.genotype,
                    chrom: normalizeChromosomes(chrom),
                  },
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Select one or more chromosomes to process. Leave empty to process
              all.
            </p>
            <FieldIssues issues={issues} path="genotype.chrom" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {label} always runs on every chromosome.
          </p>
        )}
        {definition.preprocessingOptions && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {definition.preprocessingOptions.map((field) => (
              <FieldInput
                key={field.key}
                field={field}
                value={draft.preprocessing?.[field.key] ?? undefined}
                path={`preprocessing.${field.key}`}
                tool={draft.tool}
                issues={issues}
                onChange={(value) =>
                  update((current) => ({
                    ...current,
                    preprocessing: {
                      ...current.preprocessing,
                      [field.key]: value as string | number | boolean | null,
                    },
                  }))
                }
              />
            ))}
          </div>
        )}
      </div>
    ),
    processing: () => (
      <Processing
        {...props}
        activeRun={nav.run}
        onRunChange={(run) => onNavChange({ ...nav, run })}
      />
    ),
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{label} Configuration</CardTitle>
          <CardDescription>
            Configure column mappings, phenotype settings, and preprocessing
            options for {label}
          </CardDescription>
        </div>
        <Badge variant="outline">Step 5</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {formSections(definition).map((section) => (
          <FormSection
            key={section}
            title={SECTION_TITLES[section]}
            description={descriptions[section]}
            issueCount={countIn(section)}
            open={Boolean(nav.open[section])}
            onOpenChange={(open) =>
              onNavChange({ ...nav, open: { ...nav.open, [section]: open } })
            }
          >
            {content[section]()}
          </FormSection>
        ))}
      </CardContent>
    </Card>
  )
}
