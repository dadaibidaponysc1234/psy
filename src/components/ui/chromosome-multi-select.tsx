"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, Plus, X } from "lucide-react"

export type ChromosomeMultiSelectProps = {
  value: number[]
  onChange: (next: number[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
}

const ALL_CHROMS = Array.from({ length: 22 }, (_, i) => i + 1)

export function ChromosomeMultiSelect({
  value,
  onChange,
  placeholder = "Select chromosomes (1–22)",
  className,
  disabled,
  id,
}: ChromosomeMultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selected = React.useMemo(() => {
    const uniq = Array.from(new Set((value || []).map((n) => Number(n))))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 22)
      .sort((a, b) => a - b)
    return uniq
  }, [value])

  const isSelected = (n: number) => selected.includes(n)

  const addChrom = (n: number) => {
    if (disabled) return
    if (!isSelected(n)) {
      onChange([...selected, n].sort((a, b) => a - b))
    }
  }

  const removeChrom = (n: number) => {
    if (disabled) return
    onChange(selected.filter((c) => c !== n))
  }

  const clearAll = () => {
    if (disabled) return
    onChange([])
  }

  return (
    <div className={cn("space-y-2", className)} id={id}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate text-left">
              {selected.length > 0
                ? `Selected: ${selected.join(", ")}`
                : placeholder}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[360px]">
          <Command>
            <CommandInput placeholder="Search 1–22" />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Chromosomes">
                {ALL_CHROMS.map((n) => (
                  <CommandItem
                    key={n}
                    value={String(n)}
                    onSelect={() => (isSelected(n) ? removeChrom(n) : addChrom(n))}
                  >
                    {isSelected(n) ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Chromosome {n}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="flex flex-wrap gap-2">
        {selected.map((n) => (
          <Badge key={n} variant="outline" className="pr-0">
            <span className="mr-1">chr {n}</span>
            <button
              type="button"
              aria-label={`Remove chromosome ${n}`}
              onClick={() => removeChrom(n)}
              className="ml-1 inline-flex items-center rounded-sm px-1 py-0.5 hover:bg-muted"
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {selected.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={clearAll}
            disabled={disabled}
          >
            Clear
          </Button>
        )}
        {selected.length === 0 && (
          <span className="text-xs text-muted-foreground">No chromosomes selected</span>
        )}
      </div>
    </div>
  )
}

export default ChromosomeMultiSelect