"use client"

import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

interface CollapsibleTriggerProps {
  children: React.ReactNode
  className?: string
  asChild?: boolean
}

interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

const CollapsibleContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {},
})

export function Collapsible({
  open: controlledOpen,
  onOpenChange,
  children,
  className,
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      <div className={cn("w-full", className)}>{children}</div>
    </CollapsibleContext.Provider>
  )
}

export function CollapsibleTrigger({
  children,
  className,
  asChild = false,
}: CollapsibleTriggerProps) {
  const { open, setOpen } = React.useContext(CollapsibleContext)

  const handleClick = () => {
    setOpen(!open)
  }

  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: handleClick,
      className: cn(
        className,
        (children as React.ReactElement).props.className
      ),
    })
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex w-full items-center justify-between p-4 transition-colors hover:bg-muted/50",
        className
      )}
    >
      {children}
      {open ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </button>
  )
}

export function CollapsibleContent({
  children,
  className,
}: CollapsibleContentProps) {
  const { open } = React.useContext(CollapsibleContext)

  if (!open) return null

  return (
    <div className={cn("overflow-hidden transition-all", className)}>
      {children}
    </div>
  )
}
