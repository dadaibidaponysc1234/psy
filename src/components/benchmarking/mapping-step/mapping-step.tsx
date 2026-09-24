"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  FolderSearch,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Issue,
  ToolDraft,
  ToolId,
} from "@/components/benchmarking/job-config"
import { PopulationsEditor } from "@/components/benchmarking/mapping-step/populations-editor"
import { useDatasetStructure } from "@/components/benchmarking/mapping-step/use-dataset-structure"
import { getToolDefinition } from "@/components/benchmarking/tools"
import { useBenchmarkingStore, useJobDraft } from "@/stores/benchmarking-store"

interface MappingStepProps {
  onNext: (data: Record<string, never>) => void
  onPrevious?: () => void
  toolsData?: { selectedTools?: string[] }
}

function LayoutSelect({
  label,
  help,
  value,
  onChange,
}: {
  label: string
  help: React.ReactNode
  value: FileLayout
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
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="merged">Merged</SelectItem>
          <SelectItem value="multi_chromosome">Multi Chromosome</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
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
    <div>Follows your genotype selection until you change it here.</div>
    <ul className="mt-1 list-disc pl-4">
      <li>
        <span className="font-medium">Merged</span>: one summary statistics file
        covering all chromosomes (e.g., <code>sumstats.txt</code>).
      </li>
      <li>
        <span className="font-medium">Multi Chromosome</span>: a directory of
        per-chromosome files (e.g., <code>sumstats_chr1.txt</code>,{" "}
        <code>sumstats_chr2.txt</code>).
      </li>
    </ul>
  </div>
)

function setGenotypeLayout(draft: ToolDraft, fileType: FileLayout): ToolDraft {
  // The sumstats layout follows the genotype layout until the user sets it apart.
  const followsGenotype = draft.sumstats_file_type === draft.genotype.file_type
  return {
    ...draft,
    genotype: { ...draft.genotype, file_type: fileType },
    sumstats_file_type: followsGenotype ? fileType : draft.sumstats_file_type,
  }
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

  const selected = toolsData?.selectedTools ?? []
  const selectionKey = selected.join(",")
  useEffect(() => {
    if (jobId) syncJobTools(jobId, selectionKey ? selectionKey.split(",") : [])
  }, [jobId, selectionKey, syncJobTools])

  const tools: ToolId[] =
    job?.tools.map((draft) => draft.tool) ?? selected.filter(isToolId)
  const [activeTool, setActiveTool] = useState<string>("")
  const currentTab = tools.includes(activeTool as ToolId)
    ? activeTool
    : (tools[0] ?? "")

  const issuesByTool = useMemo(() => {
    const byTool: Partial<Record<ToolId, Issue[]>> = {}
    for (const issue of job ? validateJob(job) : []) {
      if (issue.step === "mapping") (byTool[issue.tool] ??= []).push(issue)
    }
    return byTool
  }, [job])

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="mb-2 text-xl font-semibold">
          Map Files to Configuration
        </h3>
        <p className="text-muted-foreground">
          Name each tool&apos;s populations, then choose their files.
        </p>
      </div>
      {structure ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExplorerOpen(true)}
        >
          <FolderSearch className="mr-2 h-4 w-4" />
          Browse files
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Checking..." : "Refresh"}
        </Button>
      )}
    </div>
  )

  if (!structure && loading) {
    return (
      <div className="flex items-center justify-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading dataset structure...</span>
      </div>
    )
  }

  if (!structure && error) {
    return (
      <div className="space-y-6">
        {header}
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

  const blocked =
    !structure ||
    !job ||
    tools.length === 0 ||
    Object.keys(issuesByTool).length > 0

  return (
    <>
      <div className="space-y-6">
        {header}

        <Tabs
          value={currentTab}
          onValueChange={setActiveTool}
          className="flex w-full flex-col gap-6"
        >
          <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap border-b border-border bg-transparent p-0">
            {tools.map((tool) => {
              const ready = !issuesByTool[tool]
              return (
                <TabsTrigger
                  key={tool}
                  value={tool}
                  data-complete={ready}
                  className="group rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-semibold transition-all duration-200 hover:bg-muted/40 data-[state=active]:border-primary data-[state=active]:bg-primary data-[complete=false]:text-muted-foreground/80 data-[state=active]:text-white"
                >
                  <span className="flex items-center gap-2">
                    {getToolDefinition(tool).label}
                    {ready && (
                      <Badge
                        variant="outline"
                        className="hidden border-orange-600 text-xs text-orange-600 group-data-[state=active]:border-white group-data-[state=active]:text-white sm:inline-flex"
                      >
                        Ready
                      </Badge>
                    )}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {job?.tools.map((draft) => {
            const definition = getToolDefinition(draft.tool)
            const partner = definition.sharesPreprocessingWith
            const update = (change: (current: ToolDraft) => ToolDraft) =>
              jobId && updateToolDraft(jobId, draft.tool, change)
            const issues = issuesByTool[draft.tool] ?? []
            return (
              <TabsContent
                key={draft.tool}
                value={draft.tool}
                className="space-y-6"
              >
                {partner && tools.includes(partner) && (
                  <p className="text-sm text-muted-foreground">
                    {definition.label} and {getToolDefinition(partner).label}{" "}
                    are preprocessed together, so they share these populations
                    and files.
                  </p>
                )}
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-4 pt-6">
                    <LayoutSelect
                      label="Genotype file structure"
                      help={GENOTYPE_HELP}
                      value={draft.genotype.file_type}
                      onChange={(fileType) =>
                        update((current) =>
                          setGenotypeLayout(current, fileType)
                        )
                      }
                    />
                    <LayoutSelect
                      label="Sumstats file structure"
                      help={SUMSTATS_HELP}
                      value={draft.sumstats_file_type}
                      onChange={(fileType) =>
                        update((current) => ({
                          ...current,
                          sumstats_file_type: fileType,
                        }))
                      }
                    />
                  </CardContent>
                </Card>

                <PopulationsEditor
                  definition={definition}
                  draft={draft}
                  structure={structure}
                  onUpdate={update}
                />

                {issues.length > 0 && (
                  <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="space-y-1 pt-6 text-sm">
                      <div className="flex items-center gap-2 font-medium text-orange-800">
                        <AlertTriangle className="h-4 w-4" />
                        Still needed for {definition.label}
                      </div>
                      <ul className="list-disc pl-6 text-orange-900">
                        {issues.map((issue) => (
                          <li key={issue.path + issue.message}>
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
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
