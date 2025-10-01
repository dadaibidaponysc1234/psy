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

interface BridgeprsPopulationConfigurationProps {
  toolId: string
  populations: ToolPopulationState
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onPopulationChange: (
    field: keyof ToolPopulationState,
    value: string
  ) => void
  onSave: () => void
  isCompleted: boolean
}

export const BridgeprsPopulationConfiguration: React.FC<
  BridgeprsPopulationConfigurationProps
> = ({
  toolId,
  populations,
  isOpen,
  onOpenChange,
  onPopulationChange,
  onSave,
  isCompleted,
}) => {
  const hasRequiredValues =
    Boolean(populations.targetPopulation) &&
    Boolean(populations.sourcePopulation)
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
                  ? "BridgePRS Population Configuration (Completed)"
                  : "BridgePRS Population Configuration"}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`bridgeprs-target-${toolId}`}>
                  Target Population Name
                </Label>
                <Input
                  id={`bridgeprs-target-${toolId}`}
                  placeholder="e.g., AFR, EUR, AMR"
                  value={populations.targetPopulation}
                  onChange={(event) =>
                    onPopulationChange("targetPopulation", event.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  The population you want to evaluate within BridgePRS
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`bridgeprs-base-${toolId}`}>
                  Base Population Name
                </Label>
                <Input
                  id={`bridgeprs-base-${toolId}`}
                  placeholder="e.g., EUR, AFR, AMR"
                  value={populations.sourcePopulation}
                  onChange={(event) =>
                    onPopulationChange("sourcePopulation", event.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Provide the cohort used to support BridgePRS model training
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
