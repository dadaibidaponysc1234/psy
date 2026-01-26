"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface MissingField {
  id: string
  label: string
  required: boolean
}

export interface MappingValidationPanelProps {
  /** Tool identifier for display */
  toolId: string
  /** Tool display name */
  toolLabel?: string
  /** List of missing required fields */
  missingFields: MissingField[]
  /** Whether all required fields are satisfied */
  isValid: boolean
  /** Additional className */
  className?: string
  /** Compact mode - shows only badge, no field list */
  compact?: boolean
}

/**
 * MappingValidationPanel - Shows validation status for tool mappings
 *
 * Displays which required fields are missing and overall validation state.
 *
 * @example
 * <MappingValidationPanel
 *   toolId="prscsx"
 *   toolLabel="PRScsx"
 *   missingFields={getMissingMappingsForTool('prscsx')}
 *   isValid={isToolValid('prscsx')}
 * />
 */
export function MappingValidationPanel({
  toolId,
  toolLabel,
  missingFields,
  isValid,
  className,
  compact = false,
}: MappingValidationPanelProps) {
  const displayName = toolLabel || toolId

  // Filter to only required missing fields
  const requiredMissing = missingFields.filter((f) => f.required)
  const hasMissing = requiredMissing.length > 0

  if (compact) {
    return (
      <Badge
        variant={isValid ? "default" : "outline"}
        className={cn("text-xs", !isValid && "border-red-500 text-red-600", className)}
      >
        {isValid ? (
          <>
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Valid
          </>
        ) : (
          <>
            <AlertTriangle className="mr-1 h-3 w-3" />
            {requiredMissing.length} missing
          </>
        )}
      </Badge>
    )
  }

  if (isValid) {
    return (
      <div
        className={cn(
          "rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {displayName} configuration is complete
          </span>
        </div>
        <p className="mt-1 text-xs text-green-600 dark:text-green-400">
          All required fields have been mapped.
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
          {displayName} has {requiredMissing.length} missing required{" "}
          {requiredMissing.length === 1 ? "field" : "fields"}
        </span>
      </div>
      {hasMissing && (
        <ul className="mt-2 list-inside list-disc space-y-1">
          {requiredMissing.map((field) => (
            <li
              key={field.id}
              className="text-xs text-amber-600 dark:text-amber-400"
            >
              {field.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default MappingValidationPanel
