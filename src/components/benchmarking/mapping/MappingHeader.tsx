"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToolTabInfo {
  id: string
  label: string
  isValid: boolean
  missingCount?: number
}

export interface MappingHeaderProps {
  /** List of tools with their validation status */
  tools: ToolTabInfo[]
  /** Currently active tool tab */
  activeToolId: string
  /** Callback when tab changes */
  onTabChange: (toolId: string) => void
  /** Title to display */
  title?: string
  /** Subtitle/description */
  subtitle?: string
  /** Additional className */
  className?: string
}

/**
 * MappingHeader - Header component for the mapping step
 *
 * Displays tool tabs with validation badges.
 *
 * @example
 * <MappingHeader
 *   tools={[
 *     { id: 'prscsx', label: 'PRScsx', isValid: true },
 *     { id: 'bridgeprs', label: 'BridgePRS', isValid: false, missingCount: 2 },
 *   ]}
 *   activeToolId={activeTab}
 *   onTabChange={setActiveTab}
 * />
 */
export function MappingHeader({
  tools,
  activeToolId,
  onTabChange,
  title = "Map Dataset Files",
  subtitle,
  className,
}: MappingHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Title Section */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Tool Tabs */}
      {tools.length > 1 && (
        <Tabs value={activeToolId} onValueChange={onTabChange}>
          <TabsList className="flex-wrap">
            {tools.map((tool) => (
              <TabsTrigger
                key={tool.id}
                value={tool.id}
                className="flex items-center gap-2"
              >
                {tool.label}
                {tool.isValid ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Badge
                    variant="outline"
                    className="h-5 min-w-5 px-1.5 text-xs border-red-500 text-red-600"
                  >
                    {tool.missingCount ?? "!"}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
    </div>
  )
}

export default MappingHeader
