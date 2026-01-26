"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Send, AlertTriangle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToolSubmissionStatus {
  toolId: string
  toolLabel: string
  isValid: boolean
  errorMessage?: string
}

export interface ToolConfigurationSubmitHandlerProps {
  /** Whether currently submitting */
  isSubmitting: boolean
  /** Callback for submission */
  onSubmit: () => void
  /** Optional callback for cancel */
  onCancel?: () => void
  /** Validation status for each tool */
  toolStatuses?: ToolSubmissionStatus[]
  /** Whether all tools are valid */
  allValid?: boolean
  /** Custom submit button label */
  submitLabel?: string
  /** Loading text during submission */
  loadingLabel?: string
  /** Error message if submission failed */
  errorMessage?: string | null
  /** Success message after submission */
  successMessage?: string | null
  /** Additional className */
  className?: string
}

/**
 * ToolConfigurationSubmitHandler - Submission UI for tool configuration
 *
 * Shows validation status, submit button, and loading/error states.
 *
 * @example
 * <ToolConfigurationSubmitHandler
 *   isSubmitting={isSubmitting}
 *   onSubmit={handleSubmit}
 *   toolStatuses={getToolStatuses()}
 *   allValid={allToolsValid}
 *   errorMessage={submitError}
 * />
 */
export function ToolConfigurationSubmitHandler({
  isSubmitting,
  onSubmit,
  onCancel,
  toolStatuses = [],
  allValid = true,
  submitLabel = "Submit Job",
  loadingLabel = "Submitting...",
  errorMessage,
  successMessage,
  className,
}: ToolConfigurationSubmitHandlerProps) {
  const invalidTools = toolStatuses.filter((t) => !t.isValid)
  const hasInvalidTools = invalidTools.length > 0

  return (
    <div className={cn("space-y-4", className)}>
      {/* Validation Summary */}
      {toolStatuses.length > 0 && (
        <div className="space-y-2">
          {toolStatuses.map((tool) => (
            <div
              key={tool.toolId}
              className="flex items-center gap-2 text-sm"
            >
              {tool.isValid ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              <span
                className={cn(
                  tool.isValid ? "text-muted-foreground" : "text-amber-600"
                )}
              >
                {tool.toolLabel}
                {!tool.isValid && tool.errorMessage && (
                  <span className="ml-1 text-xs">
                    - {tool.errorMessage}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {errorMessage}
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || hasInvalidTools || !allValid}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {loadingLabel}
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {submitLabel}
            </>
          )}
        </Button>
      </div>

      {/* Warning for invalid tools */}
      {hasInvalidTools && !isSubmitting && (
        <p className="text-right text-xs text-amber-600">
          {invalidTools.length} tool{invalidTools.length !== 1 ? "s" : ""} need
          configuration before submission
        </p>
      )}
    </div>
  )
}

export default ToolConfigurationSubmitHandler
