"use client"

import React from "react"
import { Draggable } from "@hello-pangea/dnd"
import { File, Folder, GripVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface FileItem {
  name: string
  path: string
  size?: number
  size_formatted?: string
  file_type?: string
  is_previewable?: boolean
}

interface DirectoryItem {
  name: string
  path: string
  file_count?: number
  total_size_formatted?: string
}

export interface DraggableFileItemProps {
  /** Type: file or directory */
  type: "file" | "directory"
  /** Item data */
  data: FileItem | DirectoryItem
  /** Draggable index */
  index: number
  /** Draggable ID (typically the path) */
  draggableId: string
  /** Whether currently selected */
  isSelected?: boolean
  /** Callback when clicked */
  onClick?: () => void
  /** Show drag handle */
  showDragHandle?: boolean
  /** Additional className */
  className?: string
}

/**
 * Get file extension badge
 */
function getFileBadge(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase()
  if (ext && ["txt", "csv", "tsv", "bed", "bim", "fam", "gz"].includes(ext)) {
    return ext.toUpperCase()
  }
  return null
}

/**
 * DraggableFileItem - A draggable file or directory for mapping
 *
 * Wraps file/directory info in a Draggable for drag-and-drop mapping.
 *
 * @example
 * <DraggableFileItem
 *   type="file"
 *   data={{ name: "data.txt", path: "/uploads/data.txt", size_formatted: "1.2 KB" }}
 *   index={0}
 *   draggableId="/uploads/data.txt"
 *   isSelected={selectedPath === "/uploads/data.txt"}
 *   onClick={() => handleSelect(file)}
 * />
 */
export function DraggableFileItem({
  type,
  data,
  index,
  draggableId,
  isSelected = false,
  onClick,
  showDragHandle = true,
  className,
}: DraggableFileItemProps) {
  const isFile = type === "file"
  const fileData = data as FileItem
  const dirData = data as DirectoryItem
  const badge = isFile ? getFileBadge(fileData.name) : null

  return (
    <Draggable draggableId={draggableId} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "group flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 transition-all",
            snapshot.isDragging && "shadow-lg border-primary",
            isSelected && "border-primary bg-primary/5",
            !snapshot.isDragging && "hover:bg-accent",
            className
          )}
          onClick={onClick}
        >
          {/* Drag Handle */}
          {showDragHandle && (
            <div
              {...provided.dragHandleProps}
              className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          {/* Icon */}
          {isFile ? (
            <File className="h-4 w-4 flex-shrink-0 text-blue-500" />
          ) : (
            <Folder className="h-4 w-4 flex-shrink-0 text-yellow-500" />
          )}

          {/* Name and Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{data.name}</p>
            <p className="truncate text-xs text-muted-foreground" title={data.path}>
              {data.path}
            </p>
          </div>

          {/* Size/Count */}
          <span className="flex-shrink-0 text-xs text-muted-foreground">
            {isFile
              ? fileData.size_formatted || ""
              : `${dirData.file_count ?? 0} files`}
          </span>

          {/* Type Badge */}
          {badge && (
            <Badge variant="outline" className="flex-shrink-0 text-[10px]">
              {badge}
            </Badge>
          )}
        </div>
      )}
    </Draggable>
  )
}

export default DraggableFileItem
