"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { newPopulation } from "@/components/benchmarking/job-config"
import type {
  PathKey,
  PopulationDraft,
  RoleRule,
  ToolDefinition,
  ToolDraft,
} from "@/components/benchmarking/job-config"
import {
  eligibleEntries,
  type DatasetStructure,
} from "@/components/benchmarking/mapping-step/dataset"
import { PathSlot } from "@/components/benchmarking/mapping-step/path-slot"

const PATHS: Record<PathKey, { label: string; description: string }> = {
  sumstats_path: {
    label: "Summary statistics",
    description:
      "The GWAS summary statistics file, or a folder of per-chromosome files.",
  },
  genotype_path: {
    label: "Genotypes",
    description: "The folder holding the PLINK .bed/.bim/.fam files.",
  },
  phenotype_path: {
    label: "Phenotypes",
    description: "The phenotype file, with FID and IID columns.",
  },
  covariate_path: { label: "Covariates", description: "The covariate file." },
}

function countHint(rule: RoleRule): string {
  if (rule.min === rule.max)
    return rule.min === 1 ? "exactly one" : `exactly ${rule.min}`
  if (rule.max === Infinity) return `at least ${rule.min}`
  return `${rule.min} to ${rule.max}`
}

interface PopulationsEditorProps {
  definition: ToolDefinition
  draft: ToolDraft
  structure: DatasetStructure | null
  onUpdate: (update: (draft: ToolDraft) => ToolDraft) => void
}

/** Every population a tool takes, grouped by role, with the files each one needs. */
export function PopulationsEditor({
  definition,
  draft,
  structure,
  onUpdate,
}: PopulationsEditorProps) {
  const editPopulation = (id: string, changes: Partial<PopulationDraft>) =>
    onUpdate((current) => ({
      ...current,
      populations: current.populations.map((population) =>
        population.id === id ? { ...population, ...changes } : population
      ),
    }))

  const addPopulation = (rule: RoleRule) =>
    onUpdate((current) => ({
      ...current,
      populations: [...current.populations, newPopulation(rule.role)],
    }))

  // Unticking an optional file also clears it, as the old include checkboxes did.
  const setIncluded = (
    population: PopulationDraft,
    key: PathKey,
    included: boolean
  ) =>
    editPopulation(population.id, {
      included_paths: included
        ? [...population.included_paths, key]
        : population.included_paths.filter((path) => path !== key),
      ...(included ? {} : { [key]: "" }),
    })

  const removePopulation = (id: string) =>
    onUpdate((current) => ({
      ...current,
      populations: current.populations.filter(
        (population) => population.id !== id
      ),
    }))

  return (
    <div className="space-y-6">
      {definition.populations.map((rule) => {
        const populations = draft.populations.filter(
          (population) => population.role === rule.role
        )
        return (
          <section key={rule.role} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                {rule.label} population{rule.max === 1 ? "" : "s"}{" "}
                <span className="font-normal text-muted-foreground">
                  ({countHint(rule)})
                </span>
              </h4>
              {populations.length < rule.max && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addPopulation(rule)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add {rule.label.toLowerCase()} population
                </Button>
              )}
            </div>
            {populations.map((population) => (
              <Card key={population.id}>
                <CardHeader className="flex flex-row items-end gap-3 space-y-0 pb-3">
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={`${draft.tool}-${population.id}-name`}
                      className="text-xs"
                    >
                      {rule.label} name
                    </Label>
                    <Input
                      id={`${draft.tool}-${population.id}-name`}
                      placeholder="e.g. AFR"
                      value={population.name}
                      onChange={(event) =>
                        editPopulation(population.id, {
                          name: event.target.value,
                        })
                      }
                    />
                  </div>
                  {populations.length > rule.min && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${population.name || rule.label.toLowerCase()} population`}
                      onClick={() => removePopulation(population.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <CardTitle className="sr-only">
                    {population.name || rule.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rule.optionalPaths.length > 0 && (
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Also provide:
                      </span>
                      {rule.optionalPaths.map((key) => {
                        const id = `${draft.tool}-${population.id}-include-${key}`
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <Checkbox
                              id={id}
                              checked={population.included_paths.includes(key)}
                              onCheckedChange={(checked) =>
                                setIncluded(population, key, checked === true)
                              }
                            />
                            <Label htmlFor={id} className="font-normal">
                              {PATHS[key].label}
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {[
                      ...rule.requiredPaths,
                      ...rule.optionalPaths.filter((key) =>
                        population.included_paths.includes(key)
                      ),
                    ].map((key) => (
                      <PathSlot
                        key={key}
                        label={PATHS[key].label}
                        description={PATHS[key].description}
                        value={population[key]}
                        {...eligibleEntries(
                          structure,
                          key,
                          draft.sumstats_file_type
                        )}
                        onChange={(path) =>
                          editPopulation(population.id, { [key]: path })
                        }
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )
      })}
    </div>
  )
}
