"use client"

import { useEffect, useState, type ReactNode } from "react"
import { CheckCircle2, ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import type { Issue } from "@/components/benchmarking/job-config"

interface FormSectionProps {
  title: string
  description: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** How many things still need fixing here. */
  issueCount: number
  children: ReactNode
}

/** One collapsible section of a tool's form, saying whether anything in it still needs fixing. */
export function FormSection({
  title,
  description,
  open,
  onOpenChange,
  issueCount,
  children,
}: FormSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <div className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50">
          <div>
            <h4 className="font-medium">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {issueCount > 0 ? (
              <Badge
                variant="outline"
                className="border-orange-300 bg-orange-50 text-xs text-orange-700"
              >
                {issueCount} to fix
              </Badge>
            ) : (
              <CheckCircle2
                className="h-4 w-4 text-green-600"
                aria-label="Nothing to fix"
              />
            )}
            {open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pt-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

/** The issues reported at exactly this path, in red under the field. */
export function FieldIssues({
  issues,
  path,
}: {
  issues: Issue[]
  path: string
}) {
  const here = issues.filter((issue) => issue.path === path)
  if (here.length === 0) return null
  return (
    <div className="mt-1 space-y-0.5">
      {here.map((issue) => (
        <p key={issue.message} className="text-xs text-red-600">
          {issue.message}
        </p>
      ))}
    </div>
  )
}

const parse = (text: string): number | null =>
  text.trim() === "" ? null : Number(text)

const sameNumber = (a: number | null, b: number | null) =>
  a === b || (Number.isNaN(a) && Number.isNaN(b))

interface NumberInputProps {
  id?: string
  value: number | null
  onChange: (value: number | null) => void
  placeholder?: string
  integer?: boolean
}

/**
 * A number typed as text, so "0." or "1e-" can be typed on the way to a value. Empty is
 * `null`; text that isn't a number is `NaN`, which validation reports.
 */
export function NumberInput({
  id,
  value,
  onChange,
  placeholder,
  integer,
}: NumberInputProps) {
  const [text, setText] = useState(value === null ? "" : String(value))

  // Follow changes made elsewhere (a preset, another tab) without fighting the user's typing.
  useEffect(() => {
    setText((current) =>
      sameNumber(parse(current), value)
        ? current
        : value === null || Number.isNaN(value)
          ? ""
          : String(value)
    )
  }, [value])

  return (
    <Input
      id={id}
      inputMode={integer ? "numeric" : "decimal"}
      placeholder={placeholder}
      value={text}
      onChange={(event) => {
        setText(event.target.value)
        onChange(parse(event.target.value))
      }}
    />
  )
}
