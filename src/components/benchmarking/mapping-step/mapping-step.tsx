"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "react-hot-toast"
import { AlertTriangle, Folder, Info, Loader2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip } from "@/components/ui/tooltip"
import { FileExplorer } from "@/components/benchmarking/file-explorer"
import { isToolId, validateJob } from "@/components/benchmarking/job-config"
import type {
  FileLayout,
  ToolDefinition,
  ToolDraft,
  ToolId,
} from "@/components/benchmarking/job-config"
import { eligibleEntries } from "@/components/benchmarking/mapping-step/dataset"
import type { DatasetStructure } from "@/components/benchmarking/mapping-step/dataset"
import { MappingCard } from "@/components/benchmarking/mapping-step/mapping-card"
import {
  mappingFields,
  namesReady,
  populationSummary,
  usesConfigurePanel,
  withIncluded,
} from "@/components/benchmarking/mapping-step/mapping-fields"
import { NamesPanel } from "@/components/benchmarking/mapping-step/names-panel"
import { PrscsxPopulations } from "@/components/benchmarking/mapping-step/prscsx-populations"
import { useDatasetStructure } from "@/components/benchmarking/mapping-step/use-dataset-structure"
import { getToolDefinition } from "@/components/benchmarking/tools"
import { useBenchmarkingStore, useJobDraft } from "@/stores/benchmarking-store"

interface MappingStepProps {
  onNext: (data: Record<string, never>) => void
  onPrevious?: () => void
  toolsData?: { selectedTools?: string[] }
}

const GENOTYPE_HELP = (
  <div>
    <div className="mb-1 font-semibold">Genotype file structure</div>
    <div>
      <span className="font-medium">Merged</span> means a single set of PLINK
      files (<code>.bed</code>, <code>.bim</code>, <code>.fam</code>) covering
      all chromosomes.
    </div>
    <div className="mt-1">
      <span className="font-medium">Multi Chromosome</span> means a directory
      with per-chromosome PLINK triplets (e.g., <code>chr1.bed/bim/fam</code>,{" "}
      <code>chr2.*</code>).
    </div>
  </div>
)

const SUMSTATS_HELP = (
  <div>
    <div className="mb-1 font-semibold">Sumstats file structure</div>
    <div>
      Defaults to your genotype selection: if genotype is{" "}
      <span className="font-medium">Merged</span>, sumstats defaults to{" "}
      <span className="font-medium">Merged</span>; if genotype is
      <span className="font-medium"> Multi Chromosome</span>, sumstats defaults
      to
      <span className="font-medium"> Multi Chromosome</span>.
    </div>
    <div className="mt-1">
      You can change sumstats independently here if needed.
    </div>
    <div className="mt-2">
      <div className="font-medium">Differences:</div>
      <ul className="mt-1 list-disc pl-4">
        <li>
          <span className="font-medium">Merged</span>: a single summary
          statistics file containing variants across all chromosomes (e.g.,{" "}
          <code>sumstats.txt</code>).
        </li>
        <li>
          <span className="font-medium">Multi Chromosome</span>: a directory
          with separate per‑chromosome files (e.g.,{" "}
          <code>sumstats_chr1.txt</code>, <code>sumstats_chr2.txt</code>, … or{" "}
          <code>chr1.sumstats</code>, <code>chr2.sumstats</code>).
        </li>
      </ul>
    </div>
  </div>
)

function LayoutSelect({
  label,
  help,
  value,
  placeholder,
  onChange,
}: {
  label: string
  help: React.ReactNode
  value: FileLayout
  placeholder: string
  onChange: (value: FileLayout) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Label className="text-xs">{label}</Label>
        <Tooltip delayMs={400} content={help}>
          <div aria-label={`${label} help`} className="inline-flex cursor-help">
            <Info className="h-3 w-3 text-orange-500" />
          </div>
        </Tooltip>
      </div>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as FileLayout)}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="merged">Merged</SelectItem>
          <SelectItem value="multi_chromosome">Multi Chromosome</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function setGenotypeLayout(draft: ToolDraft, fileType: FileLayout): ToolDraft {
  // The sumstats layout follows the genotype layout until the user sets it apart.
  const followsGenotype = draft.sumstats_file_type === draft.genotype.file_type
  return {
    ...draft,
    genotype: { ...draft.genotype, file_type: fileType },
    sumstats_file_type: followsGenotype ? fileType : draft.sumstats_file_type,
  }
}

/** Issues the mapping page shows for a tool: the core's, plus the unsaved names form. */
function mappingIssues(
  definition: ToolDefinition,
  draft: ToolDraft,
  coreIssues: string[]
): string[] {
  const unsaved = !usesConfigurePanel(definition) && !draft.names_saved
  return unsaved ? ["Save the population names", ...coreIssues] : coreIssues
}

interface ToolMappingProps {
  draft: ToolDraft
  structure: DatasetStructure | null
  sharedWith?: string
  issues: string[]
  update: (change: (draft: ToolDraft) => ToolDraft) => void
  onBrowse: () => void
}

export function ToolMapping({
  draft,
  structure,
  sharedWith,
  issues,
  update,
  onBrowse,
}: ToolMappingProps) {
  const definition = getToolDefinition(draft.tool)
  const [panelOpen, setPanelOpen] = useState(true)

  const editPopulation = (id: string, name: string) =>
    update((current) => ({
      ...current,
      // An edited name has to be saved again before files can be mapped.
      names_saved: false,
      populations: current.populations.map((population) =>
        population.id === id ? { ...population, name } : population
      ),
    }))

  const saveNames = () => {
    update((current) => ({ ...current, names_saved: true }))
    setPanelOpen(false)
    toast.success("Population names saved! You can now start mapping files.")
  }

  const grid = () => {
    if (!structure) {
      return (
        <Card className="border border-dashed">
          <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Waiting for dataset structure...
          </CardContent>
        </Card>
      )
    }

    if (!namesReady(definition, draft)) {
      return (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
              <div>
                <CardTitle className="text-sm font-semibold text-orange-900">
                  Population configuration required
                </CardTitle>
                <CardDescription className="text-xs text-orange-700">
                  Please configure population(s) for {definition.label} before
                  mapping files.
                </CardDescription>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Configuration Mapping</CardTitle>
                <CardDescription>
                  Map files for the {populationSummary(definition, draft)}. Use
                  the search dropdown in each card to find and assign files.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={onBrowse}>
                <Folder className="mr-2 h-4 w-4" />
                Browse Files
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <LayoutSelect
                label="Genotype file structure"
                help={GENOTYPE_HELP}
                placeholder="Select genotype file type"
                value={draft.genotype.file_type}
                onChange={(fileType) =>
                  update((current) => setGenotypeLayout(current, fileType))
                }
              />
              <LayoutSelect
                label="Sumstats file structure"
                help={SUMSTATS_HELP}
                placeholder="Select sumstats file type"
                value={draft.sumstats_file_type}
                onChange={(fileType) =>
                  update((current) => ({
                    ...current,
                    sumstats_file_type: fileType,
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {mappingFields(definition, draft).map((field) => {
            const population = draft.populations.find(
              (p) => p.id === field.populationId
            )
            const setPath = (path: string) =>
              update((current) => ({
                ...current,
                populations: current.populations.map((p) =>
                  p.id === field.populationId ? { ...p, [field.key]: path } : p
                ),
              }))
            return (
              <MappingCard
                key={`${field.populationId}-${field.key}`}
                pathKey={field.key}
                title={field.title}
                description={field.description}
                optional={field.optional}
                value={population?.[field.key] ?? ""}
                {...eligibleEntries(
                  structure,
                  field.key,
                  draft.sumstats_file_type
                )}
                onSelect={(path, name) => {
                  setPath(path)
                  toast.success(`Mapped ${name} to ${field.title}`)
                }}
                onClear={() => setPath("")}
              />
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      {sharedWith && (
        <p className="text-sm text-muted-foreground">
          {definition.label} and {sharedWith} are preprocessed together, so they
          share these populations and files.
        </p>
      )}
      {usesConfigurePanel(definition) ? (
        <PrscsxPopulations
          draft={draft}
          isOpen={panelOpen}
          onOpenChange={setPanelOpen}
          onUpdate={update}
        />
      ) : (
        <NamesPanel
          definition={definition}
          populations={draft.populations}
          isOpen={panelOpen}
          onOpenChange={setPanelOpen}
          onNameChange={editPopulation}
          onIncludeChange={(id, key, included) =>
            update((current) => ({
              ...current,
              populations: current.populations.map((population) =>
                population.id === id
                  ? withIncluded(population, { [key]: included })
                  : population
              ),
            }))
          }
          onSave={saveNames}
          isCompleted={draft.names_saved}
        />
      )}
      {grid()}
      {issues.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="space-y-1 pt-6 text-sm">
            <div className="flex items-center gap-2 font-medium text-orange-800">
              <AlertTriangle className="h-4 w-4" />
              Still needed for {definition.label}
            </div>
            <ul className="list-disc pl-6 text-orange-900">
              {issues.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  )
}

/** Step 3 of the benchmarking flow: name each tool's populations and map their files. */
export function MappingStep({
  onNext,
  onPrevious,
  toolsData,
}: MappingStepProps) {
  const jobId = useBenchmarkingStore((state) => state.jobId)
  const syncJobTools = useBenchmarkingStore((state) => state.syncJobTools)
  const updateToolDraft = useBenchmarkingStore((state) => state.updateToolDraft)
  const job = useJobDraft(jobId)
  const { structure, loading, error, refresh } = useDatasetStructure(jobId)
  const [explorerOpen, setExplorerOpen] = useState(false)

  const selectionKey = (toolsData?.selectedTools ?? []).join(",")
  useEffect(() => {
    if (jobId) syncJobTools(jobId, selectionKey ? selectionKey.split(",") : [])
  }, [jobId, selectionKey, syncJobTools])

  const tools: ToolId[] =
    job?.tools.map((draft) => draft.tool) ??
    (selectionKey ? selectionKey.split(",").filter(isToolId) : [])
  const [activeTool, setActiveTool] = useState("")
  const currentTab = tools.includes(activeTool as ToolId)
    ? activeTool
    : (tools[0] ?? "")

  const issuesByTool = useMemo(() => {
    const core: Partial<Record<ToolId, string[]>> = {}
    for (const issue of job ? validateJob(job) : []) {
      if (issue.step === "mapping")
        (core[issue.tool] ??= []).push(issue.message)
    }
    const all: Partial<Record<ToolId, string[]>> = {}
    for (const draft of job?.tools ?? []) {
      all[draft.tool] = mappingIssues(
        getToolDefinition(draft.tool),
        draft,
        core[draft.tool] ?? []
      )
    }
    return all
  }, [job])

  if (loading) {
    return (
      <div className="flex items-center justify-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading dataset structure...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-xl font-semibold">
            Map Files to Configuration
          </h3>
          <p className="text-muted-foreground">
            Map your uploaded files to the appropriate configuration fields for
            the selected tools.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <Button onClick={refresh} variant="outline" className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const ready = (tool: ToolId) => (issuesByTool[tool]?.length ?? 1) === 0
  const blocked = !structure || tools.length === 0 || !tools.every(ready)

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="mb-2 text-xl font-semibold">
              Map Files to Configuration
            </h3>
            <p className="text-muted-foreground">
              First define your populations, then map files to the configuration
              structure.
            </p>
          </div>
          {!structure && (
            <Button
              onClick={refresh}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              {loading ? "Checking..." : "Refresh"}
            </Button>
          )}
        </div>

        <Tabs
          value={currentTab}
          onValueChange={setActiveTool}
          className="flex w-full flex-col gap-6"
        >
          <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap border-b border-border bg-transparent p-0">
            {tools.map((tool) => (
              <TabsTrigger
                key={tool}
                value={tool}
                data-complete={ready(tool)}
                className="group rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-semibold transition-all duration-200 hover:bg-muted/40 data-[state=active]:border-primary data-[state=active]:bg-primary data-[complete=false]:text-muted-foreground/80 data-[state=active]:text-white"
              >
                <span className="flex items-center gap-2">
                  {getToolDefinition(tool).label}
                  {ready(tool) && (
                    <Badge
                      variant="outline"
                      className="hidden border-orange-600 text-xs text-orange-600 group-data-[state=active]:border-white group-data-[state=active]:text-white sm:inline-flex"
                    >
                      Ready
                    </Badge>
                  )}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {job?.tools.map((draft) => {
            const partner = getToolDefinition(
              draft.tool
            ).sharesPreprocessingWith
            return (
              <TabsContent
                key={draft.tool}
                value={draft.tool}
                className="space-y-6"
              >
                <ToolMapping
                  draft={draft}
                  structure={structure}
                  sharedWith={
                    partner && tools.includes(partner)
                      ? getToolDefinition(partner).label
                      : undefined
                  }
                  issues={issuesByTool[draft.tool] ?? []}
                  update={(change) =>
                    jobId && updateToolDraft(jobId, draft.tool, change)
                  }
                  onBrowse={() => setExplorerOpen(true)}
                />
              </TabsContent>
            )
          })}
        </Tabs>

        <div className="flex justify-between">
          {onPrevious && (
            <Button variant="outline" onClick={onPrevious}>
              Back
            </Button>
          )}
          <Button onClick={() => onNext({})} disabled={blocked}>
            Next
          </Button>
        </div>
      </div>

      <Dialog open={explorerOpen} onOpenChange={setExplorerOpen}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Browse Dataset Files</DialogTitle>
          </DialogHeader>
          <FileExplorer datasetStructure={structure} jobId={jobId} />
        </DialogContent>
      </Dialog>
    </>
  )
}
