"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  Archive,
  FileText as FileTextIcon,
  Grip,
} from "lucide-react"
import { Draggable } from "@hello-pangea/dnd"

interface DirectoryItem {
  name: string
  path: string
  file_count: number
  total_size: number
  total_size_formatted: string
}

interface FileItem {
  name: string
  path: string
  size: number
  size_formatted: string
  file_type: string
  is_previewable: boolean
  last_modified: string
}

interface DatasetStructure {
  directories: DirectoryItem[]
  files: FileItem[]
  total_files: number
  total_directories: number
  extracted_size: string
  root_path: string
}

interface FileExplorerProps {
  datasetStructure: DatasetStructure | null
  onFileSelect?: (file: FileItem) => void
}

export function FileExplorer({
  datasetStructure,
  onFileSelect,
}: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath)
    } else {
      newExpanded.add(folderPath)
    }
    setExpandedFolders(newExpanded)
  }

  const getFileIcon = (fileName: string, fileType: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    if (extension === "zip" || extension === "gz" || extension === "tar")
      return Archive
    if (["txt", "csv", "tsv", "tsv.gz", "csv.gz"].includes(extension || ""))
      return FileTextIcon
    if (
      ["bed", "bim", "fam", "vcf", "pgen", "pvar", "psam"].includes(
        extension || ""
      )
    )
      return File
    return File
  }

  const getFilesInDirectory = (dirPath: string): FileItem[] => {
    return (
      datasetStructure?.files.filter((file) => {
        // Handle both forward and backward slashes
        const normalizedPath = file.path.replace(/\\/g, "/")
        const normalizedDirPath = dirPath.replace(/\\/g, "/")
        const fileDir = normalizedPath.substring(
          0,
          normalizedPath.lastIndexOf("/")
        )
        return fileDir === normalizedDirPath
      }) || []
    )
  }

  const getSubdirectories = (parentPath: string): DirectoryItem[] => {
    return (
      datasetStructure?.directories.filter((dir) => {
        // Handle both forward and backward slashes
        const normalizedPath = dir.path.replace(/\\/g, "/")
        const normalizedParentPath = parentPath.replace(/\\/g, "/")
        const parentDir = normalizedPath.substring(
          0,
          normalizedPath.lastIndexOf("/")
        )
        return parentDir === normalizedParentPath
      }) || []
    )
  }

  const getRootDirectories = (): DirectoryItem[] => {
    return (
      datasetStructure?.directories.filter((dir) => {
        // Handle both forward and backward slashes
        const normalizedPath = dir.path.replace(/\\/g, "/")
        const pathParts = normalizedPath.split("/")
        return pathParts.length === 1
      }) || []
    )
  }

  const getRootFiles = (): FileItem[] => {
    return (
      datasetStructure?.files.filter((file) => {
        // Handle both forward and backward slashes
        const normalizedPath = file.path.replace(/\\/g, "/")
        const pathParts = normalizedPath.split("/")
        return pathParts.length === 1
      }) || []
    )
  }

  const renderDirectory = (directory: DirectoryItem, level: number = 0) => {
    const subDirs = getSubdirectories(directory.path)
    const files = getFilesInDirectory(directory.path)
    const isExpanded = expandedFolders.has(directory.path)

    return (
      <div key={directory.path} className="space-y-1">
        {/* Directory Header */}
        <div
          className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-muted/50"
          style={{ marginLeft: `${level * 16}px` }}
          onClick={() => toggleFolder(directory.path)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Folder className="h-4 w-4 text-blue-500" />
          <span className="font-medium">{directory.name}</span>
          <Badge variant="outline" className="text-xs">
            {directory.file_count} file{directory.file_count !== 1 ? "s" : ""}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {directory.total_size_formatted}
          </span>
        </div>

        {/* Subdirectories and Files */}
        {isExpanded && (
          <div className="space-y-1">
            {/* Render subdirectories */}
            {subDirs.map((subDir) => renderDirectory(subDir, level + 1))}

            {/* Render files in this directory */}
            {files.map((file, index) => {
              const FileIcon = getFileIcon(file.name, file.file_type)
              return (
                <Draggable
                  key={file.path}
                  draggableId={file.path}
                  index={index}
                >
                  {(provided: any) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
                      style={{
                        marginLeft: `${(level + 1) * 16}px`,
                        ...provided.draggableProps.style,
                      }}
                      onClick={() => onFileSelect?.(file)}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm">{file.name}</span>
                        {file.is_previewable && (
                          <Badge variant="outline" className="text-xs">
                            Preview
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{file.size_formatted}</span>
                        <span className="text-xs">{file.file_type}</span>
                        <div {...provided.dragHandleProps}>
                          <Grip className="h-4 w-4 cursor-grab text-gray-400" />
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (!datasetStructure) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            File Explorer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No dataset structure available
          </p>
        </CardContent>
      </Card>
    )
  }

  const rootDirs = getRootDirectories()
  const rootFiles = getRootFiles()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Folder className="h-5 w-5" />
          File Explorer
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{datasetStructure.total_directories} directories</span>
          <span>{datasetStructure.total_files} files</span>
          <span>{datasetStructure.extracted_size} total</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Root Files */}
          {rootFiles.map((file, index) => {
            const FileIcon = getFileIcon(file.name, file.file_type)
            return (
              <Draggable key={file.path} draggableId={file.path} index={index}>
                {(provided: any) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
                    onClick={() => onFileSelect?.(file)}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm">{file.name}</span>
                      {file.is_previewable && (
                        <Badge variant="outline" className="text-xs">
                          Preview
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{file.size_formatted}</span>
                      <span className="text-xs">{file.file_type}</span>
                      <div {...provided.dragHandleProps}>
                        <Grip className="h-4 w-4 cursor-grab text-gray-400" />
                      </div>
                    </div>
                  </div>
                )}
              </Draggable>
            )
          })}

          {/* Root Directories */}
          {rootDirs.map((dir) => renderDirectory(dir))}
        </div>
      </CardContent>
    </Card>
  )
}
