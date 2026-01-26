"use client"

import React from "react"
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"

import type {
  PrscsxPopulationState,
  PrscsxTargetPopulation,
  PrscsxBasePopulation,
} from "@/stores/benchmarking-store"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface PopulationMappingSummary {
  sumstats?: string
  genotype?: string
  phenotype?: string
  covariate?: string
}

interface BasePopulationSummary {
  base: PrscsxBasePopulation
  mappings: PopulationMappingSummary
}

interface PrscsxPopulationConfigurationProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  config: PrscsxPopulationState | null
  targetMappings: PopulationMappingSummary
  targetComplete: boolean
  onConfigureTarget: () => void
  baseSummaries: BasePopulationSummary[]
  onAddBase: () => void
  onEditBase: (baseId: string) => void
  onRemoveBase: (baseId: string) => void
  disableRemoveBase: boolean
}

export const PrscsxPopulationConfiguration: React.FC<
  PrscsxPopulationConfigurationProps
> = ({
  isOpen,
  onOpenChange,
  config,
  targetMappings,
  targetComplete,
  onConfigureTarget,
  baseSummaries,
  onAddBase,
  onEditBase,
  onRemoveBase,
  disableRemoveBase,
}) => {
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <Card className="border-orange-200 bg-orange-50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer transition-colors hover:bg-orange-100/50">
            <div className="flex w-full items-center justify-between">
              <CardTitle className="text-orange-900">
                PRScsx Population Configuration
              </CardTitle>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-orange-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-orange-600" />
              )}
            </div>
            <CardDescription className="text-orange-700">
              Manage the PRScsx target population and base populations. These
              settings drive the mapping cards and final configuration payload.
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-orange-100 bg-white/70 p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-orange-900">
                    Target population
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {config?.target.name ? config.target.name : "Not yet named"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`border ${
                      targetComplete
                        ? "border-green-300 bg-green-50 text-green-700"
                        : "border-red-300 bg-red-50 text-red-700"
                    }`}
                  >
                    {targetComplete
                      ? "Required mappings complete"
                      : "Missing required mappings"}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={onConfigureTarget}>
                    <Pencil className="mr-2 h-4 w-4" /> Configure target
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div>
                  <span className="font-semibold text-orange-900">Sumstats:</span>{" "}
                  {targetMappings.sumstats || "Not mapped"}
                </div>
                <div>
                  <span className="font-semibold text-orange-900">Genotype:</span>{" "}
                  {targetMappings.genotype || "Not mapped"}
                </div>
                <div>
                  <span className="font-semibold text-orange-900">Phenotype:</span>{" "}
                  {targetMappings.phenotype || "Not mapped"}
                </div>
                {config?.target.includeCovariate && (
                  <div>
                    <span className="font-semibold text-orange-900">Covariate:</span>{" "}
                    {targetMappings.covariate || "Not mapped"}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-orange-900">
                    Base populations
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Configure at least one base population. Sumstats mapping is
                    required for each base; other mappings are optional.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={onAddBase}>
                  <Plus className="mr-2 h-4 w-4" /> Add base population
                </Button>
              </div>

              <div className="space-y-3">
                {baseSummaries.map(({ base, mappings }) => {
                  const baseComplete = Boolean(mappings.sumstats)

                  return (
                    <div
                      key={base.id}
                      className="rounded-lg border border-orange-100 bg-white/70 p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-orange-900">
                            {base.name || "Unnamed base population"}
                          </p>
                          <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                            <div>
                              <span className="font-semibold text-orange-900">Sumstats:</span>{" "}
                              {mappings.sumstats || "Not mapped"}
                            </div>
                            {base.includeGenotype && (
                              <div>
                                <span className="font-semibold text-orange-900">Genotype:</span>{" "}
                                {mappings.genotype || "Not mapped"}
                              </div>
                            )}
                            {base.includePhenotype && (
                              <div>
                                <span className="font-semibold text-orange-900">Phenotype:</span>{" "}
                                {mappings.phenotype || "Not mapped"}
                              </div>
                            )}
                            {base.includeCovariate && (
                              <div>
                                <span className="font-semibold text-orange-900">Covariate:</span>{" "}
                                {mappings.covariate || "Not mapped"}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-row gap-2 sm:flex-col sm:items-end">
                          <Badge
                            variant="outline"
                            className={`border ${
                              baseComplete
                                ? "border-green-300 bg-green-50 text-green-700"
                                : "border-red-300 bg-red-50 text-red-700"
                            }`}
                          >
                            {baseComplete ? "Sumstats mapped" : "Sumstats missing"}
                          </Badge>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEditBase(base.id)}
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Configure
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={disableRemoveBase}
                              onClick={() => onRemoveBase(base.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
