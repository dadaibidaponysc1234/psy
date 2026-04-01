"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip } from "@/components/ui/tooltip"
import {
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  Archive,
  FileText as FileTextIcon,
  X,
  Loader2,
} from "lucide-react"
// Drag-and-drop removed — passthrough wrapper for backward compat
const Draggable = ({
  children,
}: {
  draggableId: string
  index: number
  children: (provided: any) => React.ReactNode
}) => {
  const provided = {
    innerRef: () => {},
    draggableProps: { style: {} },
    dragHandleProps: {},
  }
  return <>{children(provided)}</>
}
import benchmarkApi from "@/lib/benchmark-api"
import { getBenchmarkUploadUrl, getBenchmarkPreviewUrl } from "@/lib/config"

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
  onDirectorySelect?: (directory: DirectoryItem) => void
  jobId?: string | null
  selectedFile?: FileItem | null
  selectedDirectory?: DirectoryItem | null
}

export function FileExplorer({
  datasetStructure,
  onFileSelect,
  onDirectorySelect,
  jobId,
  selectedFile,
  selectedDirectory,
}: FileExplorerProps) {
  console.log("[FileExplorer] datasetStructure:", JSON.stringify(datasetStructure, null, 2))

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewFileName, setPreviewFileName] = useState("")
  const [sortAscending, setSortAscending] = useState(true)
  const [sortDirectoriesToo, setSortDirectoriesToo] = useState(true)

  // Control badge visibility to avoid wrapping on long names
  const NAME_BADGE_THRESHOLD = 28
  const shouldShowBadge = (name: string) => name.trim().length <= NAME_BADGE_THRESHOLD
  // Tooltip display delay (ms)
  const TOOLTIP_DELAY_MS = 1200

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath)
    } else {
      newExpanded.add(folderPath)
    }
    setExpandedFolders(newExpanded)
  }

  const isFileSelected = (file: FileItem): boolean => {
    return selectedFile?.path === file.path
  }

  const isDirectorySelected = (directory: DirectoryItem): boolean => {
    return selectedDirectory?.path === directory.path
  }

  const handleDirectorySelect = (directory: DirectoryItem) => {
    if (isDirectorySelected(directory)) {
      // If already selected, deselect by passing null
      onDirectorySelect?.(null as any)
    } else {
      // If not selected, select it and clear file selection
      onFileSelect?.(null as any)
      onDirectorySelect?.(directory)
    }
  }

  const handleFileSelect = (file: FileItem) => {
    if (isFileSelected(file)) {
      // If already selected, deselect by passing null
      onFileSelect?.(null as any)
    } else {
      // If not selected, select it and clear directory selection
      onDirectorySelect?.(null as any)
      onFileSelect?.(file)
    }
  }

  const handlePreviewClick = async (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation() // Prevent file selection

    if (!jobId) {
      console.error("No job ID available for preview")
      return
    }

    setPreviewFileName(file.name)
    setPreviewModalOpen(true)
    setPreviewLoading(true)
    setPreviewContent("")

    try {
      // Encode the file path for the URL
      const previewUrl = getBenchmarkPreviewUrl(jobId, file.path)

      console.log("Fetching preview from:", previewUrl)

      const response = await benchmarkApi.get(previewUrl)

      console.log("Preview response:", response.data)

      // Store the response data directly
      setPreviewContent(response.data)
    } catch (error) {
      console.error("Failed to fetch preview:", error)
      setPreviewContent("Error: Failed to load preview")
    } finally {
      setPreviewLoading(false)
    }
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

  const getFilesInDirectory = (directoryPath: string): FileItem[] => {
    if (!datasetStructure || !datasetStructure.files) return []

    const safeNormalize = (p: unknown): string | null => {
      if (typeof p !== "string") return null
      return p.replace(/\\/g, "/")
    }

    const normalizedTargetDir = safeNormalize(directoryPath) ?? ""

    const files = datasetStructure.files
      .filter((file) => {
        const normalizedPath = safeNormalize(file.path)
        if (!normalizedPath) return false
        const lastSlash = normalizedPath.lastIndexOf("/")
        const fileDir = lastSlash >= 0 ? normalizedPath.substring(0, lastSlash) : ""
        return fileDir === normalizedTargetDir
      })
      .sort((a, b) =>
        sortAscending
          ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
          : b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" })
      )

    return files
  }

  const getSubdirectories = (parentPath: string): DirectoryItem[] => {
    const list =
      (datasetStructure?.directories
        .filter((dir) => {
          if (!dir?.path || typeof dir.path !== "string") return false
          // Handle both forward and backward slashes safely
          const normalizedPath = dir.path.replace(/\\/g, "/")
          const normalizedParentPath = (parentPath ?? "").replace(/\\/g, "/")
          // Avoid self-child or cyclic references
          if (normalizedPath === normalizedParentPath) return false
          const lastSlash = normalizedPath.lastIndexOf("/")
          const parentDir = lastSlash >= 0 ? normalizedPath.substring(0, lastSlash) : ""
          return parentDir === normalizedParentPath
        })) || []
    if (!sortDirectoriesToo) return list
    return list.sort((a, b) =>
      sortAscending
        ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
        : b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" })
    )
  }

  const getRootDirectories = (): DirectoryItem[] => {
    const list =
      (datasetStructure?.directories
        .filter((dir) => {
          if (!dir?.path || typeof dir.path !== "string") return false
          // Handle both forward and backward slashes safely
          const normalizedPath = dir.path.replace(/\\/g, "/")
          const pathParts = normalizedPath.split("/")
          // Exclude empty or whitespace-only paths
          if (!normalizedPath.trim()) return false
          return pathParts.length === 1
        })) || []
    if (!sortDirectoriesToo) return list
    return list.sort((a, b) =>
      sortAscending
        ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
        : b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" })
    )
  }

  const getRootFiles = (): FileItem[] => {
    return (
      (datasetStructure?.files
        .filter((file) => {
          if (!file?.path || typeof file.path !== "string") return false
          // Handle both forward and backward slashes safely
          const normalizedPath = file.path.replace(/\\/g, "/")
          const pathParts = normalizedPath.split("/")
          // Exclude empty or whitespace-only paths
          if (!normalizedPath.trim()) return false
          return pathParts.length === 1
        })
        .sort((a, b) =>
          sortAscending
            ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
            : b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" })
        )) || []
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
          {/* Remove directory size display in directory header */}
          <Folder className="h-4 w-4 text-blue-500" />
          <div className="min-w-0 flex-1">
            <Tooltip content={directory.path} delayMs={TOOLTIP_DELAY_MS} containerClassName="block w-full">
              <span className="truncate font-medium">{directory.name}</span>
            </Tooltip>
          </div>
          {shouldShowBadge(directory.name) && (subDirs.length > 0 || files.length > 0) && (
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {subDirs.length > 0
                ? `${subDirs.length} folder${subDirs.length !== 1 ? "s" : ""}`
                : `${files.length} file${files.length !== 1 ? "s" : ""}`}
            </Badge>
          )}
        </div>

        {/* Subdirectories and Files */}
        {isExpanded && (
          <div className="space-y-1">
            {/* Render subdirectories */}
            {subDirs.map((subDir, index) => {
              const subDirExpanded = expandedFolders.has(subDir.path)
              const subDirSubDirs = getSubdirectories(subDir.path)
              const subDirFiles = getFilesInDirectory(subDir.path)
              const hasChildren = subDirSubDirs.length > 0 || subDirFiles.length > 0
              
              return (
                <div key={subDir.path}>
                  <Draggable
                    draggableId={subDir.path}
                    index={index}
                  >
                    {(provided: any) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-muted/50 ${
                          ""
                        }`}
                        style={{
                          marginLeft: `${(level + 1) * 16}px`,
                          ...provided.draggableProps.style,
                        }}
                      >
                        {/* Expand/Collapse Icon */}
                        {hasChildren && (
                          <div
                            className="cursor-pointer p-1 hover:bg-muted rounded"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFolder(subDir.path)
                            }}
                          >
                            {subDirExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        )}
                        {!hasChildren && <div className="w-6" />}
                        
                        {/* Folder Content - Clickable for selection */}
                        <div
                            className="flex flex-1 cursor-pointer items-center gap-2"
                            onClick={() => toggleFolder(subDir.path)}
                          >
                          {/* Remove directory size display in subdirectory header (first occurrence) */}
                          <Folder className="h-4 w-4 text-blue-500" />
                          <div className="min-w-0 flex-1">
                            <Tooltip content={subDir.path} delayMs={TOOLTIP_DELAY_MS} containerClassName="block w-full">
                              <span className="truncate font-medium">{subDir.name}</span>
                            </Tooltip>
                          </div>
                          {shouldShowBadge(subDir.name) && (subDirSubDirs.length > 0 || subDirFiles.length > 0) && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {subDirSubDirs.length > 0
                                ? `${subDirSubDirs.length} folder${subDirSubDirs.length !== 1 ? "s" : ""}`
                                : `${subDirFiles.length} file${subDirFiles.length !== 1 ? "s" : ""}`}
                            </Badge>
                          )}
                        </div>
                        
                      </div>
                    )}
                  </Draggable>
                  
                  {/* Render nested content if expanded */}
                  {subDirExpanded && hasChildren && (
                    <div className="space-y-1">{renderChildren(subDir.path, 1)}</div>
                  )}
                </div>
              )
            })}

            {/* Render files in this directory */}
            {files.map((file, index) => {
              const FileIcon = getFileIcon(file.name, file.file_type)
              return (
                <Draggable
                  key={file.path}
                  draggableId={file.path}
                  index={subDirs.length + index}
                >
                  {(provided: any) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50 cursor-pointer ${
                        isFileSelected(file)
                          ? "border border-blue-300 bg-blue-100 text-blue-900"
                          : ""
                      }`}
                      style={{
                        marginLeft: `${(level + 1) * 16}px`,
                        ...provided.draggableProps.style,
                      }}
                      onClick={() => handleFileSelect(file)}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <Tooltip content={file.path} delayMs={TOOLTIP_DELAY_MS} containerClassName="block w-full">
                            <span className="truncate text-sm">{file.name}</span>
                          </Tooltip>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                        <span>{file.size_formatted}</span>
                        {file.is_previewable && (
                          <Badge
                            variant="outline"
                            className="cursor-pointer text-xs hover:bg-muted"
                            onClick={(e) => handlePreviewClick(e, file)}
                          >
                            Preview
                          </Badge>
                        )}
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
        {/* Header when datasetStructure is null */}
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            File Explorer
          </CardTitle>
        </CardHeader>
        {/* Header when datasetStructure exists */}
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            File Explorer
          </CardTitle>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{(datasetStructure as any)?.total_directories ?? 0} directories</span>
            <span>{(datasetStructure as any)?.total_files ?? 0} files</span>
            <span>{(datasetStructure as any)?.extracted_size ?? ""} total</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSortAscending((prev) => !prev)}>
              Sort {sortAscending ? "A→Z" : "Z→A"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSortDirectoriesToo((prev) => !prev)}>
              Scope: {sortDirectoriesToo ? "Files + Dirs" : "Files only"}
            </Button>
          </div>
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

  // Helper: recursively render children (subdirectories and files)
  const renderChildren = (parentPath: string, level: number = 1) => {
    const subDirs = getSubdirectories(parentPath)
    const files = getFilesInDirectory(parentPath)

    return (
      <>
        {/* Render subdirectories */}
        {subDirs.map((subDir, subIndex) => {
          const subDirExpanded = expandedFolders.has(subDir.path)
          const childSubDirs = getSubdirectories(subDir.path)
          const childFiles = getFilesInDirectory(subDir.path)
          const subDirHasChildren = childSubDirs.length > 0 || childFiles.length > 0

          return (
            <div key={subDir.path}>
              <Draggable draggableId={subDir.path} index={subIndex}>
                {(provided: any) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-muted/50 ${
                      ""
                    }`}
                    style={{
                      marginLeft: `${level * 16}px`,
                      ...provided.draggableProps.style,
                    }}
                  >
                    {/* Expand/Collapse Icon */}
                    {subDirHasChildren ? (
                      <div
                        className="cursor-pointer rounded p-1 hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFolder(subDir.path)
                        }}
                      >
                        {subDirExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    ) : (
                      <div className="w-6" />
                    )}

                    {/* Folder Content - Clickable for selection */}
                    <div
                      className="flex flex-1 cursor-pointer items-center gap-2"
                      onClick={() => toggleFolder(subDir.path)}
                    >
                      <Folder className="h-4 w-4 text-blue-500" />
                      <div className="min-w-0 flex-1">
                        <Tooltip content={subDir.path} delayMs={TOOLTIP_DELAY_MS} containerClassName="block w-full">
                          <span className="truncate font-medium">{subDir.name}</span>
                        </Tooltip>
                      </div>
                      {shouldShowBadge(subDir.name) && (getSubdirectories(subDir.path).length > 0 || getFilesInDirectory(subDir.path).length > 0) && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {getSubdirectories(subDir.path).length > 0
                            ? `${getSubdirectories(subDir.path).length} folder${getSubdirectories(subDir.path).length !== 1 ? "s" : ""}`
                            : `${getFilesInDirectory(subDir.path).length} file${getFilesInDirectory(subDir.path).length !== 1 ? "s" : ""}`}
                        </Badge>
                      )}
                    </div>

                  </div>
                )}
              </Draggable>

              {/* Render nested content for this subdirectory if expanded */}
              {subDirExpanded && subDirHasChildren && (
                <div className="space-y-1">{renderChildren(subDir.path, 2)}</div>
              )}
            </div>
          )
        })}

        {/* Render files in this directory */}
        {files.map((file, fileIndex) => {
          const FileIcon = getFileIcon(file.name, file.file_type)
          return (
            <Draggable key={file.path} draggableId={file.path} index={subDirs.length + fileIndex}>
              {(provided: any) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  className={`flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50 ${
                    isFileSelected(file) ? "border border-blue-300 bg-blue-100 text-blue-900" : ""
                  }`}
                  style={{
                    marginLeft: `${level * 16}px`,
                    ...provided.draggableProps.style,
                  }}
                  onClick={() => handleFileSelect(file)}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <Tooltip content={file.path} delayMs={TOOLTIP_DELAY_MS} containerClassName="block w-full">
                        <span className="truncate text-sm">{file.name}</span>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    <span>{file.size_formatted}</span>
                    {file.is_previewable && (
                      <Badge
                        variant="outline"
                        className="cursor-pointer text-xs hover:bg-muted"
                        onClick={(e) => handlePreviewClick(e, file)}
                      >
                        Preview
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </Draggable>
          )
        })}
      </>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            File Explorer
          </CardTitle>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{datasetStructure.total_directories} directories</span>
            <span>{datasetStructure.total_files} files</span>
            <span>{datasetStructure.extracted_size} total</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSortAscending((prev) => !prev)}>
              Sort {sortAscending ? "A→Z" : "Z→A"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSortDirectoriesToo((prev) => !prev)}>
              Scope: {sortDirectoriesToo ? "Files + Dirs" : "Files only"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="h-auto overflow-y-auto max-h-[62svh] sm:max-h-[64svh] md:max-h-[68svh] lg:max-h-[74svh] xl:max-h-[78svh]">
          <div className="space-y-2">
            {/* Root Files */}
            {rootFiles.map((file, index) => {
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
                      className={`flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50 ${
                        isFileSelected(file)
                          ? "border border-blue-300 bg-blue-100 text-blue-900"
                          : ""
                      }`}
                      onClick={() => handleFileSelect(file)}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <Tooltip content={file.path} delayMs={TOOLTIP_DELAY_MS} containerClassName="block w-full">
                            <span className="truncate text-sm">{file.name}</span>
                          </Tooltip>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                        <span>{file.size_formatted}</span>
                        {file.is_previewable && (
                          <Badge
                            variant="outline"
                            className="cursor-pointer text-xs hover:bg-muted"
                            onClick={(e) => handlePreviewClick(e, file)}
                          >
                            Preview
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              )
            })}

            {/* Root Directories */}
            {rootDirs.map((dir) => {
              const isExpanded = expandedFolders.has(dir.path)
              const subDirs = getSubdirectories(dir.path)
              const files = getFilesInDirectory(dir.path)
              const hasChildren = subDirs.length > 0 || files.length > 0
              
              return (
                <div key={dir.path}>
                  <Draggable
                    draggableId={dir.path}
                    index={rootDirs.indexOf(dir)}
                  >
                    {(provided: any) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50 ${
                          ""
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          {/* Expand/Collapse Icon */}
                          {hasChildren && (
                            <div
                              className="cursor-pointer p-1 hover:bg-muted rounded"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleFolder(dir.path)
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>
                          )}
                          {!hasChildren && <div className="w-6" />}
                          
                          {/* Folder Content - Clickable to expand/collapse */}
                          <div
                             className="flex flex-1 cursor-pointer items-center gap-2"
                             onClick={() => toggleFolder(dir.path)}
                           >
                            <Folder className="h-4 w-4 text-blue-500" />
                            <div className="min-w-0 flex-1">
                              <Tooltip content={dir.path} delayMs={TOOLTIP_DELAY_MS} containerClassName="block w-full">
                                <span className="truncate text-sm">{dir.name}</span>
                              </Tooltip>
                            </div>
                            {shouldShowBadge(dir.name) && (subDirs.length > 0 || files.length > 0) && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {subDirs.length > 0
                                  ? `${subDirs.length} folder${subDirs.length !== 1 ? "s" : ""}`
                                  : `${files.length} file${files.length !== 1 ? "s" : ""}`}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        </div>
                      </div>
                    )}
                  </Draggable>
                  
                  {/* Render nested content if expanded */}
                   {isExpanded && hasChildren && (
                     <div className="space-y-1">
                       {/* Render subdirectories */}
                       {subDirs.map((subDir, subIndex) => {
                         const subDirExpanded = expandedFolders.has(subDir.path)
                         const childSubDirs = getSubdirectories(subDir.path)
                         const childFiles = getFilesInDirectory(subDir.path)
                         const subDirHasChildren = childSubDirs.length > 0 || childFiles.length > 0
                         
                         return (
                           <div key={subDir.path}>
                             <Draggable
                               draggableId={subDir.path}
                               index={subIndex}
                             >
                               {(provided: any) => (
                                 <div
                                   ref={provided.innerRef}
                                   {...provided.draggableProps}
                                   className={`flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-muted/50 ${
                                     ""
                                   }`}
                                   style={{
                                     marginLeft: "16px",
                                     ...provided.draggableProps.style,
                                   }}
                                 >
                                   {/* Expand/Collapse Icon */}
                                   {subDirHasChildren ? (
                                     <div
                                       className="cursor-pointer rounded p-1 hover:bg-muted"
                                       onClick={(e) => {
                                         e.stopPropagation()
                                         toggleFolder(subDir.path)
                                       }}
                                     >
                                       {subDirExpanded ? (
                                         <ChevronDown className="h-4 w-4" />
                                       ) : (
                                         <ChevronRight className="h-4 w-4" />
                                       )}
                                     </div>
                                   ) : (
                                     <div className="w-6" />
                                   )}

                                   {/* Folder Content - Clickable for selection */}
                                   <div
                                     className="flex flex-1 cursor-pointer items-center gap-2"
                                     onClick={() => toggleFolder(subDir.path)}
                                   >
                                     <Folder className="h-4 w-4 text-blue-500" />
                                     <div className="min-w-0 flex-1">
                                       <Tooltip content={subDir.path} delayMs={TOOLTIP_DELAY_MS} containerClassName="block w-full">
                                         <span className="truncate font-medium">{subDir.name}</span>
                                       </Tooltip>
                                     </div>
                                     {shouldShowBadge(subDir.name) && (childSubDirs.length > 0 || childFiles.length > 0) && (
                                       <Badge variant="outline" className="text-xs flex-shrink-0">
                                         {childSubDirs.length > 0
                                           ? `${childSubDirs.length} folder${childSubDirs.length !== 1 ? "s" : ""}`
                                           : `${childFiles.length} file${childFiles.length !== 1 ? "s" : ""}`}
                                       </Badge>
                                     )}
                                   </div>

                                 </div>
                               )}
                             </Draggable>

                             {/* Render nested content for this subdirectory if expanded */}
                             {subDirExpanded && subDirHasChildren && (
                               <div className="space-y-1">{renderChildren(subDir.path, 2)}</div>
                             )}
                           </div>
                         )
                       })}

                       {/* Render files in this subdirectory */}
                       {files.map((file, fileIndex) => {
                         const FileIcon = getFileIcon(file.name, file.file_type)
                         return (
                           <Draggable
                             key={file.path}
                             draggableId={file.path}
                             index={subDirs.length + fileIndex}
                           >
                             {(provided: any) => (
                               <div
                                 ref={provided.innerRef}
                                 {...provided.draggableProps}
                                 className={`flex items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50 cursor-pointer ${
                                   isFileSelected(file) ? "border border-blue-300 bg-blue-100 text-blue-900" : ""
                                 }`}
                                 style={{
                                   marginLeft: "16px",
                                   ...provided.draggableProps.style,
                                 }}
                                 onClick={() => handleFileSelect(file)}
                               >
                                 <div className="flex min-w-0 flex-1 items-center gap-2">
                                   <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                   <span className="truncate text-sm">{file.name}</span>
                                 </div>
                                 <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                                   <span>{file.size_formatted}</span>
                                   {file.is_previewable && (
                                     <Badge
                                       variant="outline"
                                       className="cursor-pointer text-xs hover:bg-muted"
                                       onClick={(e) => handlePreviewClick(e, file)}
                                     >
                                       Preview
                                     </Badge>
                                   )}
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
            })}
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="relative max-h-[85vh] w-full max-w-2xl mx-4 rounded-lg bg-white shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-2 border-b p-4">
              <div className="flex min-w-0 items-center gap-2">
                <FileTextIcon className="h-5 w-5 flex-shrink-0 text-blue-500" />
                <h3 className="truncate text-lg font-semibold">
                  File Preview: {previewFileName}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewModalOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="max-h-[60vh] overflow-auto p-4">
              {previewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2">Loading preview...</span>
                </div>
              ) : previewContent ? (
                <div className="space-y-4">
                  {/* File Information */}
                  <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        File Size:
                      </span>
                      <span className="ml-2 text-sm text-gray-600">
                        {(previewContent.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Total Lines:
                      </span>
                      <span className="ml-2 text-sm text-gray-600">
                        {previewContent.total_lines?.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        File Type:
                      </span>
                      <span className="ml-2 text-sm capitalize text-gray-600">
                        {previewContent.file_type}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Preview Lines:
                      </span>
                      <span className="ml-2 text-sm text-gray-600">
                        {previewContent.preview_line_count}
                      </span>
                    </div>
                  </div>

                  {/* Preview Content */}
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-gray-700">
                      Preview Content (First {previewContent.preview_line_count}{" "}
                      lines)
                    </h4>
                    <div className="rounded-lg border">
                      <div className="max-h-96 overflow-auto">
                        {(() => {
                          const lines = previewContent.preview_lines || []
                          const firstLine = (lines[0] || "").trim()
                          const headerCells = firstLine
                            ? firstLine.includes("\t")
                              ? firstLine.split("\t")
                              : firstLine.split(/\s+/)
                            : []
                          const dataLines = headerCells.length > 0 ? lines.slice(1) : lines

                          // Always use auto-sizing with horizontal scroll
                          const tableClass = "min-w-max table-auto text-xs"
                          const thClass = "min-w-[100px] max-w-[250px] whitespace-nowrap px-3 py-1.5 text-left font-semibold text-gray-900 border-r last:border-r-0"
                          const tdClass = "min-w-[100px] max-w-[250px] whitespace-nowrap px-3 py-1.5 text-left border-r last:border-r-0"
                          const spanClass = "inline-block max-w-[250px] truncate align-middle"

                          return (
                            <table className={tableClass}>
                              {headerCells.length > 0 && (
                                <thead className="bg-gray-200">
                                  <tr className="border-b">
                                    {headerCells.map((cell: string, idx: number) => (
                                      <th key={idx} className={thClass}>
                                        <span className={spanClass} title={cell}>
                                          {cell}
                                        </span>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                              )}
                              <tbody>
                                {dataLines?.map((line: string, index: number) => {
                                  const trimmed = line?.trim() ?? ""
                                  const cells = trimmed.includes("\t")
                                    ? trimmed.split("\t")
                                    : trimmed.length > 0
                                      ? trimmed.split(/\s+/)
                                      : []
                                  return (
                                    <tr key={index} className="border-b">
                                      {cells.map((cell: string, cellIdx: number) => (
                                        <td key={cellIdx} className={tdClass}>
                                          <span className={spanClass} title={cell}>
                                            {cell}
                                          </span>
                                        </td>
                                      ))}
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          )
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Info Message */}
                  {previewContent.info_message && (
                    <div className="rounded-md bg-blue-50 p-3">
                      <p className="text-sm text-blue-700">
                        {previewContent.info_message}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  No preview content available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
