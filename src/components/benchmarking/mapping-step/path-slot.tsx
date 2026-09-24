"use client"

import { File, Folder, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SearchableSelect } from "@/components/ui/searchable-select"
import type {
  DirectoryItem,
  FileInfo,
} from "@/components/benchmarking/mapping-step/dataset"

interface PathSlotProps {
  label: string
  description: string
  value: string
  files: FileInfo[]
  directories: DirectoryItem[]
  onChange: (path: string) => void
}

/** One file a population needs: pick it from the dataset listing, or clear it. */
export function PathSlot({
  label,
  description,
  value,
  files,
  directories,
  onChange,
}: PathSlotProps) {
  const mapped = Boolean(value)
  const isDirectory = directories.some((directory) => directory.path === value)
  const kinds =
    files.length > 0 && directories.length > 0
      ? "a file or folder"
      : directories.length > 0
        ? "a folder"
        : "a file"

  return (
    <div
      className={`rounded-md border p-3 ${mapped ? "border-green-200 bg-green-50" : "border-muted"}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        {mapped ? (
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
      {mapped ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {isDirectory ? (
              <Folder className="h-4 w-4 shrink-0 text-blue-500" />
            ) : (
              <File className="h-4 w-4 shrink-0 text-gray-500" />
            )}
            <span className="truncate text-sm" title={value}>
              {value}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Clear ${label}`}
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <SearchableSelect
          placeholder={`Search for ${kinds}...`}
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
          // SearchableSelect prefixes each value with "dir:" or "file:".
          onSelect={(selected) =>
            onChange(selected.replace(/^(dir|file):/, ""))
          }
        />
      )}
    </div>
  )
}
