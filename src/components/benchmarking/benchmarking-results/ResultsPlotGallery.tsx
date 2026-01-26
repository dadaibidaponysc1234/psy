"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export interface PlotItem {
  name: string
  path: string
  url: string
  content_type?: string
  is_previewable?: boolean
  tool?: string | null
  evaluation_type?: "quantitative" | "binary" | null
}

export interface ResultsPlotGalleryProps {
  /** Array of plot items to display */
  plots: PlotItem[]
  /** Title for the gallery section */
  title?: string
  /** Maximum plots to show before pagination */
  maxVisible?: number
  /** Function to resolve URLs */
  resolveUrl?: (url: string) => string
  /** Additional className */
  className?: string
}

/**
 * ResultsPlotGallery - A gallery component for displaying result plots
 *
 * Features:
 * - Grid layout with responsive columns
 * - Pagination for large galleries
 * - Click to preview in modal
 * - Evaluation type badges
 *
 * @example
 * <ResultsPlotGallery
 *   plots={plotsData}
 *   title="Quantitative Plots"
 *   maxVisible={6}
 * />
 */
export function ResultsPlotGallery({
  plots,
  title = "Plots",
  maxVisible = 12,
  resolveUrl = (url) => url,
  className,
}: ResultsPlotGalleryProps) {
  const [page, setPage] = useState(0)
  const [previewPlot, setPreviewPlot] = useState<PlotItem | null>(null)

  const totalPages = Math.ceil(plots.length / maxVisible)
  const visiblePlots = useMemo(() => {
    const start = page * maxVisible
    return plots.slice(start, start + maxVisible)
  }, [plots, page, maxVisible])

  const handlePrevPage = () => {
    setPage((p) => Math.max(0, p - 1))
  }

  const handleNextPage = () => {
    setPage((p) => Math.min(totalPages - 1, p + 1))
  }

  const formatPlotName = (name: string) => {
    return name
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  if (plots.length === 0) {
    return null
  }

  return (
    <>
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              {title}
              <Badge variant="outline" className="ml-2">
                {plots.length}
              </Badge>
            </CardTitle>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handlePrevPage}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleNextPage}
                  disabled={page === totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visiblePlots.map((plot, index) => (
              <button
                key={`${plot.path}-${index}`}
                type="button"
                className="group relative overflow-hidden rounded-lg border bg-muted/30 transition-all hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={() => setPreviewPlot(plot)}
              >
                <div className="aspect-square w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveUrl(plot.url)}
                    alt={plot.name}
                    className="h-full w-full object-contain p-2"
                    loading="lazy"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="truncate text-xs font-medium text-white">
                    {formatPlotName(plot.name)}
                  </p>
                  {plot.evaluation_type && (
                    <Badge
                      variant="outline"
                      className="mt-1 text-[10px] opacity-80"
                    >
                      {plot.evaluation_type}
                    </Badge>
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/10">
                  <ImageIcon className="h-6 w-6 text-white opacity-0 transition-all group-hover:opacity-70" />
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={!!previewPlot} onOpenChange={() => setPreviewPlot(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewPlot && formatPlotName(previewPlot.name)}
              {previewPlot?.evaluation_type && (
                <Badge variant="outline" className="text-xs">
                  {previewPlot.evaluation_type}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewPlot && (
            <div className="flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveUrl(previewPlot.url)}
                alt={previewPlot.name}
                className="max-h-[70vh] max-w-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ResultsPlotGallery
