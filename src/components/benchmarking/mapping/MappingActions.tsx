"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MappingActionsProps {
  /** Callback for previous button */
  onPrevious?: () => void
  /** Callback for next button */
  onNext?: () => void
  /** Whether next button is disabled */
  nextDisabled?: boolean
  /** Whether previous button is disabled */
  previousDisabled?: boolean
  /** Whether an operation is in progress */
  isLoading?: boolean
  /** Custom label for next button */
  nextLabel?: string
  /** Custom label for previous button */
  previousLabel?: string
  /** Additional className */
  className?: string
}

/**
 * MappingActions - Navigation buttons for the mapping step
 *
 * @example
 * <MappingActions
 *   onPrevious={handleBack}
 *   onNext={handleContinue}
 *   nextDisabled={!isValid}
 *   isLoading={isSubmitting}
 * />
 */
export function MappingActions({
  onPrevious,
  onNext,
  nextDisabled = false,
  previousDisabled = false,
  isLoading = false,
  nextLabel = "Continue",
  previousLabel = "Back",
  className,
}: MappingActionsProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div>
        {onPrevious && (
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={previousDisabled || isLoading}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            {previousLabel}
          </Button>
        )}
      </div>

      <div>
        {onNext && (
          <Button
            onClick={onNext}
            disabled={nextDisabled || isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {nextLabel}
            {!isLoading && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  )
}

export default MappingActions
