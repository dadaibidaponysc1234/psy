"use client"

import { ChevronDown, ChevronRight, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type {
  PopulationDraft,
  Role,
  ToolDefinition,
} from "@/components/benchmarking/job-config"

const PLACEHOLDERS: Record<Role, string> = {
  target: "e.g., AFR, EUR, AMR",
  base: "e.g., EUR, AFR, AMR",
  auxiliary: "e.g., EUR, AFR, AMR",
  validation: "e.g., AFR, EUR",
}

const GRID_COLUMNS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
}

interface NamesPanelProps {
  definition: ToolDefinition
  populations: PopulationDraft[]
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onNameChange: (populationId: string, name: string) => void
  onSave: () => void
  isCompleted: boolean
}

/** A tool's population names, one per role, saved before its files can be mapped. */
export function NamesPanel({
  definition,
  populations,
  isOpen,
  onOpenChange,
  onNameChange,
  onSave,
  isCompleted,
}: NamesPanelProps) {
  const title = `${definition.label} Population Configuration`
  const allNamed = populations.every((population) => population.name.trim())

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <Card className="border-orange-200 bg-orange-50">
        <CollapsibleTrigger asChild>
          <CardHeader className="flex cursor-pointer items-start transition-colors hover:bg-orange-100/50">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">
                {isCompleted ? `${title} (Completed)` : title}
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
            <div
              className={`grid grid-cols-1 gap-4 ${GRID_COLUMNS[populations.length] ?? "sm:grid-cols-3"}`}
            >
              {definition.populations.map((rule) =>
                populations
                  .filter((population) => population.role === rule.role)
                  .map((population) => {
                    const id = `${definition.id}-${rule.role}-${population.id}`
                    return (
                      <div key={population.id} className="space-y-2">
                        <Label htmlFor={id}>{rule.label} Population Name</Label>
                        <Input
                          id={id}
                          placeholder={PLACEHOLDERS[rule.role]}
                          value={population.name}
                          onChange={(event) =>
                            onNameChange(population.id, event.target.value)
                          }
                        />
                        {rule.help && (
                          <p className="text-xs text-muted-foreground">
                            {rule.help}
                          </p>
                        )}
                      </div>
                    )
                  })
              )}
            </div>
            <Button
              onClick={onSave}
              disabled={!allNamed}
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
