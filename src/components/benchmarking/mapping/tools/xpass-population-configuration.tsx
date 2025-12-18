"use client"

import React from "react"
import { Users, ChevronDown, ChevronRight } from "lucide-react"

import type { ToolPopulationState } from "@/stores/benchmarking-store"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface XpassPopulationConfigurationProps {
  toolId: string
  populations: ToolPopulationState
  validationName: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onPopulationChange: (field: keyof ToolPopulationState, value: string) => void
  onValidationChange: (value: string) => void
  onSave: () => void
  isCompleted: boolean
}

export const XpassPopulationConfiguration: React.FC<
  XpassPopulationConfigurationProps
> = ({
  toolId,
  populations,
  validationName,
  isOpen,
  onOpenChange,
  onPopulationChange,
  onValidationChange,
  onSave,
  isCompleted,
}) => {
  const toolLabel = toolId.toLowerCase() === "xpass+" ? "XPASS+" : "XPASS"
  const hasRequiredValues =
    Boolean(populations.targetPopulation) &&
    Boolean(populations.sourcePopulation) &&
    Boolean(validationName)
  const isSaveDisabled = !hasRequiredValues

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <Card className="border-orange-200 bg-orange-50">
        <CollapsibleTrigger asChild>
          <CardHeader className="flex cursor-pointer items-start transition-colors hover:bg-orange-100/50">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">
                {isCompleted
                  ? `${toolLabel} Population Configuration (Completed)`
                  : `${toolLabel} Population Configuration`}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor={`xpass-target-${toolId}`}>
                  Target Population Name
                </Label>
                <Input
                  id={`xpass-target-${toolId}`}
                  placeholder="e.g., AFR, EUR, AMR"
                  value={populations.targetPopulation}
                  onChange={(event) =>
                    onPopulationChange("targetPopulation", event.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  The population you want to evaluate with {toolLabel}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`xpass-aux-${toolId}`}>
                  Auxiliary Population Name
                </Label>
                <Input
                  id={`xpass-aux-${toolId}`}
                  placeholder="e.g., EUR, AFR, AMR"
                  value={populations.sourcePopulation}
                  onChange={(event) =>
                    onPopulationChange("sourcePopulation", event.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Provide the cohort used as the auxiliary population in{" "}
                  {toolLabel}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`xpass-validation-${toolId}`}>
                  Validation Population Name
                </Label>
                <Input
                  id={`xpass-validation-${toolId}`}
                  placeholder="e.g., AFR, EUR"
                  value={validationName}
                  onChange={(event) => onValidationChange(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Independent cohort used for evaluating {toolLabel} outputs
                </p>
              </div>
            </div>
            <Button
              onClick={onSave}
              disabled={isSaveDisabled}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Save Population Names
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}