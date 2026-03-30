"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { ChevronDown, Folder, File as FileIcon } from "lucide-react"

export type SearchableSelectItem = {
  label: string
  value: string
  description?: string
}

export function SearchableSelect({
  placeholder,
  directoryItems = [],
  fileItems = [],
  onSelect,
}: {
  placeholder: string
  directoryItems?: SearchableSelectItem[]
  fileItems?: SearchableSelectItem[]
  onSelect: (value: string) => void
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate text-left">{placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[520px]">
        <Command
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1
            return 0
          }}
        >
          <CommandInput placeholder="Type to search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {directoryItems.length > 0 && (
              <CommandGroup heading="Directories">
                {directoryItems.map((item) => (
                  <CommandItem
                    key={`dir:${item.value}`}
                    value={`dir:${item.value}`}
                    onSelect={(val) => {
                      setOpen(false)
                      onSelect(val)
                    }}
                  >
                    <Folder className="mr-2 h-4 w-4" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{item.label}</div>
                      {item.description && (
                        <div
                          className="text-xs text-muted-foreground break-all"
                          title={item.description}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {fileItems.length > 0 && (
              <CommandGroup heading="Files">
                {fileItems.map((item) => (
                  <CommandItem
                    key={`file:${item.value}`}
                    value={`file:${item.value}`}
                    onSelect={(val) => {
                      setOpen(false)
                      onSelect(val)
                    }}
                  >
                    <FileIcon className="mr-2 h-4 w-4" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{item.label}</div>
                      {item.description && (
                        <div
                          className="text-xs text-muted-foreground break-all"
                          title={item.description}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}