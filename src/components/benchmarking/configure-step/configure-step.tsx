"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { toast } from "react-hot-toast"
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import benchmarkApi from "@/lib/benchmark-api"
import { configRefusalMessage } from "@/lib/api-errors"
import { getBenchmarkConfigCheckUrl, getBenchmarkConfigUrl } from "@/lib/config"
import {
  buildJobConfig,
  isToolId,
  quirksFor,
} from "@/components/benchmarking/job-config"
import type {
  EvaluationType,
  Issue,
  JobConfig,
  ToolId,
} from "@/components/benchmarking/job-config"
import {
  getToolDefinition,
  TOOL_DEFINITIONS,
} from "@/components/benchmarking/tools"
import { useDatasetStructure } from "@/components/benchmarking/mapping-step/use-dataset-structure"
import {
  fieldId,
  locateIssue,
  SECTION_ORDER,
  SECTION_TITLES,
} from "@/components/benchmarking/configure-step/issues"
import { withScoredTraits } from "@/components/benchmarking/configure-step/params"
import {
  INITIAL_NAV,
  ToolForm,
  type FormNav,
} from "@/components/benchmarking/configure-step/tool-form"
import { useBenchmarkingStore, useJobDraft } from "@/stores/benchmarking-store"

/** What the page calls each tool, for naming the one a refused config is about. */
const TOOL_LABELS: Record<string, string> = Object.fromEntries(
  TOOL_DEFINITIONS.map((definition) => [definition.id, definition.label])
)

const EVALUATION_TYPES: { value: EvaluationType; label: string }[] = [
  { value: "both", label: "Binary + Quantitative" },
  { value: "binary", label: "Binary" },
  { value: "quantitative", label: "Quantitative" },
]

export interface ConfigureStepResult {
  config: JobConfig
  submitted: true
  jobId: string
  timestamp: string
}

interface ConfigureStepProps {
  onNext: (data: ConfigureStepResult) => void
  onPrevious?: () => void
  toolsData?: { selectedTools?: string[] }
}

const joinNames = (names: string[]) =>
  names.length <= 1
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`

/** "Next is blocked" with every issue, grouped by tool and section; clicking one goes to its field. */
function BlockedSummary({
  issues,
  onJump,
}: {
  issues: Issue[]
  onJump: (issue: Issue) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const tools = issues
    .map((issue) => issue.tool)
    .filter((tool, index, all) => all.indexOf(tool) === index)
  const labels = tools.map((tool) => getToolDefinition(tool).label)

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-medium text-orange-800">
          <AlertTriangle className="h-4 w-4" />
          Next is blocked: {issues.length} item{issues.length === 1 ? "" : "s"}{" "}
          in {joinNames(labels)}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-orange-800 hover:bg-orange-100"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? (
            <ChevronDown className="mr-1 h-4 w-4" />
          ) : (
            <ChevronRight className="mr-1 h-4 w-4" />
          )}
          {expanded ? "Hide" : "Show"}
        </Button>
      </div>
      {expanded && (
        <div className="mt-3 space-y-3">
          {tools.map((tool, index) => {
            const own = issues.filter((issue) => issue.tool === tool)
            const onMapping = own.filter((issue) => !locateIssue(issue))
            return (
              <div key={tool}>
                <p className="font-semibold text-orange-900">{labels[index]}</p>
                {SECTION_ORDER.map((section) => {
                  const here = own.filter(
                    (issue) => locateIssue(issue)?.section === section
                  )
                  if (here.length === 0) return null
                  return (
                    <div key={section} className="ml-3 mt-1">
                      <p className="text-xs uppercase text-orange-700">
                        {SECTION_TITLES[section]}
                      </p>
                      <ul className="ml-3 list-disc text-orange-900">
                        {here.map((issue) => (
                          <li key={`${issue.path}-${issue.message}`}>
                            <button
                              type="button"
                              className="text-left underline-offset-2 hover:underline"
                              onClick={() => onJump(issue)}
                            >
                              {issue.message}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
                {onMapping.length > 0 && (
                  <div className="ml-3 mt-1">
                    <p className="text-xs uppercase text-orange-700">
                      Mapping page
                    </p>
                    <ul className="ml-3 list-disc text-orange-900">
                      {onMapping.map((issue) => (
                        <li key={`${issue.path}-${issue.message}`}>
                          {issue.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Step 5 of the benchmarking flow: each tool's columns, traits and parameters, then submit. */
export function ConfigureStep({
  onNext,
  onPrevious,
  toolsData,
}: ConfigureStepProps) {
  const jobId = useBenchmarkingStore((state) => state.jobId)
  const syncJobTools = useBenchmarkingStore((state) => state.syncJobTools)
  const updateToolDraft = useBenchmarkingStore((state) => state.updateToolDraft)
  const setJobEvaluationType = useBenchmarkingStore(
    (state) => state.setJobEvaluationType
  )
  const job = useJobDraft(jobId)
  const { structure } = useDatasetStructure(jobId)
  const [activeTool, setActiveTool] = useState("")
  const [navs, setNavs] = useState<Partial<Record<ToolId, FormNav>>>({})
  const [submitting, setSubmitting] = useState(false)

  const selectionKey = (toolsData?.selectedTools ?? []).join(",")
  useEffect(() => {
    if (jobId && selectionKey) syncJobTools(jobId, selectionKey.split(","))
  }, [jobId, selectionKey, syncJobTools])

  // Keep each run's scored trait one of the target's ticked traits, on every tool.
  useEffect(() => {
    if (!jobId || !job) return
    for (const draft of job.tools) {
      const definition = getToolDefinition(draft.tool)
      if (withScoredTraits(definition, draft) !== draft)
        updateToolDraft(jobId, draft.tool, (current) =>
          withScoredTraits(definition, current)
        )
    }
  }, [job, jobId, updateToolDraft])

  const built = useMemo(() => (job ? buildJobConfig(job) : null), [job])
  const issues = built?.issues ?? []
  const tools: ToolId[] =
    job?.tools.map((draft) => draft.tool) ??
    (selectionKey ? selectionKey.split(",").filter(isToolId) : [])
  const currentTool = tools.includes(activeTool as ToolId)
    ? (activeTool as ToolId)
    : tools[0]
  const navFor = (tool: ToolId) => navs[tool] ?? INITIAL_NAV
  const issuesFor = (tool: ToolId) =>
    issues.filter((issue) => issue.tool === tool)

  const jump = (issue: Issue) => {
    const location = locateIssue(issue)
    if (!location) return
    const nav = navFor(issue.tool)
    setActiveTool(issue.tool)
    setNavs((current) => ({
      ...current,
      [issue.tool]: {
        open: { ...nav.open, [location.section]: true },
        population: location.populationId ?? nav.population,
        run: location.kind ?? nav.run,
      },
    }))
    // Wait for the tab and section to open before scrolling.
    window.setTimeout(() => {
      const element = document.getElementById(fieldId(issue.tool, issue.path))
      element?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 150)
  }

  const submit = async () => {
    if (!jobId || !built) return
    if (built.issues.length > 0) {
      toast.error(
        built.issues
          .slice(0, 3)
          .map((issue) => issue.message)
          .join(". ")
      )
      return
    }
    setSubmitting(true)
    const body = { config: built.config }
    const json = { headers: { "Content-Type": "application/json" } }
    try {
      // The backend's own checks first; a refusal is shown and nothing is submitted.
      await benchmarkApi.post(getBenchmarkConfigCheckUrl(jobId), body, json)
      const response = await benchmarkApi.post(
        getBenchmarkConfigUrl(jobId),
        body,
        json
      )
      toast.success("Configuration submitted! Starting benchmarking...")
      // The backend warns only when its worker can't be reached yet; the job waits for it.
      if (response.data?.warning) {
        toast(
          "Your job is queued and will start as soon as the server is ready.",
          {
            icon: "⚠️",
            duration: 8000,
          }
        )
      }
      onNext({
        config: built.config,
        submitted: true,
        jobId,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("[Configure] Submit failed", {
        message: axios.isAxiosError(error) ? error.message : error,
        status: axios.isAxiosError(error) ? error.response?.status : undefined,
        data: axios.isAxiosError(error) ? error.response?.data : undefined,
      })
      toast.error(configRefusalMessage(error, TOOL_LABELS), { duration: 10000 })
    } finally {
      setSubmitting(false)
    }
  }

  if (tools.length === 0 || !jobId || !job) {
    return (
      <div className="space-y-6">
        <h3 className="mb-2 text-xl font-semibold">Tool Configuration</h3>
        <p className="text-muted-foreground">
          No tools selected. Please go back and select tools first.
        </p>
        {onPrevious && (
          <Button variant="outline" onClick={onPrevious}>
            Back
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xl font-semibold">Tool Configuration</h3>
        <p className="text-muted-foreground">
          Configure preprocessing settings and column mappings for each selected
          tool.
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <h4 className="font-medium">Evaluation Type</h4>
        <p className="text-sm text-muted-foreground">
          Applies to all selected tools. Trait selection is enabled only for the
          chosen evaluation type.
        </p>
        <div className="mt-3 flex flex-wrap gap-6">
          {EVALUATION_TYPES.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="global_evaluation_type"
                value={value}
                className="h-4 w-4"
                checked={job.evaluation_type === value}
                onChange={() => setJobEvaluationType(jobId, value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <Tabs
        value={currentTool}
        onValueChange={setActiveTool}
        className="w-full"
      >
        <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap border-b border-border bg-transparent p-0">
          {tools.map((tool) => {
            const count = issuesFor(tool).length
            return (
              <TabsTrigger
                key={tool}
                value={tool}
                className="group rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-semibold transition-all duration-200 hover:bg-muted/40 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                <span className="flex items-center gap-2">
                  {getToolDefinition(tool).label}
                  <Badge
                    variant="outline"
                    aria-label={count === 0 ? "Ready" : `${count} to fix`}
                    className="hidden border-orange-600 text-xs text-orange-600 group-data-[state=active]:border-white group-data-[state=active]:text-white sm:inline-flex"
                  >
                    {count === 0 ? "Ready" : count}
                  </Badge>
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {job.tools.map((draft) => (
          <TabsContent
            key={draft.tool}
            value={draft.tool}
            className="space-y-4"
          >
            <ToolForm
              jobId={jobId}
              definition={getToolDefinition(draft.tool)}
              draft={draft}
              evaluationType={job.evaluation_type}
              quirks={quirksFor(job)}
              structure={structure}
              issues={issuesFor(draft.tool)}
              nav={navFor(draft.tool)}
              onNavChange={(nav) =>
                setNavs((current) => ({ ...current, [draft.tool]: nav }))
              }
              update={(change) => updateToolDraft(jobId, draft.tool, change)}
            />
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-between">
        {onPrevious && (
          <Button variant="outline" onClick={onPrevious}>
            Back
          </Button>
        )}
        <Button
          onClick={() => void submit()}
          disabled={issues.length > 0 || submitting}
        >
          Next
        </Button>
      </div>

      {issues.length > 0 && <BlockedSummary issues={issues} onJump={jump} />}
    </div>
  )
}
