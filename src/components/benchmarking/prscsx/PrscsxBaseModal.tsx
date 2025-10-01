"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { PrscsxBasePopulation } from "@/stores/benchmarking-store"

export interface PrscsxBaseModalValues {
  name: string
  includeGenotype: boolean
  includePhenotype: boolean
  includeCovariate: boolean
}

interface PrscsxBaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialBase?: PrscsxBasePopulation
  mode: "create" | "edit"
  disableDelete?: boolean
  mappedSummary?: {
    sumstatsPath?: string
    genotypePath?: string
    phenotypePath?: string
    covariatePath?: string
  }
  onSubmit: (values: PrscsxBaseModalValues) => void
  onDelete?: () => void
}

const defaultBaseValues: PrscsxBaseModalValues = {
  name: "",
  includeGenotype: false,
  includePhenotype: false,
  includeCovariate: false,
}

export const PrscsxBaseModal: React.FC<PrscsxBaseModalProps> = ({
  open,
  onOpenChange,
  initialBase,
  mode,
  disableDelete,
  mappedSummary,
  onSubmit,
  onDelete,
}) => {
  const [formState, setFormState] = React.useState<PrscsxBaseModalValues>(
    initialBase
      ? {
          name: initialBase.name,
          includeGenotype: initialBase.includeGenotype,
          includePhenotype: initialBase.includePhenotype,
          includeCovariate: initialBase.includeCovariate,
        }
      : defaultBaseValues
  )

  React.useEffect(() => {
    if (open) {
      if (initialBase) {
        setFormState({
          name: initialBase.name,
          includeGenotype: initialBase.includeGenotype,
          includePhenotype: initialBase.includePhenotype,
          includeCovariate: initialBase.includeCovariate,
        })
      } else {
        setFormState(defaultBaseValues)
      }
    }
  }, [open, initialBase?.name, initialBase?.includeGenotype, initialBase?.includePhenotype, initialBase?.includeCovariate])

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && !open) {
      return
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit({
      name: formState.name.trim(),
      includeGenotype: formState.includeGenotype,
      includePhenotype: formState.includePhenotype,
      includeCovariate: formState.includeCovariate,
    })
    handleClose(false)
  }

  const handleCheckboxChange = (key: keyof PrscsxBaseModalValues) =>
    (checked: boolean | "indeterminate") => {
      setFormState((prev) => ({
        ...prev,
        [key]: Boolean(checked),
      }))
    }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Base Population" : "Edit Base Population"}
          </DialogTitle>
          <DialogDescription>
            Each base population contributes at least a sumstats mapping. Enable
            additional paths if you plan to provide genotype, phenotype, or
            covariate files for this base cohort.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="prscsx-base-name">Base population name</Label>
            <Input
              id="prscsx-base-name"
              value={formState.name}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              placeholder="e.g. EUR"
              required
            />
            <p className="text-xs text-muted-foreground">
              Appears under <code>prscsx.pre_processing.populations</code> and in
              the mapping grid headers.
            </p>
          </div>

          <fieldset className="space-y-3 rounded-md border border-muted bg-muted/20 p-3">
            <legend className="text-sm font-semibold">Optional mappings</legend>
            <div className="flex items-start gap-3">
              <Checkbox
                id="prscsx-base-genotype"
                checked={formState.includeGenotype}
                onCheckedChange={handleCheckboxChange("includeGenotype")}
              />
              <div>
                <Label htmlFor="prscsx-base-genotype" className="font-medium">
                  Include genotype directory
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enables a mapping card for the base population&rsquo;s genotype
                  directory.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="prscsx-base-phenotype"
                checked={formState.includePhenotype}
                onCheckedChange={handleCheckboxChange("includePhenotype")}
              />
              <div>
                <Label htmlFor="prscsx-base-phenotype" className="font-medium">
                  Include phenotype file
                </Label>
                <p className="text-xs text-muted-foreground">
                  Adds an optional phenotype mapping for this base population.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="prscsx-base-covariate"
                checked={formState.includeCovariate}
                onCheckedChange={handleCheckboxChange("includeCovariate")}
              />
              <div>
                <Label htmlFor="prscsx-base-covariate" className="font-medium">
                  Include covariate file
                </Label>
                <p className="text-xs text-muted-foreground">
                  Adds an optional covariate mapping slot for this base
                  population.
                </p>
              </div>
            </div>
          </fieldset>

          <div className="space-y-2 text-sm">
            <h4 className="font-medium text-muted-foreground">
              Current mapping summary
            </h4>
            <ul className="space-y-1 rounded-md border border-dashed border-muted p-3 text-xs">
              <li>
                <span className="font-medium">Sumstats:</span>{" "}
                {mappedSummary?.sumstatsPath || "Not mapped"}
              </li>
              {formState.includeGenotype && (
                <li>
                  <span className="font-medium">Genotype:</span>{" "}
                  {mappedSummary?.genotypePath || "Not mapped"}
                </li>
              )}
              {formState.includePhenotype && (
                <li>
                  <span className="font-medium">Phenotype:</span>{" "}
                  {mappedSummary?.phenotypePath || "Not mapped"}
                </li>
              )}
              {formState.includeCovariate && (
                <li>
                  <span className="font-medium">Covariate:</span>{" "}
                  {mappedSummary?.covariatePath || "Not mapped"}
                </li>
              )}
            </ul>
          </div>

          <div className="flex justify-between gap-2">
            {mode === "edit" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={disableDelete}
                onClick={() => {
                  if (!disableDelete) {
                    onDelete?.()
                    handleClose(false)
                  }
                }}
              >
                Remove base population
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {mode === "create" ? "Add population" : "Save changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default PrscsxBaseModal
