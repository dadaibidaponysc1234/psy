"use client"

import { File, Folder, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SearchableSelect } from "@/components/ui/searchable-select"
import type { PathKey } from "@/components/benchmarking/job-config"
import type {
  DirectoryItem,
  FileInfo,
} from "@/components/benchmarking/mapping-step/dataset"

interface MappingCardProps {
  pathKey: PathKey
  title: string
  description: string
  optional: boolean
  value: string
  files: FileInfo[]
  directories: DirectoryItem[]
  onSelect: (path: string, name: string) => void
  onClear: () => void
}

/** One file a population provides: pick it from the dataset listing, or clear it. */
export function MappingCard({
  pathKey,
  title,
  description,
  optional,
  value,
  files,
  directories,
  onSelect,
  onClear,
}: MappingCardProps) {
  const mapped = Boolean(value)
  const directoryOnly = pathKey === "genotype_path"
  const mappedDirectory = directories.find(
    (directory) => directory.path === value
  )
  const mappedName =
    mappedDirectory?.name ??
    files.find((file) => file.path === value)?.name ??
    value.split("/").pop()

  return (
    <Card
      className={`border ${mapped ? "border-green-200 bg-green-50" : "border-muted"}`}
    >
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {description}
          </CardDescription>
          <div className="mt-2">
            <Badge
              variant="outline"
              className="border-orange-300 bg-orange-50 text-orange-700"
            >
              {directoryOnly
                ? "Directories"
                : directories.length > 0
                  ? "Files or Directories"
                  : "Files"}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 text-right text-xs text-muted-foreground">
          {optional ? (
            <Badge variant="outline">Optional</Badge>
          ) : mapped ? (
            <Badge
              variant="outline"
              className="border-green-300 bg-green-50 text-green-700"
            >
              Mapped
            </Badge>
          ) : (
            <Badge className="border-red-300 bg-red-50 text-red-700">
              Required
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-[60px] items-center justify-center rounded-md p-3">
          {mapped ? (
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {mappedDirectory ? (
                  <Folder className="h-4 w-4 text-blue-500" />
                ) : (
                  <File className="h-4 w-4 text-gray-500" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{mappedName}</div>
                  <div
                    className="truncate text-sm text-muted-foreground"
                    title={value}
                  >
                    {value}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Clear ${title}`}
                  onClick={onClear}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-2">
              <SearchableSelect
                placeholder={
                  directoryOnly
                    ? "Search for a directory..."
                    : directories.length > 0
                      ? "Search for a file or directory..."
                      : "Search for a file..."
                }
                directoryItems={directories.map((directory) => ({
                  label: directory.name,
                  value: directory.path,
                  description: directory.path,
                }))}
                fileItems={files.map((file) => ({
                  label: file.name,
                  value: file.path,
                  description: file.path,
                }))}
                onSelect={(selected) => {
                  // SearchableSelect prefixes each value with "dir:" or "file:".
                  const path = selected.replace(/^(dir|file):/, "")
                  const entry =
                    directories.find((directory) => directory.path === path) ??
                    files.find((file) => file.path === path)
                  if (entry) onSelect(entry.path, entry.name)
                }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
