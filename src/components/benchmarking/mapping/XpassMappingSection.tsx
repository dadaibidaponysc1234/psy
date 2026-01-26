"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MappingDropZone } from "./MappingDropZone"
import { MappingValidationPanel } from "./MappingValidationPanel"

interface DirectoryItem {
  name: string
  path: string
  file_count?: number
  total_size?: number
  total_size_formatted?: string
}

interface FileInfo {
  name: string
  path: string
  size?: number
  size_formatted?: string
  file_type?: string
  is_previewable?: boolean
  last_modified?: string
}

export interface XpassMappingSectionProps {
  /** Job ID */
  jobId: string | null
  /** Current mappings for this tool */
  mappings: Record<string, FileInfo | DirectoryItem | null>
  /** Callback to update a mapping */
  onUpdateMapping: (fieldId: string, value: FileInfo | DirectoryItem | null) => void
  /** Population configuration */
  population?: {
    pop1Name?: string // Target
    pop2Name?: string // Auxiliary
    pop3Name?: string // Validation
  }
  /** Validation state */
  validation?: {
    isValid: boolean
    missingFields: Array<{ id: string; label: string; required: boolean }>
  }
  /** Additional className */
  className?: string
}

/**
 * XpassMappingSection - Mapping fields for XPASS/XPASS+ tools
 *
 * Displays Target (Pop1), Auxiliary (Pop2), and Validation (Pop3) population mapping fields.
 */
export function XpassMappingSection({
  jobId,
  mappings,
  onUpdateMapping,
  population,
  validation,
  className,
}: XpassMappingSectionProps) {
  const pop1Name = population?.pop1Name || "Target Population"
  const pop2Name = population?.pop2Name || "Auxiliary Population"
  const pop3Name = population?.pop3Name || "Validation Population"

  return (
    <div className={className}>
      {/* Validation Status */}
      {validation && (
        <MappingValidationPanel
          toolId="xpass"
          toolLabel="XPASS"
          isValid={validation.isValid}
          missingFields={validation.missingFields}
          className="mb-4"
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pop1 (Target) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{pop1Name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MappingDropZone
              fieldId="pop1.sumstats_path"
              label="Summary Statistics"
              description="Summary statistics file for target population"
              acceptedTypes={[".txt", ".csv", ".tsv", ".gz"]}
              required
              value={mappings["pop1.sumstats_path"]}
              onUpdate={(val) => onUpdateMapping("pop1.sumstats_path", val)}
            />
            <MappingDropZone
              fieldId="pop1.genotype_path"
              label="Genotype Directory"
              description="Directory containing PLINK genotype files"
              acceptedTypes={["Directory"]}
              required
              value={mappings["pop1.genotype_path"]}
              onUpdate={(val) => onUpdateMapping("pop1.genotype_path", val)}
            />
          </CardContent>
        </Card>

        {/* Pop2 (Auxiliary) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{pop2Name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MappingDropZone
              fieldId="pop2.sumstats_path"
              label="Summary Statistics"
              description="Summary statistics file for auxiliary population"
              acceptedTypes={[".txt", ".csv", ".tsv", ".gz"]}
              required
              value={mappings["pop2.sumstats_path"]}
              onUpdate={(val) => onUpdateMapping("pop2.sumstats_path", val)}
            />
            <MappingDropZone
              fieldId="pop2.genotype_path"
              label="Genotype Directory"
              description="Directory containing PLINK genotype files"
              acceptedTypes={["Directory"]}
              required
              value={mappings["pop2.genotype_path"]}
              onUpdate={(val) => onUpdateMapping("pop2.genotype_path", val)}
            />
          </CardContent>
        </Card>

        {/* Pop3 (Validation) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{pop3Name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MappingDropZone
              fieldId="pop3.sumstats_path"
              label="Summary Statistics"
              description="Summary statistics file for validation population"
              acceptedTypes={[".txt", ".csv", ".tsv", ".gz"]}
              required
              value={mappings["pop3.sumstats_path"]}
              onUpdate={(val) => onUpdateMapping("pop3.sumstats_path", val)}
            />
            <MappingDropZone
              fieldId="pop3.genotype_path"
              label="Genotype Directory"
              description="Directory containing PLINK genotype files"
              acceptedTypes={["Directory"]}
              required
              value={mappings["pop3.genotype_path"]}
              onUpdate={(val) => onUpdateMapping("pop3.genotype_path", val)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default XpassMappingSection
