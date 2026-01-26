"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface ToolStageSummary {
  preprocessing?: "succeeded" | "failed" | "skipped" | "unknown"
  processing?: "succeeded" | "failed" | "skipped" | "unknown"
  evaluation_r2?: "succeeded" | "missing" | "unknown"
  evaluation_auc?: "succeeded" | "missing" | "unknown"
  messages?: string | null
}

export interface ResultsToolSummaryProps {
  /** Tool identifier */
  toolId: string
  /** Display name for the tool */
  toolLabel?: string
  /** Stage summary data */
  summary?: ToolStageSummary
  /** R² metric value */
  r2?: string | number
  /** AUC metric value */
  auc?: string | number
  /** Additional className */
  className?: string
}

/**
 * Render a status badge for a pipeline stage
 */
function StageBadge({ value }: { value?: string }) {
  const v = (value || "unknown").toLowerCase()

  let cls = "bg-muted text-muted-foreground border-border"
  let label = v

  switch (v) {
    case "succeeded":
      cls = "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
      label = "Succeeded"
      break
    case "failed":
      cls = "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
      label = "Failed"
      break
    case "skipped":
      cls = "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
      label = "Skipped"
      break
    case "missing":
      cls = "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
      label = "Missing"
      break
    default:
      cls = "bg-muted text-muted-foreground border-border"
      label = "Unknown"
      break
  }

  return (
    <Badge variant="outline" className={cn("text-xs", cls)}>
      {label}
    </Badge>
  )
}

/**
 * ResultsToolSummary - Display execution summary for a specific tool
 *
 * Shows pipeline stage statuses (preprocessing, processing, evaluation)
 * and key metrics (R², AUC).
 *
 * @example
 * <ResultsToolSummary
 *   toolId="prscsx"
 *   toolLabel="PRScsx"
 *   summary={toolSummary['prscsx']}
 *   r2={0.234}
 *   auc={0.789}
 * />
 */
export function ResultsToolSummary({
  toolId,
  toolLabel,
  summary,
  r2,
  auc,
  className,
}: ResultsToolSummaryProps) {
  const displayName = toolLabel || toolId

  const formatMetric = (value?: string | number) => {
    if (value === null || value === undefined) return "-"
    if (typeof value === "number") return value.toFixed(4)
    return value
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{displayName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pipeline Stages */}
        {summary && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Pipeline Status
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between rounded-md border p-2">
                <span className="text-muted-foreground">Preprocessing</span>
                <StageBadge value={summary.preprocessing} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <span className="text-muted-foreground">Processing</span>
                <StageBadge value={summary.processing} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <span className="text-muted-foreground">R² Eval</span>
                <StageBadge value={summary.evaluation_r2} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <span className="text-muted-foreground">AUC Eval</span>
                <StageBadge value={summary.evaluation_auc} />
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        {(r2 !== undefined || auc !== undefined) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Key Metrics
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {r2 !== undefined && (
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">R²</p>
                  <p className="text-lg font-semibold">{formatMetric(r2)}</p>
                </div>
              )}
              {auc !== undefined && (
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">AUC</p>
                  <p className="text-lg font-semibold">{formatMetric(auc)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        {summary?.messages && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">
              Messages
            </h4>
            <p className="text-sm text-muted-foreground">{summary.messages}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ResultsToolSummary
