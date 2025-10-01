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
import type { PrscsxTargetPopulation } from "@/stores/benchmarking-store"

interface PrscsxTargetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target?: PrscsxTargetPopulation
  onSubmit: (updates: Partial<Omit<PrscsxTargetPopulation, "id">>) => void
  mappedSummary?: {
    sumstatsPath?: string
    genotypePath?: string
    phenotypePath?: string
    covariatePath?: string
  }
}

const defaultTarget: PrscsxTargetPopulation = {
  id: "target",
  name: "",
  sumstatsPath: "",
  genotypePath: "",
  phenotypePath: "",
  covariatePath: "",
  includeCovariate: false,
}

export const PrscsxTargetModal: React.FC<PrscsxTargetModalProps> = ({
  open,
  onOpenChange,
  target,
  onSubmit,
  mappedSummary,
}) => {
  const [name, setName] = React.useState(target?.name ?? "")
  const [includeCovariate, setIncludeCovariate] = React.useState(
    target?.includeCovariate ?? false
  )

  React.useEffect(() => {
    if (open) {
      setName(target?.name ?? "")
      setIncludeCovariate(target?.includeCovariate ?? false)
    }
  }, [open, target?.name, target?.includeCovariate])

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && !open) {
      return
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const cleanName = name.trim()

    onSubmit({
      name: cleanName,
      includeCovariate,
    })

    handleClose(false)
  }

  const resolvedTarget = target ?? defaultTarget

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure Target Population</DialogTitle>
          <DialogDescription>
            Set the display name for the PRScsx target population and choose
            whether to collect a covariate mapping in addition to the required
            sumstats, genotype, and phenotype paths.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="prscsx-target-name">Target population name</Label>
            <Input
              id="prscsx-target-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. AFR"
              required
            />
            <p className="text-xs text-muted-foreground">
              This name appears in the mapping grid and final configuration
              under <code>prscsx.pre_processing.populations</code>.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-md border border-muted bg-muted/20 p-3">
            <Checkbox
              id="prscsx-target-covariate"
              checked={includeCovariate}
              onCheckedChange={(checked) =>
                setIncludeCovariate(Boolean(checked))
              }
            />
            <div className="space-y-1">
              <Label htmlFor="prscsx-target-covariate" className="font-medium">
                Include covariate mapping
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, the mapping surface will expose a covariate path
                slot for the target population (optional to fill).
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <h4 className="font-medium text-muted-foreground">
              Current mapping summary
            </h4>
            <ul className="space-y-1 rounded-md border border-dashed border-muted p-3 text-xs">
              <li>
                <span className="font-medium">Sumstats:</span>{" "}
                {mappedSummary?.sumstatsPath || resolvedTarget.sumstatsPath || "Not mapped"}
              </li>
              <li>
                <span className="font-medium">Genotype:</span>{" "}
                {mappedSummary?.genotypePath || resolvedTarget.genotypePath || "Not mapped"}
              </li>
              <li>
                <span className="font-medium">Phenotype:</span>{" "}
                {mappedSummary?.phenotypePath || resolvedTarget.phenotypePath || "Not mapped"}
              </li>
              {includeCovariate && (
                <li>
                  <span className="font-medium">Covariate:</span>{" "}
                  {mappedSummary?.covariatePath || resolvedTarget.covariatePath || "Not mapped"}
                </li>
              )}
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default PrscsxTargetModal
