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

export interface SdprxMappingSectionProps {
  /** Job ID */
  jobId: string | null
  /** Current mappings for this tool */
  mappings: Record<string, FileInfo | DirectoryItem | null>
  /** Callback to update a mapping */
  onUpdateMapping: (fieldId: string, value: FileInfo | DirectoryItem | null) => void
  /** Callback to update population name */
  onUpdatePopulation?: (field: string, value: string) => void
  /** Population configuration */
  population?: {
    pop1Name?: string
    pop2Name?: string
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
 * SdprxMappingSection - Mapping fields for SDPRX tool
 *
 * Displays Pop1 (target) and Pop2 (base) population mapping fields.
 */
export function SdprxMappingSection({
  jobId,
  mappings,
  onUpdateMapping,
  onUpdatePopulation,
  population,
  validation,
  className,
}: SdprxMappingSectionProps) {
  const pop1Name = population?.pop1Name || "Target Population"
  const pop2Name = population?.pop2Name || "Base Population"

  return (
    <div className={className}>
      {/* Validation Status */}
      {validation && (
        <MappingValidationPanel
          toolId="sdprx"
          toolLabel="SDPRX"
          isValid={validation.isValid}
          missingFields={validation.missingFields}
          className="mb-4"
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pop1 (Target) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{pop1Name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MappingDropZone
              fieldId="pop1.sumstats_path"
              label="Summary Statistics"
              description="Summary statistics file for the target population"
              acceptedTypes={[".txt", ".csv", ".tsv", ".gz"]}
              required
              value={mappings["pop1.sumstats_path"]}
              onUpdate={(val) => onUpdateMapping("pop1.sumstats_path", val)}
            />
            <MappingDropZone
              fieldId="pop1.genotype_path"
              label="Genotype Directory"
              description="Directory containing PLINK genotype files (.bed, .bim, .fam)"
              acceptedTypes={["Directory"]}
              required
              value={mappings["pop1.genotype_path"]}
              onUpdate={(val) => onUpdateMapping("pop1.genotype_path", val)}
            />
            <MappingDropZone
              fieldId="pop1.phenotype_path"
              label="Phenotype File"
              description="Phenotype data file"
              acceptedTypes={[".txt", ".csv", ".tsv"]}
              required
              value={mappings["pop1.phenotype_path"]}
              onUpdate={(val) => onUpdateMapping("pop1.phenotype_path", val)}
            />
          </CardContent>
        </Card>

        {/* Pop2 (Base) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{pop2Name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MappingDropZone
              fieldId="pop2.sumstats_path"
              label="Summary Statistics"
              description="Summary statistics file for the base population"
              acceptedTypes={[".txt", ".csv", ".tsv", ".gz"]}
              required
              value={mappings["pop2.sumstats_path"]}
              onUpdate={(val) => onUpdateMapping("pop2.sumstats_path", val)}
            />
            <MappingDropZone
              fieldId="pop2.genotype_path"
              label="Genotype Directory"
              description="Directory containing PLINK genotype files (.bed, .bim, .fam)"
              acceptedTypes={["Directory"]}
              required
              value={mappings["pop2.genotype_path"]}
              onUpdate={(val) => onUpdateMapping("pop2.genotype_path", val)}
            />
            <MappingDropZone
              fieldId="pop2.phenotype_path"
              label="Phenotype File"
              description="Phenotype data file"
              acceptedTypes={[".txt", ".csv", ".tsv"]}
              required
              value={mappings["pop2.phenotype_path"]}
              onUpdate={(val) => onUpdateMapping("pop2.phenotype_path", val)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SdprxMappingSection
