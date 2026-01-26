"use client"

import React, { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, FileText, Search, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ArtifactItem {
  name: string
  path: string
  size?: number
  size_formatted?: string
  last_modified?: string
  content_type?: string
  url: string
  is_previewable?: boolean
}

export interface ResultsArtifactListProps {
  /** Array of artifact items */
  artifacts: ArtifactItem[]
  /** Title for the section */
  title?: string
  /** Function to resolve/transform URLs */
  resolveUrl?: (url: string) => string
  /** Callback when preview is clicked */
  onPreview?: (artifact: ArtifactItem) => void
  /** Whether files can be previewed */
  enablePreview?: boolean
  /** Show search filter */
  showSearch?: boolean
  /** Additional className */
  className?: string
}

/**
 * Format file size for display
 */
function formatSize(size?: number, formatted?: string): string {
  if (formatted) return formatted
  if (size === undefined) return ""
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Get file type badge label
 */
function getFileTypeBadge(name: string, contentType?: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase()
  if (ext && ["txt", "csv", "tsv", "log", "json", "gz", "zip"].includes(ext)) {
    return ext.toUpperCase()
  }
  return null
}

/**
 * ResultsArtifactList - List of downloadable/viewable artifacts
 *
 * @example
 * <ResultsArtifactList
 *   artifacts={manifestArtifacts}
 *   title="Output Files"
 *   onPreview={(artifact) => openPreview(artifact)}
 *   showSearch
 * />
 */
export function ResultsArtifactList({
  artifacts,
  title = "Files",
  resolveUrl = (url) => url,
  onPreview,
  enablePreview = true,
  showSearch = true,
  className,
}: ResultsArtifactListProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredArtifacts = useMemo(() => {
    if (!searchQuery.trim()) return artifacts
    const q = searchQuery.toLowerCase()
    return artifacts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.path.toLowerCase().includes(q) ||
        (a.content_type || "").toLowerCase().includes(q)
    )
  }, [artifacts, searchQuery])

  if (artifacts.length === 0) {
    return null
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            {title}
            <Badge variant="outline">{artifacts.length}</Badge>
          </CardTitle>
          {showSearch && artifacts.length > 5 && (
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y rounded-md border">
          {filteredArtifacts.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No files match your search
            </div>
          ) : (
            filteredArtifacts.map((artifact, index) => {
              const typeBadge = getFileTypeBadge(artifact.name, artifact.content_type)

              return (
                <div
                  key={`${artifact.path}-${index}`}
                  className="flex items-center justify-between gap-4 p-3 hover:bg-muted/50"
                >
                  {/* File Info */}
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {artifact.name}
                      </p>
                      <p
                        className="truncate text-xs text-muted-foreground"
                        title={artifact.path}
                      >
                        {artifact.path}
                      </p>
                    </div>
                    {typeBadge && (
                      <Badge variant="outline" className="flex-shrink-0 text-[10px]">
                        {typeBadge}
                      </Badge>
                    )}
                    {artifact.size !== undefined && (
                      <span className="flex-shrink-0 text-xs text-muted-foreground">
                        {formatSize(artifact.size, artifact.size_formatted)}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-shrink-0 items-center gap-1">
                    {enablePreview && artifact.is_previewable && onPreview && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPreview(artifact)}
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Preview
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={resolveUrl(artifact.url)}
                        download={artifact.name}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ResultsArtifactList
