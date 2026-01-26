"use client"

import React, { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface EvaluationTableSection {
  key: string
  label: string
  columns: string[]
  rows: Array<Record<string, string | number>>
}

export interface ResultsEvaluationTablesProps {
  /** R² evaluation tables */
  r2Tables?: EvaluationTableSection[]
  /** AUC evaluation tables */
  aucTables?: EvaluationTableSection[]
  /** Title for the section */
  title?: string
  /** Additional className */
  className?: string
}

/**
 * ResultsEvaluationTables - Display R² and AUC evaluation tables
 *
 * @example
 * <ResultsEvaluationTables
 *   r2Tables={evalR2}
 *   aucTables={evalAUC}
 *   title="PRScsx Evaluation"
 * />
 */
export function ResultsEvaluationTables({
  r2Tables = [],
  aucTables = [],
  title,
  className,
}: ResultsEvaluationTablesProps) {
  const hasR2 = r2Tables.length > 0
  const hasAUC = aucTables.length > 0

  if (!hasR2 && !hasAUC) {
    return null
  }

  const formatCellValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "-"
    if (typeof value === "number") {
      // Format numbers with reasonable precision
      if (Number.isInteger(value)) return value.toString()
      return value.toFixed(4)
    }
    return value
  }

  const renderTable = (section: EvaluationTableSection) => (
    <div key={section.key} className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {section.columns.map((col) => (
              <th
                key={col}
                className="px-3 py-2 text-left font-medium text-muted-foreground"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row, idx) => (
            <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
              {section.columns.map((col) => (
                <td key={col} className="px-3 py-2">
                  {formatCellValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {section.rows.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No data available
        </p>
      )}
    </div>
  )

  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
      )}

      {/* R² Tables */}
      {hasR2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              R² Evaluation
              <Badge variant="outline" className="text-xs">
                {r2Tables.length} table{r2Tables.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {r2Tables.map((table) => (
              <div key={table.key} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {table.label}
                </h4>
                {renderTable(table)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AUC Tables */}
      {hasAUC && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              AUC Evaluation
              <Badge variant="outline" className="text-xs">
                {aucTables.length} table{aucTables.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {aucTables.map((table) => (
              <div key={table.key} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {table.label}
                </h4>
                {renderTable(table)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ResultsEvaluationTables
