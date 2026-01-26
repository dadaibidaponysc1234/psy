"use client"

import React, { useState, useMemo } from "react"
import { Droppable } from "@hello-pangea/dnd"
import { ChevronRight, ChevronDown, Folder } from "lucide-react"
import { FileTreeNode, type FileItem, type DirectoryItem } from "./FileTreeNode"
import { cn } from "@/lib/utils"

export interface FileTreeDirectoryProps {
  /** Directory data */
  directory: DirectoryItem
  /** Files within this directory */
  files: FileItem[]
  /** Subdirectories within this directory */
  subdirectories: DirectoryItem[]
  /** Nesting level for indentation */
  level?: number
  /** Whether initially expanded */
  defaultExpanded?: boolean
  /** Currently selected path */
  selectedPath?: string
  /** Callback when a file is selected */
  onFileSelect?: (file: FileItem) => void
  /** Callback when a directory is selected */
  onDirectorySelect?: (directory: DirectoryItem) => void
  /** Callback for file preview */
  onFilePreview?: (file: FileItem) => void
  /** Whether files are draggable */
  enableDrag?: boolean
  /** Base index for draggable items */
  dragIndexBase?: number
  /** Additional className */
  className?: string
}

/**
 * FileTreeDirectory - A collapsible directory in the file tree
 *
 * Renders the directory header and its contents (files + subdirectories)
 * when expanded.
 *
 * @example
 * <FileTreeDirectory
 *   directory={{ name: 'data', path: '/uploads/data', file_count: 10 }}
 *   files={filesInDirectory}
 *   subdirectories={subdirsInDirectory}
 *   onFileSelect={handleFileSelect}
 *   enableDrag
 * />
 */
export function FileTreeDirectory({
  directory,
  files,
  subdirectories,
  level = 0,
  defaultExpanded = false,
  selectedPath,
  onFileSelect,
  onDirectorySelect,
  onFilePreview,
  enableDrag = false,
  dragIndexBase = 0,
  className,
}: FileTreeDirectoryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const isSelected = selectedPath === directory.path

  const handleToggle = () => {
    setIsExpanded((prev) => !prev)
  }

  const handleClick = () => {
    onDirectorySelect?.(directory)
  }

  return (
    <div className={className}>
      {/* Directory Header */}
      <div
        className={cn(
          "group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent",
          isSelected && "bg-accent/80"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        {/* Expand/Collapse Button */}
        <button
          type="button"
          className="flex h-4 w-4 items-center justify-center rounded hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation()
            handleToggle()
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>

        {/* Folder Icon */}
        <Folder
          className={cn(
            "h-4 w-4 flex-shrink-0",
            isExpanded ? "text-yellow-500" : "text-yellow-600"
          )}
        />

        {/* Directory Name */}
        <span className="min-w-0 flex-1 truncate text-sm">
          {directory.name}
        </span>

        {/* File Count */}
        <span className="flex-shrink-0 text-xs text-muted-foreground">
          {directory.file_count ?? 0} files
        </span>
      </div>

      {/* Contents (when expanded) */}
      {isExpanded && (
        <div className="overflow-hidden">
          {/* Subdirectories first */}
          {subdirectories.map((subdir, index) => (
            <FileTreeDirectory
              key={subdir.path}
              directory={subdir}
              files={[]} // Would need to be passed from parent
              subdirectories={[]}
              level={level + 1}
              selectedPath={selectedPath}
              onFileSelect={onFileSelect}
              onDirectorySelect={onDirectorySelect}
              onFilePreview={onFilePreview}
              enableDrag={enableDrag}
              dragIndexBase={dragIndexBase + index * 100}
            />
          ))}

          {/* Files */}
          {files.map((file, index) => (
            <FileTreeNode
              key={file.path}
              type="file"
              data={file}
              level={level + 1}
              isSelected={selectedPath === file.path}
              onClick={() => onFileSelect?.(file)}
              onPreview={
                onFilePreview
                  ? (e) => {
                      e.stopPropagation()
                      onFilePreview(file)
                    }
                  : undefined
              }
              draggableIndex={
                enableDrag ? dragIndexBase + subdirectories.length + index : undefined
              }
              draggableId={enableDrag ? file.path : undefined}
            />
          ))}

          {/* Empty state */}
          {files.length === 0 && subdirectories.length === 0 && (
            <div
              className="px-4 py-2 text-xs text-muted-foreground"
              style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
            >
              Empty directory
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default FileTreeDirectory
