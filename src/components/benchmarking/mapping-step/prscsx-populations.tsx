"use client"

import { useState } from "react"
import { toast } from "react-hot-toast"
import { newPopulation } from "@/components/benchmarking/job-config"
import { withIncluded } from "@/components/benchmarking/mapping-step/mapping-fields"
import type {
  PathKey,
  PopulationDraft,
  ToolDraft,
} from "@/components/benchmarking/job-config"
import { PrscsxPopulationConfiguration } from "@/components/benchmarking/mapping/tools/prscsx-population-configuration"
import { PrscsxBaseModal } from "@/components/benchmarking/prscsx/PrscsxBaseModal"
import type { PrscsxBaseModalValues } from "@/components/benchmarking/prscsx/PrscsxBaseModal"
import { PrscsxTargetModal } from "@/components/benchmarking/prscsx/PrscsxTargetModal"
import type {
  PrscsxBasePopulation,
  PrscsxTargetPopulation,
} from "@/stores/benchmarking-store"

// The panel and dialogs predate the drafts; these adapt a population to the shapes they take.
const includes = (population: PopulationDraft, key: PathKey) =>
  population.included_paths.includes(key)

function toTarget(population: PopulationDraft): PrscsxTargetPopulation {
  return {
    id: population.id,
    name: population.name,
    sumstatsPath: population.sumstats_path,
    genotypePath: population.genotype_path,
    phenotypePath: population.phenotype_path,
    covariatePath: population.covariate_path,
    includeCovariate: includes(population, "covariate_path"),
  }
}

function toBase(population: PopulationDraft): PrscsxBasePopulation {
  return {
    ...toTarget(population),
    includeGenotype: includes(population, "genotype_path"),
    includePhenotype: includes(population, "phenotype_path"),
  }
}

const summary = (population: PopulationDraft) => ({
  sumstats: population.sumstats_path,
  genotype: population.genotype_path,
  phenotype: population.phenotype_path,
  covariate: population.covariate_path,
})

const pathSummary = (population: PopulationDraft) => ({
  sumstatsPath: population.sumstats_path,
  genotypePath: population.genotype_path,
  phenotypePath: population.phenotype_path,
  covariatePath: population.covariate_path,
})

interface PrscsxPopulationsProps {
  draft: ToolDraft
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (update: (draft: ToolDraft) => ToolDraft) => void
}

type BaseDialog = { open: boolean; mode: "create" | "edit"; baseId?: string }

/** PRS-CSx's target and any number of bases, configured through dialogs. */
export function PrscsxPopulations({
  draft,
  isOpen,
  onOpenChange,
  onUpdate,
}: PrscsxPopulationsProps) {
  const [targetOpen, setTargetOpen] = useState(false)
  const [baseDialog, setBaseDialog] = useState<BaseDialog>({
    open: false,
    mode: "create",
  })

  const target = draft.populations.find(
    (population) => population.role === "target"
  )
  const bases = draft.populations.filter(
    (population) => population.role === "base"
  )
  const editingBase =
    baseDialog.mode === "edit"
      ? bases.find((base) => base.id === baseDialog.baseId)
      : undefined

  const replace = (
    id: string,
    change: (population: PopulationDraft) => PopulationDraft
  ) =>
    onUpdate((current) => ({
      ...current,
      populations: current.populations.map((population) =>
        population.id === id ? change(population) : population
      ),
    }))

  const removeBase = (baseId: string) => {
    if (bases.length <= 1) {
      toast.error("At least one base population is required")
      return
    }
    onUpdate((current) => ({
      ...current,
      populations: current.populations.filter(
        (population) => population.id !== baseId
      ),
    }))
    if (baseDialog.mode === "edit" && baseDialog.baseId === baseId) {
      setBaseDialog({ open: false, mode: "create" })
    }
    toast.success("Base population removed")
  }

  return (
    <>
      <PrscsxTargetModal
        open={targetOpen}
        onOpenChange={setTargetOpen}
        target={target && toTarget(target)}
        mappedSummary={target && pathSummary(target)}
        onSubmit={(values) => {
          if (!target) return
          replace(target.id, (population) =>
            withIncluded(
              { ...population, name: values.name ?? population.name },
              {
                covariate_path:
                  values.includeCovariate ??
                  includes(population, "covariate_path"),
              }
            )
          )
          setTargetOpen(false)
          toast.success("Target population updated")
        }}
      />
      <PrscsxBaseModal
        open={baseDialog.open}
        onOpenChange={(open) =>
          setBaseDialog((current) =>
            open ? { ...current, open } : { open: false, mode: "create" }
          )
        }
        initialBase={editingBase && toBase(editingBase)}
        mode={baseDialog.mode}
        disableDelete={bases.length <= 1}
        mappedSummary={editingBase && pathSummary(editingBase)}
        onSubmit={(values: PrscsxBaseModalValues) => {
          const wanted = {
            genotype_path: values.includeGenotype,
            phenotype_path: values.includePhenotype,
            covariate_path: values.includeCovariate,
          }
          if (baseDialog.mode === "edit" && editingBase) {
            replace(editingBase.id, (population) =>
              withIncluded({ ...population, name: values.name }, wanted)
            )
            toast.success("Base population updated")
          } else {
            const base = withIncluded(
              { ...newPopulation("base"), name: values.name },
              wanted
            )
            onUpdate((current) => ({
              ...current,
              populations: [...current.populations, base],
            }))
            toast.success("Base population added")
          }
          setBaseDialog({ open: false, mode: "create" })
        }}
        onDelete={editingBase ? () => removeBase(editingBase.id) : undefined}
      />
      <PrscsxPopulationConfiguration
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        config={
          target ? { target: toTarget(target), bases: bases.map(toBase) } : null
        }
        targetMappings={target ? summary(target) : {}}
        targetComplete={Boolean(
          target?.sumstats_path && target.genotype_path && target.phenotype_path
        )}
        onConfigureTarget={() => setTargetOpen(true)}
        baseSummaries={bases.map((base) => ({
          base: toBase(base),
          mappings: summary(base),
        }))}
        onAddBase={() => setBaseDialog({ open: true, mode: "create" })}
        onEditBase={(baseId) =>
          setBaseDialog({ open: true, mode: "edit", baseId })
        }
        onRemoveBase={removeBase}
        disableRemoveBase={bases.length <= 1}
      />
    </>
  )
}
