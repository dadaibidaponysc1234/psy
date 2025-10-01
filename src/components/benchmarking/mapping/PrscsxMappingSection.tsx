"use client"

import React from "react"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, Users } from "lucide-react"
import {
  PrscsxBaseModal,
  PrscsxBaseModalValues,
} from "@/components/benchmarking/prscsx/PrscsxBaseModal"
import { PrscsxTargetModal } from "@/components/benchmarking/prscsx/PrscsxTargetModal"
import type {
  PrscsxBasePopulation,
  PrscsxPopulationState,
  PrscsxTargetPopulation,
} from "@/stores/benchmarking-store"

interface PrscsxMappingSectionProps {
  toolId: string
  isOpen: boolean
  onToggleOpen: (open: boolean) => void
  prscsxConfig?: PrscsxPopulationState
  mappingGrid: React.ReactNode
  getMappingPath: (fieldId: string) => string
  setTargetPopulation: (
    updates: Partial<Omit<PrscsxTargetPopulation, "id">>
  ) => void
  addBasePopulation: (base: {
    name: string
    includeGenotype: boolean
    includePhenotype: boolean
    includeCovariate: boolean
  }) => void
  updateBasePopulation: (
    baseId: string,
    updates: Partial<Omit<PrscsxBasePopulation, "id">>
  ) => void
  removeBasePopulation: (baseId: string) => void
  clearField: (fieldId: string) => void
}

type BaseModalState = {
  open: boolean
  mode: "create" | "edit"
  baseId?: string
}

export function PrscsxMappingSection({
  toolId,
  isOpen,
  onToggleOpen,
  prscsxConfig,
  mappingGrid,
  getMappingPath,
  setTargetPopulation,
  addBasePopulation,
  updateBasePopulation,
  removeBasePopulation,
  clearField,
}: PrscsxMappingSectionProps) {
  const [isTargetModalOpen, setTargetModalOpen] = React.useState(false)
  const [baseModalState, setBaseModalState] = React.useState<BaseModalState>({
    open: false,
    mode: "create",
  })

  if (!prscsxConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configure PRScsx</CardTitle>
          <CardDescription>
            Set up the PRScsx population configuration before mapping files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The PRScsx configuration has not been initialised yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  const bases = prscsxConfig.bases
  const targetPopulation = prscsxConfig.target

  const targetSummary = React.useMemo(
    () => ({
      sumstatsPath: getMappingPath("prscsx.target.sumstats_path"),
      genotypePath: getMappingPath("prscsx.target.genotype_path"),
      phenotypePath: getMappingPath("prscsx.target.phenotype_path"),
      covariatePath: getMappingPath("prscsx.target.covariate_path"),
    }),
    [getMappingPath]
  )

  const baseSummaries = React.useMemo(
    () =>
      bases.map((base) => {
        const prefix = `prscsx.base.${base.id}`
        return {
          base,
          mappings: {
            sumstats: getMappingPath(`${prefix}.sumstats_path`),
            genotype: getMappingPath(`${prefix}.genotype_path`),
            phenotype: getMappingPath(`${prefix}.phenotype_path`),
            covariate: getMappingPath(`${prefix}.covariate_path`),
          },
        }
      }),
    [bases, getMappingPath]
  )

  const activeBaseForModal = React.useMemo(() => {
    if (baseModalState.mode !== "edit" || !baseModalState.baseId) {
      return undefined
    }
    return bases.find((base) => base.id === baseModalState.baseId)
  }, [baseModalState.baseId, baseModalState.mode, bases])

  const activeBaseSummary = React.useMemo(() => {
    if (!baseModalState.baseId) {
      return undefined
    }
    const prefix = `prscsx.base.${baseModalState.baseId}`
    return {
      sumstatsPath: getMappingPath(`${prefix}.sumstats_path`),
      genotypePath: getMappingPath(`${prefix}.genotype_path`),
      phenotypePath: getMappingPath(`${prefix}.phenotype_path`),
      covariatePath: getMappingPath(`${prefix}.covariate_path`),
    }
  }, [baseModalState.baseId, getMappingPath])

  const handleTargetModalSubmit = (
    values: Partial<Omit<PrscsxTargetPopulation, "id">>
  ) => {
    const previousInclude = targetPopulation?.includeCovariate ?? false

    setTargetPopulation({
      name: values.name ?? targetPopulation?.name ?? "",
      includeCovariate:
        values.includeCovariate ?? targetPopulation?.includeCovariate ?? false,
    })

    if (previousInclude && values.includeCovariate === false) {
      clearField("prscsx.target.covariate_path")
    }

    setTargetModalOpen(false)
    toast.success("Target population updated")
  }

  const handleBaseModalSubmit = (values: PrscsxBaseModalValues) => {
    if (baseModalState.mode === "create") {
      addBasePopulation(values)
      toast.success("Base population added")
      setBaseModalState({ open: false, mode: "create" })
      return
    }

    if (baseModalState.mode === "edit" && baseModalState.baseId) {
      const baseId = baseModalState.baseId
      const existingBase = bases.find((base) => base.id === baseId)

      updateBasePopulation(baseId, values)

      if (existingBase) {
        const prefix = `prscsx.base.${baseId}`

        if (existingBase.includeGenotype && !values.includeGenotype) {
          clearField(`${prefix}.genotype_path`)
        }
        if (existingBase.includePhenotype && !values.includePhenotype) {
          clearField(`${prefix}.phenotype_path`)
        }
        if (existingBase.includeCovariate && !values.includeCovariate) {
          clearField(`${prefix}.covariate_path`)
        }
      }

      toast.success("Base population updated")
      setBaseModalState({ open: false, mode: "create" })
    }
  }

  const handleRemoveBase = (baseId: string) => {
    if (bases.length <= 1) {
      toast.error("At least one base population is required")
      return
    }

    removeBasePopulation(baseId)

    const prefix = `prscsx.base.${baseId}`
    clearField(`${prefix}.sumstats_path`)
    clearField(`${prefix}.genotype_path`)
    clearField(`${prefix}.phenotype_path`)
    clearField(`${prefix}.covariate_path`)

    if (baseModalState.mode === "edit" && baseModalState.baseId === baseId) {
      setBaseModalState({ open: false, mode: "create" })
    }

    toast.success("Base population removed")
  }

  const hasTargetConfiguration = Boolean(targetPopulation?.name?.trim())
  const targetComplete =
    Boolean(targetSummary.sumstatsPath) &&
    Boolean(targetSummary.genotypePath) &&
    Boolean(targetSummary.phenotypePath)

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={onToggleOpen}>
        <Card className="border-orange-200 bg-orange-50">
          <CollapsibleTrigger asChild>
            <CardHeader className="flex cursor-pointer items-start transition-colors hover:bg-orange-100/50">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-orange-900">
                  {hasTargetConfiguration
                    ? "Population Configuration (In Progress)"
                    : "Population Configuration"}
                </CardTitle>
                {isOpen ? (
                  <ChevronDown className="ml-2 h-4 w-4 text-orange-600" />
                ) : (
                  <ChevronRight className="ml-2 h-4 w-4 text-orange-600" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-orange-900">
                      Target population
                    </p>
                    <p className="text-xs text-muted-foreground">
                      A target population is required with sumstats, genotype,
                      and phenotype mappings.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setTargetModalOpen(true)}
                    variant="outline"
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Configure target
                  </Button>
                </div>

                <div className="rounded-lg border border-orange-100 bg-white/70 p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-orange-900">
                        {targetPopulation?.name || "Target population"}
                      </p>
                      <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <div>
                          <span className="font-semibold text-orange-900">
                            Sumstats:
                          </span>{" "}
                          {targetSummary.sumstatsPath || "Not mapped"}
                        </div>
                        <div>
                          <span className="font-semibold text-orange-900">
                            Genotype:
                          </span>{" "}
                          {targetSummary.genotypePath || "Not mapped"}
                        </div>
                        <div>
                          <span className="font-semibold text-orange-900">
                            Phenotype:
                          </span>{" "}
                          {targetSummary.phenotypePath || "Not mapped"}
                        </div>
                        {targetPopulation?.includeCovariate && (
                          <div>
                            <span className="font-semibold text-orange-900">
                              Covariate:
                            </span>{" "}
                            {targetSummary.covariatePath || "Not mapped"}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`border ${
                        targetComplete
                          ? "border-green-300 bg-green-50 text-green-700"
                          : "border-red-300 bg-red-50 text-red-700"
                      }`}
                    >
                      {targetComplete ? "Target ready" : "Mappings needed"}
                    </Badge>
                  </div>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setBaseModalState({ open: true, mode: "create" })
                    }
                  >
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
                                <span className="font-semibold text-orange-900">
                                  Sumstats:
                                </span>{" "}
                                {mappings.sumstats || "Not mapped"}
                              </div>
                              {base.includeGenotype && (
                                <div>
                                  <span className="font-semibold text-orange-900">
                                    Genotype:
                                  </span>{" "}
                                  {mappings.genotype || "Not mapped"}
                                </div>
                              )}
                              {base.includePhenotype && (
                                <div>
                                  <span className="font-semibold text-orange-900">
                                    Phenotype:
                                  </span>{" "}
                                  {mappings.phenotype || "Not mapped"}
                                </div>
                              )}
                              {base.includeCovariate && (
                                <div>
                                  <span className="font-semibold text-orange-900">
                                    Covariate:
                                  </span>{" "}
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
                              {baseComplete
                                ? "Sumstats mapped"
                                : "Sumstats missing"}
                            </Badge>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setBaseModalState({
                                    open: true,
                                    mode: "edit",
                                    baseId: base.id,
                                  })
                                }
                              >
                                <Pencil className="mr-2 h-4 w-4" /> Configure
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={bases.length <= 1}
                                onClick={() => handleRemoveBase(base.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Remove
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

      {mappingGrid}

      <PrscsxTargetModal
        open={isTargetModalOpen}
        onOpenChange={setTargetModalOpen}
        target={targetPopulation as PrscsxTargetPopulation | undefined}
        onSubmit={handleTargetModalSubmit}
        mappedSummary={targetSummary}
      />

      <PrscsxBaseModal
        open={baseModalState.open}
        onOpenChange={(open) =>
          setBaseModalState((prev) => ({
            ...prev,
            open,
            ...(open ? {} : { mode: "create", baseId: undefined }),
          }))
        }
        initialBase={activeBaseForModal}
        mode={baseModalState.mode}
        disableDelete={bases.length <= 1}
        mappedSummary={activeBaseSummary}
        onSubmit={handleBaseModalSubmit}
        onDelete={
          baseModalState.mode === "edit" && baseModalState.baseId
            ? () => handleRemoveBase(baseModalState.baseId as string)
            : undefined
        }
      />
    </>
  )
}
