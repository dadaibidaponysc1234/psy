"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Download,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface ResultsHeaderProps {
  /** Job ID to display */
  jobId: string
  /** Current job status from backend */
  status: {
    label: string
    className: string
    Icon: React.ElementType
  }
  /** Whether data is currently loading */
  isLoading?: boolean
  /** Callback for back button */
  onBack?: () => void
  /** Callback for refresh button */
  onRefresh?: () => void
  /** URL for downloading results archive */
  archiveUrl?: string
  /** Additional className */
  className?: string
}

/**
 * ResultsHeader - Header component for benchmarking results page
 *
 * Displays job ID, status badge, and action buttons (back, refresh, download).
 *
 * @example
 * <ResultsHeader
 *   jobId="abc123"
 *   status={{ label: 'Completed', className: 'bg-green-100 text-green-800', Icon: CheckCircle }}
 *   onBack={() => navigate('/benchmarking')}
 *   onRefresh={() => fetchResults()}
 *   archiveUrl="/api/jobs/abc123/results/archive.zip"
 * />
 */
export function ResultsHeader({
  jobId,
  status,
  isLoading = false,
  onBack,
  onRefresh,
  archiveUrl,
  className,
}: ResultsHeaderProps) {
  const StatusIcon = status.Icon

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      {/* Left side: Title and Status */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        )}
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Benchmarking Results
          </h1>
          <p className="text-sm text-muted-foreground">
            Job ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{jobId}</code>
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn("flex items-center gap-1.5", status.className)}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </Badge>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        )}
        {archiveUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={archiveUrl} download>
              <Download className="mr-2 h-4 w-4" />
              Download All
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

export default ResultsHeader
