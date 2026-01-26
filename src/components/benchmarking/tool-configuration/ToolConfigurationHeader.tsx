"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { EvaluationType } from "@/components/benchmarking/tool-configuration/types"

export interface ToolTabInfo {
  id: string
  label: string
  isConfigured: boolean
}

export interface ToolConfigurationHeaderProps {
  /** List of tools with their status */
  tools: ToolTabInfo[]
  /** Currently active tool tab */
  activeToolId: string
  /** Callback when tab changes */
  onTabChange: (toolId: string) => void
  /** Current evaluation type */
  evaluationType: EvaluationType
  /** Callback when evaluation type changes */
  onEvaluationTypeChange: (type: EvaluationType) => void
  /** Title to display */
  title?: string
  /** Additional className */
  className?: string
}

const EVALUATION_OPTIONS: { value: EvaluationType; label: string }[] = [
  { value: "both", label: "Both Binary & Quantitative" },
  { value: "binary", label: "Binary Only" },
  { value: "quantitative", label: "Quantitative Only" },
]

/**
 * ToolConfigurationHeader - Header for tool configuration step
 *
 * Displays tool tabs and evaluation type selector.
 *
 * @example
 * <ToolConfigurationHeader
 *   tools={[
 *     { id: 'prscsx', label: 'PRScsx', isConfigured: true },
 *     { id: 'bridgeprs', label: 'BridgePRS', isConfigured: false },
 *   ]}
 *   activeToolId={activeTool}
 *   onTabChange={setActiveTool}
 *   evaluationType={evalType}
 *   onEvaluationTypeChange={setEvalType}
 * />
 */
export function ToolConfigurationHeader({
  tools,
  activeToolId,
  onTabChange,
  evaluationType,
  onEvaluationTypeChange,
  title = "Configure Tools",
  className,
}: ToolConfigurationHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Title and Evaluation Type */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>

        <div className="flex items-center gap-2">
          <Label htmlFor="evaluation-type" className="whitespace-nowrap text-sm">
            Evaluation Type:
          </Label>
          <Select
            value={evaluationType}
            onValueChange={(v) => onEvaluationTypeChange(v as EvaluationType)}
          >
            <SelectTrigger id="evaluation-type" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVALUATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tool Tabs */}
      {tools.length > 1 && (
        <Tabs value={activeToolId} onValueChange={onTabChange}>
          <TabsList className="flex-wrap">
            {tools.map((tool) => (
              <TabsTrigger
                key={tool.id}
                value={tool.id}
                className="flex items-center gap-2"
              >
                {tool.label}
                {tool.isConfigured && (
                  <Badge variant="outline" className="text-xs">
                    ✓
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
    </div>
  )
}

export default ToolConfigurationHeader
