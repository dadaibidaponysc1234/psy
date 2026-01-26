"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2, Send } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToolConfigurationNavigationProps {
  /** Callback for previous button */
  onPrevious?: () => void
  /** Callback for next/submit button */
  onNext?: () => void
  /** Whether this is the final step (changes button to Submit) */
  isFinalStep?: boolean
  /** Whether all tools are configured */
  allConfigured?: boolean
  /** Whether next/submit is disabled */
  nextDisabled?: boolean
  /** Whether previous is disabled */
  previousDisabled?: boolean
  /** Whether an operation is in progress */
  isLoading?: boolean
  /** Loading text */
  loadingText?: string
  /** Additional className */
  className?: string
}

/**
 * ToolConfigurationNavigation - Navigation for tool configuration step
 *
 * @example
 * <ToolConfigurationNavigation
 *   onPrevious={handleBack}
 *   onNext={handleSubmit}
 *   isFinalStep
 *   allConfigured={allToolsReady}
 *   isLoading={isSubmitting}
 * />
 */
export function ToolConfigurationNavigation({
  onPrevious,
  onNext,
  isFinalStep = false,
  allConfigured = false,
  nextDisabled = false,
  previousDisabled = false,
  isLoading = false,
  loadingText = "Submitting...",
  className,
}: ToolConfigurationNavigationProps) {
  const nextLabel = isFinalStep ? "Submit Job" : "Continue"
  const NextIcon = isFinalStep ? Send : ChevronRight

  return (
    <div className={cn("flex items-center justify-between border-t pt-4", className)}>
      <div>
        {onPrevious && (
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={previousDisabled || isLoading}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {isFinalStep && !allConfigured && (
          <span className="text-sm text-amber-600">
            Some tools are not fully configured
          </span>
        )}

        {onNext && (
          <Button
            onClick={onNext}
            disabled={nextDisabled || isLoading}
            variant={isFinalStep ? "default" : "default"}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {loadingText}
              </>
            ) : (
              <>
                {nextLabel}
                <NextIcon className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

export default ToolConfigurationNavigation
