"use client"

import React from "react"
import { Folder, File, Archive, ChevronRight, ChevronDown, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Draggable } from "@hello-pangea/dnd"
import { cn } from "@/lib/utils"

export interface FileItem {
  name: string
  path: string
  size?: number
  size_formatted?: string
  file_type?: string
  is_previewable?: boolean
  last_modified?: string
}

export interface DirectoryItem {
  name: string
  path: string
  file_count?: number
  total_size?: number
  total_size_formatted?: string
}

export interface FileTreeNodeProps {
  /** Type of node: file or directory */
  type: "file" | "directory"
  /** Node data */
  data: FileItem | DirectoryItem
  /** Nesting level for indentation */
  level?: number
  /** Whether this node is currently selected */
  isSelected?: boolean
  /** Whether this directory is expanded (only for directories) */
  isExpanded?: boolean
  /** Callback when node is clicked */
  onClick?: () => void
  /** Callback to toggle expansion (only for directories) */
  onToggle?: () => void
  /** Callback for preview button (only for previewable files) */
  onPreview?: (e: React.MouseEvent) => void
  /** Draggable index for drag-and-drop */
  draggableIndex?: number
  /** Draggable ID for drag-and-drop */
  draggableId?: string
  /** Whether to show file type badge */
  showBadge?: boolean
  /** Additional className */
  className?: string
}

/**
 * Get file icon based on file type
 */
function getFileIcon(fileName: string, fileType?: string) {
  const ext = fileName.split(".").pop()?.toLowerCase()
  
  // Archive files
  if (ext === "zip" || ext === "gz" || ext === "tar") {
    return <Archive className="h-4 w-4 flex-shrink-0 text-amber-500" />
  }
  
  // Default file icon
  return <File className="h-4 w-4 flex-shrink-0 text-blue-500" />
}

/**
 * Check if file should show a type badge
 */
function shouldShowBadge(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase()
  return ["txt", "csv", "tsv", "bed", "bim", "fam", "gz"].includes(ext || "")
}

/**
 * FileTreeNode - A single node in the file tree (file or directory)
 *
 * Supports:
 * - Drag-and-drop via react-beautiful-dnd / @hello-pangea/dnd
 * - Expand/collapse for directories
 * - Preview button for previewable files
 * - Selection highlighting
 *
 * @example
 * <FileTreeNode
 *   type="file"
 *   data={{ name: "data.txt", path: "/uploads/data.txt", size_formatted: "1.2 KB" }}
 *   level={1}
 *   isSelected={selectedFile?.path === "/uploads/data.txt"}
 *   onClick={() => handleFileSelect(file)}
 *   onPreview={(e) => handlePreview(e, file)}
 *   draggableIndex={0}
 *   draggableId="/uploads/data.txt"
 * />
 */
export function FileTreeNode({
  type,
  data,
  level = 0,
  isSelected = false,
  isExpanded = false,
  onClick,
  onToggle,
  onPreview,
  draggableIndex,
  draggableId,
  showBadge = true,
  className,
}: FileTreeNodeProps) {
  const isDirectory = type === "directory"
  const isFile = type === "file"
  const fileData = data as FileItem
  const dirData = data as DirectoryItem

  const content = (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
        "hover:bg-accent",
        isSelected && "bg-accent/80",
        className
      )}
      style={{ paddingLeft: `${level * 16 + 8}px` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      {/* Expand/Collapse Button (directories only) */}
      {isDirectory && (
        <button
          type="button"
          className="flex h-4 w-4 items-center justify-center rounded hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation()
            onToggle?.()
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
      )}

      {/* Icon */}
      {isDirectory ? (
        <Folder className={cn(
          "h-4 w-4 flex-shrink-0",
          isExpanded ? "text-yellow-500" : "text-yellow-600"
        )} />
      ) : (
        getFileIcon(fileData.name, fileData.file_type)
      )}

      {/* Name */}
      <span className="min-w-0 flex-1 truncate text-sm">
        {data.name}
      </span>

      {/* Size / File Count */}
      <span className="flex-shrink-0 text-xs text-muted-foreground">
        {isDirectory
          ? `${dirData.file_count ?? 0} files`
          : fileData.size_formatted || ""}
      </span>

      {/* Type Badge (files only) */}
      {isFile && showBadge && shouldShowBadge(fileData.name) && (
        <Badge variant="outline" className="text-[10px] opacity-70">
          {fileData.name.split(".").pop()?.toUpperCase()}
        </Badge>
      )}

      {/* Preview Button (previewable files only) */}
      {isFile && fileData.is_previewable && onPreview && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100"
          onClick={onPreview}
        >
          <Eye className="h-3 w-3" />
          <span className="sr-only">Preview</span>
        </Button>
      )}
    </div>
  )

  // Wrap in Draggable if drag-and-drop is enabled
  if (draggableIndex !== undefined && draggableId) {
    return (
      <Draggable draggableId={draggableId} index={draggableIndex}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              snapshot.isDragging && "rounded-md bg-accent shadow-lg"
            )}
          >
            {content}
          </div>
        )}
      </Draggable>
    )
  }

  return content
}

export default FileTreeNode
