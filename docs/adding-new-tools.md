# Adding New Tools to the Benchmarking System

This guide explains how to add a new PRS (Polygenic Risk Score) tool to the benchmarking system.

## Overview

The benchmarking system uses a **Tool Registry** pattern. Each tool is defined once in the registry, and all UI components automatically pick it up. This means adding a new tool requires:

1. Creating type definitions
2. Creating a configuration component
3. Creating a population configuration component
4. Creating a payload builder
5. Registering the tool

---

## Step 1: Add Type Definitions

Edit `src/components/benchmarking/tool-configuration/types.ts` to add your tool's types:

```typescript
// Column keys your tool uses
export type NewToolColumnKey = "SNP" | "A1" | "A2" | "BETA" | "P"

// Population configuration
export interface NewToolPopulationConfig {
  name: string
  sumstats_path: string
  genotype_path: string
  phenotype_path: string
}

// Preprocessing configuration (what gets saved before processing)
export interface NewToolPreProcessingConfig {
  populations: NewToolPopulationConfig[]
  column_mappings: Record<string, Partial<Record<NewToolColumnKey, string>>>
  phenotype_config: {
    binary_traits: string[]
    quantitative_traits: string[]
  }
  genotype_config: {
    file_type: "merged" | "multi_chromosome"
    file_patterns: { bed: string; bim: string; fam: string }
  }
  options: ProcessingOptions
  output_dir: string
}

// Processing state (user-editable values during configuration)
export interface NewToolProcessingState {
  binary: {
    someParameter: string
    anotherParameter: number
  }
  quantitative: {
    someParameter: string
    anotherParameter: number
  }
}

// Processing payload (what gets sent to the API)
export interface NewToolProcessingPayload {
  binary?: NewToolProcessingModePayload
  quantitative?: NewToolProcessingModePayload
}

// Add to the union type
export type ToolPreProcessingConfig =
  | PrsicePreProcessingConfig
  | PrscsxPreProcessingConfig
  | BridgeprsPreProcessingConfig
  | SdprxPreProcessingConfig
  | XpassPreProcessingConfig
  | NewToolPreProcessingConfig // <-- Add here
```

---

## Step 2: Create the Configuration Component

Create `src/components/benchmarking/tool-configuration/NewToolConfiguration.tsx`:

```typescript
"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type {
  NewToolPreProcessingConfig,
  NewToolProcessingState,
  EvaluationType,
} from "./types"

interface NewToolConfigurationProps {
  toolId: string
  config: NewToolPreProcessingConfig
  jobId: string | null
  onConfigChange: (nextConfig: NewToolPreProcessingConfig) => void
  stepBadge?: React.ReactNode
  evaluationType: EvaluationType
  processingConfig: NewToolProcessingState
  onProcessingChange: (
    updater: (state: NewToolProcessingState) => NewToolProcessingState
  ) => void
}

export function NewToolConfiguration({
  toolId,
  config,
  jobId,
  onConfigChange,
  stepBadge,
  evaluationType,
  processingConfig,
  onProcessingChange,
}: NewToolConfigurationProps) {
  // Helper to update config immutably
  const updateConfig = (
    updater: (current: NewToolPreProcessingConfig) => NewToolPreProcessingConfig
  ) => {
    onConfigChange(updater(config))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>NewTool Configuration</CardTitle>
          {stepBadge}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add your tool's configuration UI here */}

        {/* Example: Column Mapping Section */}
        <div className="space-y-4">
          <h4 className="font-medium">Column Mappings</h4>
          {/* Map column inputs */}
        </div>

        {/* Example: Processing Parameters */}
        <div className="space-y-4">
          <h4 className="font-medium">Processing Parameters</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Some Parameter</Label>
              <Input
                value={processingConfig.binary.someParameter}
                onChange={(e) =>
                  onProcessingChange((state) => ({
                    ...state,
                    binary: { ...state.binary, someParameter: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Key Points:

- Always use controlled components
- Use `onConfigChange` to update preprocessing config
- Use `onProcessingChange` for runtime processing parameters
- Support both binary and quantitative phenotype modes

---

## Step 3: Create the Population Configuration Component

Create `src/components/benchmarking/mapping/tools/newtool-population-configuration.tsx`:

```typescript
"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MappingDropZone } from "@/components/benchmarking/mapping/MappingDropZone"

interface NewToolPopulationConfigurationProps {
  toolId: string
  jobId: string | null
  onUpdatePopulation: (field: string, value: string) => void
  onUpdateMapping: (fieldId: string, value: any) => void
  mappings: Record<string, any>
  population: any
  datasetStructure: any
}

export function NewToolPopulationConfiguration({
  toolId,
  jobId,
  onUpdatePopulation,
  onUpdateMapping,
  mappings,
  population,
  datasetStructure,
}: NewToolPopulationConfigurationProps) {
  return (
    <div className="space-y-4">
      {/* Target Population Section */}
      <Card>
        <CardHeader>
          <CardTitle>Target Population</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MappingDropZone
            label="Summary Statistics"
            fieldId="target_sumstats"
            value={mappings["target_sumstats"]}
            onUpdate={(value) => onUpdateMapping("target_sumstats", value)}
            acceptedTypes={[".txt", ".gz"]}
            required
          />
          <MappingDropZone
            label="Genotype Directory"
            fieldId="target_genotype"
            value={mappings["target_genotype"]}
            onUpdate={(value) => onUpdateMapping("target_genotype", value)}
            acceptedTypes={["directory"]}
            required
          />
        </CardContent>
      </Card>

      {/* Add more population sections as needed */}
    </div>
  )
}
```

---

## Step 4: Create the Payload Builder

Create `src/components/benchmarking/payload-builders/newtool-builder.ts`:

```typescript
import type {
  EvaluationType,
  NewToolPreProcessingConfig,
  NewToolProcessingState,
  NewToolProcessingPayload,
} from "@/components/benchmarking/tool-configuration/types"

/**
 * Sanitize NewTool configuration before submission
 */
export function sanitizeNewToolConfig(
  config: NewToolPreProcessingConfig
): NewToolPreProcessingConfig {
  return {
    ...config,
    // Trim strings, filter empty values, validate ranges, etc.
    populations: config.populations.map((pop) => ({
      name: pop.name.trim(),
      sumstats_path: pop.sumstats_path.trim(),
      genotype_path: pop.genotype_path.trim(),
      phenotype_path: pop.phenotype_path.trim(),
    })),
    // ... sanitize other fields
  }
}

/**
 * Build the processing payload for NewTool
 */
export function buildNewToolProcessingPayload(
  preProcessing: NewToolPreProcessingConfig,
  processingState: NewToolProcessingState,
  mode: EvaluationType
): NewToolProcessingPayload {
  const result: NewToolProcessingPayload = {}

  const buildModePayload = (key: "binary" | "quantitative") => {
    const state = processingState[key]
    if (!state) return null

    // Validate required fields
    if (!state.someParameter) return null

    return {
      // Build the API payload from config and state
      some_field: state.someParameter,
      another_field: state.anotherParameter,
      // ... construct the full payload
    }
  }

  if (mode === "binary" || mode === "both") {
    const payload = buildModePayload("binary")
    if (payload) result.binary = payload
  }

  if (mode === "quantitative" || mode === "both") {
    const payload = buildModePayload("quantitative")
    if (payload) result.quantitative = payload
  }

  return result
}
```

Don't forget to export from the index file:

```typescript
// src/components/benchmarking/payload-builders/index.ts
export {
  sanitizeNewToolConfig,
  buildNewToolProcessingPayload,
} from "./newtool-builder"
```

---

## Step 5: Register the Tool

Edit `src/lib/tool-registry.ts`:

```typescript
import { NewToolConfiguration } from "@/components/benchmarking/tool-configuration/NewToolConfiguration"
import { NewToolPopulationConfiguration } from "@/components/benchmarking/mapping/tools/newtool-population-configuration"
import {
  sanitizeNewToolConfig,
  buildNewToolProcessingPayload,
} from "@/components/benchmarking/payload-builders/newtool-builder"
import type {
  NewToolPreProcessingConfig,
  NewToolProcessingState,
} from "@/components/benchmarking/tool-configuration/types"

// Add to the registry
TOOL_REGISTRY["newtool"] = {
  id: "newtool",
  label: "NewTool",
  description: "A brief description of what NewTool does",

  requiredColumns: ["SNP", "A1", "A2", "BETA", "P"],
  optionalColumns: ["SE"],

  supportsBinaryPhenotypes: true,
  supportsQuantitativePhenotypes: true,

  populationCount: 2,
  populationLabels: ["Target", "Reference"],

  ConfigurationComponent: NewToolConfiguration,
  PopulationConfigurationComponent: NewToolPopulationConfiguration,

  sanitizeConfig: sanitizeNewToolConfig,
  buildProcessingPayload: buildNewToolProcessingPayload,

  getDefaultConfig: (): NewToolPreProcessingConfig => ({
    populations: [],
    column_mappings: {},
    phenotype_config: {
      binary_traits: [],
      quantitative_traits: [],
    },
    genotype_config: {
      file_type: "merged",
      file_patterns: { bed: "", bim: "", fam: "" },
    },
    options: {
      evaluation_type: "both",
      process_binary_phenotypes: true,
      process_quantitative_phenotypes: true,
      skip_missing_columns: false,
      overwrite_existing: false,
    },
    output_dir: "",
  }),

  getDefaultProcessingState: (): NewToolProcessingState => ({
    binary: { someParameter: "", anotherParameter: 0 },
    quantitative: { someParameter: "", anotherParameter: 0 },
  }),
}
```

---

## Step 6: Verify

1. **TypeScript Check**: Run `npm run build` or `npx tsc --noEmit` to catch type errors

2. **Visual Check**: Start the dev server and navigate to the benchmarking page:

   ```bash
   npm run dev
   ```

   Your new tool should appear in the tool selection step.

3. **Functional Test**:
   - Select your tool
   - Upload a dataset
   - Complete the mapping step
   - Verify configuration renders correctly
   - Submit a job and check the payload in Network tab

---

## File Summary

After adding a new tool, you should have created/modified these files:

| File                                                                             | Action               |
| -------------------------------------------------------------------------------- | -------------------- |
| `src/components/benchmarking/tool-configuration/types.ts`                        | Add type definitions |
| `src/components/benchmarking/tool-configuration/NewToolConfiguration.tsx`        | Create (new file)    |
| `src/components/benchmarking/mapping/tools/newtool-population-configuration.tsx` | Create (new file)    |
| `src/components/benchmarking/payload-builders/newtool-builder.ts`                | Create (new file)    |
| `src/components/benchmarking/payload-builders/index.ts`                          | Add export           |
| `src/lib/tool-registry.ts`                                                       | Register the tool    |

---

## Tips

### Reusing Common Components

The system provides several shared components you can use:

- `ColumnMappingSection` - For mapping file columns to required fields
- `MappingDropZone` - For drag-and-drop file/directory assignment
- `PhenotypeTraitSelector` - For selecting binary/quantitative traits
- `GenotypeConfigPanel` - For genotype file type configuration

### Testing in Isolation

You can test your configuration component in isolation by importing it directly:

```tsx
import { NewToolConfiguration } from "@/components/benchmarking/tool-configuration/NewToolConfiguration"

// Use with mock props for development
```

### Column Aliases

If your tool accepts common column names with aliases (e.g., "RSID" for "SNP"), add them to `column-aliases.ts`:

```typescript
// src/components/benchmarking/tool-configuration/column-aliases.ts
export const COMMON_COLUMN_ALIASES = {
  SNP: ["SNP", "RSID", "RS", "MARKER", "MARKERNAME", "ID"],
  // ...
}
```

---

## Removing a Tool

To remove a tool, simply delete its entry from the `TOOL_REGISTRY` object. The tool will no longer appear in the UI. You may optionally delete the component files to clean up.
