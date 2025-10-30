# ToolConfiguration Component Implementation Plan

## Overview

Transform the current `configure.tsx` into a comprehensive `ToolConfiguration.tsx` component that handles tool-specific configuration for the benchmarking workflow.

## Current State

- `configure.tsx` has basic form fields (MAF threshold, missing threshold, tool-specific options)
- Needs to be replaced with tool-specific configuration tabs

## Target State

- Per-tool tabs (PRSice, SDPRX, LDpred2, etc.)
- Collapsible sections within each tab
- File previews from backend
- Column mapping with auto-selection (tool-specific)
- Phenotype configuration
- Genotype configuration
- Processing options

## Implementation Steps

### Step 1: Basic Structure & Types ✅

- [x] Create new `ToolConfiguration.tsx` component
- [x] Define TypeScript interfaces
- [x] Set up basic component structure with tabs
- [x] Replace old `configure.tsx` content
- [x] Add state management and store persistence
- [x] Add basic validation logic

### Step 2: Column Mapping Section ✅

- [x] Implement collapsible Column Mapping section
- [x] Add backend preview fetching for sumstats files
- [x] Create preview table component
- [x] Implement column mapping dropdowns with auto-selection
- [x] Add COLUMN_MAPPING logic (tool-specific)
- [x] Handle different mapping requirements per tool (PRSice vs SDPRX vs LDpred2)

### Step 3: Phenotype Configuration ✅

- [x] Implement collapsible Phenotype Config section
- [x] Add phenotype file preview fetching
- [x] Checkbox-based multi-select for binary/quantitative traits
- [x] Handle target vs source population configuration

### Step 4: Genotype Configuration ✅

- [x] Implement collapsible Genotype Config section
- [x] Add file type dropdown
- [x] Add population reference dropdown
- [x] Add file pattern inputs

### Step 5: Processing Options ✅

- [x] Implement collapsible Processing Options section
- [x] Add checkboxes for processing options
- [x] Wire up state management

### Step 6: Integration & Polish

- [ ] Replace old configure component in main flow
- [ ] Test data flow and state persistence
- [ ] Add error handling and loading states
- [ ] Style consistency with Mapping component

## File Structure

```
src/components/benchmarking/
├── configure.tsx (old - to be replaced)
├── tool-configuration.tsx (new - main component) ✅
└── components/
    ├── column-mapping.tsx
    ├── phenotype-config.tsx
    ├── genotype-config.tsx
    └── processing-options.tsx
```

## Progress

- [x] Plan created
- [x] Step 1: Basic Structure & Types ✅
- [x] Step 2: Column Mapping Section ✅
- [x] Step 3: Phenotype Configuration ✅
- [x] Step 4: Genotype Configuration ✅
- [x] Step 5: Processing Options
- [ ] Step 6: Integration & Polish

## Step 1 Completed ✅

- Created `ToolConfiguration.tsx` with proper TypeScript interfaces
- Implemented per-tool tabs structure
- Added state management with Zustand store integration
- Added basic validation for required column mappings
- Added placeholder sections for all configuration areas
- Integrated with existing benchmarking flow props

## Step 2 Completed ✅

- Implemented collapsible Column Mapping section with proper styling
- Added backend preview fetching for sumstats files (using the real preview API)
- Created preview table component using CSS Grid (no external table dependency)
- Implemented column mapping dropdowns with auto-selection logic
- Added tool-specific column requirements (PRSice only for now)
- Integrated COLUMN_MAPPING auto-selection with smart alias matching
- Added proper state management for previews and loading states

## Step 3 Completed ✅

- Implemented collapsible Phenotype Configuration section
- Added backend preview fetching for phenotype files (target + source)
- Parsed headers from first preview line for trait selection
- Checkbox-based multi-select for binary and quantitative traits
- Updated `phenotype_config` in state per population

## Step 4 Completed ✅

- Implemented collapsible Genotype Configuration section
- Added dropdown for file type: merged | multi_chromosome
- Added dropdown for population reference: target_population | source_population
- Added inputs for file patterns: bed, bim, fam
- Wired up updates to `genotype_config`
- Centralized preview URL construction via `getBenchmarkPreviewUrl` and updated both `ToolConfiguration` and `FileExplorer` to use it

## Step 5 Completed ✅

- Implemented a collapsible Processing Options section
- Added checkboxes for:
  - process_binary_phenotypes
  - process_quantitative_phenotypes
  - skip_missing_columns
  - overwrite_existing
- Wired updates into `processing_options` per tool tab

## Important Notes

- **Column mappings are tool-specific**: PRSice is supported now
- **Auto-selection**: Uses tool-specific COLUMN_MAPPING dictionaries
- **Preview table**: Uses CSS Grid
- **Preview API**: Uses the same backend endpoint as the File Explorer for consistency (via `getBenchmarkPreviewUrl`)

## Next Steps

Ready to implement **Step 6: Integration & Polish** which will include:

- Replace old configure component in main flow
- Test data flow and state persistence
- Add error handling and loading states
- Style consistency with Mapping component

## BridgePRS Tool Configuration Upgrade Plan

### Goals
- Make BridgePRS configuration UI and behavior consistent with PRSice.
- Support file preview for both populations (pop1/Target and pop2/Base) and auto-map required columns.
- Enable phenotype header preview for both populations with checkbox selection of traits.
- Mirror PRSice genotype configuration controls and processing options.
- Use global evaluation type from the parent and persist via the store.
- Ensure final payload matches `reference/config-example.json` for BridgePRS.

### Final Payload Conformance
- Pre-processing structure for BridgePRS must follow:
  - `pop1` and `pop2` objects with `name`, `sumstats_path`, `phenotype_path`, `genotype_path`.
  - `column_mappings` for required keys: `CHR`, `ID`, `PS`, `A1`, `REF`, `BETA`, `SE`, `P`, `N`.
  - `fixed_N` optional number.
  - `genotype_config` with `file_type`, `population_reference`, `file_patterns` (bed, bim, fam).
  - `phenotype_config` for `pop1` and `pop2` with `binary_traits`, `quantitative_traits`.
  - `options` with `evaluation_type`, `process_binary_phenotypes`, `process_quantitative_phenotypes`, `skip_missing_columns`, `overwrite_existing`.

### UI & Behavior Parity with PRSice
1. Collapsible sections identical to PRSice:
   - Column Mapping
   - Phenotype Configuration
   - Genotype Configuration
   - Processing Options

2. Column Mapping
   - Add API-backed file preview for `pop1.sumstats_path` and `pop2.sumstats_path` using `getBenchmarkPreviewUrl(jobId, path)`.
   - Build alias dictionaries for BridgePRS required columns.
   - Auto-map columns from headers for both populations; if mappings differ between populations, warn and require user reconciliation. Apply the common mapping (prefer `pop1`) to `config.column_mappings` to conform with final payload.
   - Use a dropdown with dynamic options sourced from preview headers, excluding already-selected headers (same UX as PRSice).

3. Phenotype Configuration
   - Preview phenotype files for both populations; parse headers and present checkbox lists.
   - Respect global `evaluationType` to enable/disable binary/quantitative trait selection.
   - Update `config.phenotype_config.pop1` and `.pop2` arrays accordingly.

4. Genotype Configuration
- Mirror PRSice controls: `file_type` (merged/multi_chromosome), `population_reference` (pop1/pop2), and file patterns (bed/bim/fam).
   - Include BridgePRS-specific `genotype_path` and `output_dir` fields.
   - Add `fixed_N` input with validation (numeric only).

5. Processing Options
   - Same checkboxes as PRSice; align copy and layout.
   - Do not manage `evaluation_type` internally — consume and display the global evaluation type passed from parent.

### Integration Changes
- Update `ToolConfiguration.tsx` to pass `jobId` and `evaluationType` props to `BridgeprsToolConfiguration` for preview and trait gating.
- Propagate global `evaluationType` into BridgePRS `options.evaluation_type` in the same effect that updates PRSice/PRScsx.
- Keep existing `sanitizeBridgeprsConfig` and validation logic; ensure new UI writes to compatible fields.

### Auto-Mapping Strategy
- Define `BRIDGEPRS_COLUMN_ALIASES` for keys: `CHR`, `ID`, `PS`, `A1`, `REF`, `BETA`, `SE`, `P`, `N`.
- When previews are available:
  - Find matches in `pop1` and `pop2` headers using case-insensitive alias matching.
  - If both populations agree on a header for a key, set that in `column_mappings`.
  - If they differ, show a toast warning and set the `pop1` header temporarily; highlight fields needing review.

### Validation & UX Notes
- Maintain the existing validation checks for BridgePRS (required paths, file patterns, column mappings, output dirs).
- Display loaded header counts and loading states like PRSice.
- Ensure consistent styling and section behavior with PRSice for a uniform experience.

### Testing & Preview
- Start the dev server, navigate to the benchmarking Tool Configuration step, and verify:
  - Previews load for both populations.
  - Auto-mapping populates required fields and handles mismatches.
  - Trait selection reflects evaluation type gating.
  - Genotype and processing options update the config correctly.
- Confirm final payload structure matches `reference/config-example.json` for BridgePRS.
