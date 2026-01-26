"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Folder, File, X, MapPin } from "lucide-react"
import { Droppable } from "@hello-pangea/dnd"
import { cn } from "@/lib/utils"

interface DirectoryItem {
  name: string
  path: string
  file_count?: number
  total_size?: number
  total_size_formatted?: string
}

interface FileInfo {
  name: string
  path: string
  size?: number
  size_formatted?: string
  file_type?: string
  is_previewable?: boolean
  last_modified?: string
}

export interface MappingDropZoneProps {
  /** Unique identifier for this drop zone */
  fieldId: string
  /** Display label for the field */
  label: string
  /** Description of what this field accepts */
  description?: string
  /** Accepted file types (e.g., ['.txt', '.gz']) or ['Directory'] for directories */
  acceptedTypes?: string[]
  /** Whether this field is required */
  required?: boolean
  /** Current value - can be a FileInfo, DirectoryItem, or path string */
  value?: FileInfo | DirectoryItem | string | null
  /** Callback when a file/directory is dropped or cleared */
  onUpdate: (value: FileInfo | DirectoryItem | null) => void
  /** Optional droppable ID override (defaults to fieldId) */
  droppableId?: string
  /** Additional className */
  className?: string
  /** Whether the dropzone is disabled */
  disabled?: boolean
}

/**
 * Get display name from mapping value
 */
function getDisplayName(value: FileInfo | DirectoryItem | string | null | undefined): string {
  if (!value) return ""
  if (typeof value === "string") {
    return value.split("/").filter(Boolean).pop() || value
  }
  return value.name || ""
}

/**
 * Get full path from mapping value
 */
function getPath(value: FileInfo | DirectoryItem | string | null | undefined): string {
  if (!value) return ""
  if (typeof value === "string") return value
  return value.path || ""
}

/**
 * Check if value is a directory
 */
function isDirectory(value: FileInfo | DirectoryItem | string | null | undefined): boolean {
  if (!value) return false
  if (typeof value === "string") return false
  // DirectoryItem has file_count, FileInfo has file_type
  return "file_count" in value
}

/**
 * MappingDropZone - A reusable drag-and-drop target for file/directory mapping
 *
 * This component provides a consistent UI for mapping files and directories
 * from the file explorer to tool configuration fields.
 *
 * @example
 * <MappingDropZone
 *   fieldId="target_population.sumstats_path"
 *   label="Summary Statistics"
 *   description="Summary statistics file for target population"
 *   acceptedTypes={['.txt', '.gz']}
 *   required
 *   value={mappings['target_population.sumstats_path']}
 *   onUpdate={(value) => handleUpdate('target_population.sumstats_path', value)}
 * />
 */
export function MappingDropZone({
  fieldId,
  label,
  description,
  acceptedTypes = ["Any file"],
  required = false,
  value,
  onUpdate,
  droppableId,
  className,
  disabled = false,
}: MappingDropZoneProps) {
  const hasValue = Boolean(value)
  const displayName = getDisplayName(value)
  const path = getPath(value)
  const isDir = isDirectory(value)

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onUpdate(null)
  }

  return (
    <div className={cn("space-y-1", className)}>
      {/* Field Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {required && (
            <Badge variant="outline" className="text-xs">
              Required
            </Badge>
          )}
        </div>
        {hasValue && (
          <Badge variant="default" className="text-xs">
            <MapPin className="mr-1 h-3 w-3" />
            Mapped
          </Badge>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {/* Drop Zone */}
      <Droppable droppableId={droppableId || fieldId} isDropDisabled={disabled}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "min-h-[60px] rounded-lg border-2 border-dashed p-3 transition-all",
              hasValue
                ? "border-primary/50 bg-primary/5"
                : "border-muted-foreground/25 bg-muted/30",
              snapshot.isDraggingOver &&
                "border-primary bg-primary/10 ring-2 ring-primary/20",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {hasValue ? (
              /* Mapped State */
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {isDir ? (
                    <Folder className="h-4 w-4 flex-shrink-0 text-primary" />
                  ) : (
                    <File className="h-4 w-4 flex-shrink-0 text-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {displayName}
                    </p>
                    <p
                      className="truncate text-xs text-muted-foreground"
                      title={path}
                    >
                      {path}
                    </p>
                  </div>
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={handleClear}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Clear mapping</span>
                  </Button>
                )}
              </div>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center text-center">
                <p className="text-sm text-muted-foreground">
                  Drag {isDir ? "a directory" : "a file"} here
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Accepts: {acceptedTypes.join(", ")}
                </p>
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}

export default MappingDropZone
