/**
 * useMappingValidation
 *
 * Hook for validating tool mappings during the mapping step.
 * Checks required fields and returns validation status.
 */

import { useMemo, useCallback } from "react"

export interface MappingField {
  id: string
  label: string
  required: boolean
  acceptedTypes?: string[]
  fieldType?: string
}

export interface MissingField {
  id: string
  label: string
  required: boolean
}

export interface ToolValidationResult {
  isValid: boolean
  missingFields: MissingField[]
  mappedCount: number
  totalRequired: number
}

export interface UseMappingValidationOptions {
  /** Tool ID to validate */
  toolId: string
  /** Field definitions for this tool */
  fields: MappingField[]
  /** Current mappings for this tool */
  mappings: Record<string, unknown>
}

export interface UseMappingValidationReturn {
  /** Whether all required fields are mapped */
  isValid: boolean
  /** List of missing required fields */
  missingFields: MissingField[]
  /** Number of fields that have been mapped */
  mappedCount: number
  /** Total number of required fields */
  totalRequired: number
  /** Check if a specific field is mapped */
  isFieldMapped: (fieldId: string) => boolean
  /** Get validation result for multiple tools */
  getValidationSummary: () => ToolValidationResult
}

/**
 * Check if a mapping value is considered "filled"
 */
function isMappingFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  if (typeof value === "object") {
    // FileInfo or DirectoryItem objects
    if ("path" in (value as any)) {
      return Boolean((value as any).path)
    }
    return Object.keys(value as object).length > 0
  }
  return true
}

/**
 * Hook for validating mapping completeness
 *
 * @example
 * const { isValid, missingFields, mappedCount } = useMappingValidation({
 *   toolId: 'prscsx',
 *   fields: getToolMappingFields('prscsx'),
 *   mappings: toolMappings['prscsx'],
 * })
 */
export function useMappingValidation({
  toolId,
  fields,
  mappings,
}: UseMappingValidationOptions): UseMappingValidationReturn {
  const isFieldMapped = useCallback(
    (fieldId: string): boolean => {
      return isMappingFilled(mappings[fieldId])
    },
    [mappings]
  )

  const validationResult = useMemo((): ToolValidationResult => {
    const requiredFields = fields.filter((f) => f.required)
    const missingFields: MissingField[] = []
    let mappedCount = 0

    for (const field of fields) {
      const isMapped = isFieldMapped(field.id)
      if (isMapped) {
        mappedCount++
      } else if (field.required) {
        missingFields.push({
          id: field.id,
          label: field.label,
          required: field.required,
        })
      }
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      mappedCount,
      totalRequired: requiredFields.length,
    }
  }, [fields, isFieldMapped])

  const getValidationSummary = useCallback(
    (): ToolValidationResult => validationResult,
    [validationResult]
  )

  return {
    isValid: validationResult.isValid,
    missingFields: validationResult.missingFields,
    mappedCount: validationResult.mappedCount,
    totalRequired: validationResult.totalRequired,
    isFieldMapped,
    getValidationSummary,
  }
}

export default useMappingValidation
