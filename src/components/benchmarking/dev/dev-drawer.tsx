"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "react-hot-toast"
import { Download, Pencil, Trash2, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  applyDump,
  isLoadable,
  makeDump,
  missingPaths,
  type DumpScope,
  type StoredDump,
} from "@/components/benchmarking/dev/dumps"
import { buildJobConfig } from "@/components/benchmarking/job-config"
import type { ToolId } from "@/components/benchmarking/job-config"
import { useDatasetStructure } from "@/components/benchmarking/mapping-step/use-dataset-structure"
import { getToolDefinition } from "@/components/benchmarking/tools"
import { useBenchmarkingStore, useJobDraft } from "@/stores/benchmarking-store"

const API = "/api/dev/benchmark-dumps"

async function call<T>(
  init: RequestInit & { query?: string } = {}
): Promise<T> {
  const response = await fetch(`${API}${init.query ?? ""}`, {
    ...init,
    headers: { "Content-Type": "application/json" },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok)
    throw Object.assign(new Error(body.detail ?? response.statusText), {
      status: response.status,
    })
  return body as T
}

const label = (tool: ToolId) => getToolDefinition(tool).label

function download(dump: StoredDump) {
  const { file: _file, ...content } = dump
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(content, null, 2)], { type: "application/json" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = dump.file.replace("/", "--")
  link.click()
  URL.revokeObjectURL(url)
}

function JsonBlock({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2)
  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="absolute right-2 top-2 h-7 text-xs"
        onClick={() => {
          void navigator.clipboard.writeText(text)
          toast.success("Copied")
        }}
      >
        Copy
      </Button>
      <pre className="max-h-[50vh] overflow-auto rounded-md border bg-muted/40 p-3 text-[11px] leading-4">
        {text}
      </pre>
    </div>
  )
}

/** Loads one dump into the current job: which tools, and how much of them. */
function LoadPanel({ dump, onDone }: { dump: StoredDump; onDone: () => void }) {
  const jobId = useBenchmarkingStore((state) => state.jobId)
  const job = useJobDraft(jobId)
  const { structure } = useDatasetStructure(jobId)
  const replaceJobDraft = useBenchmarkingStore((state) => state.replaceJobDraft)
  const setStepData = useBenchmarkingStore((state) => state.setStepData)
  const addCompletedStep = useBenchmarkingStore(
    (state) => state.addCompletedStep
  )
  const setActiveStep = useBenchmarkingStore((state) => state.setActiveStep)
  const toolsData = useBenchmarkingStore((state) => state.stepData.tools)

  const available = dump.job.tools.map((draft) => draft.tool)
  const [tools, setTools] = useState<ToolId[]>(available)
  const [scope, setScope] = useState<DumpScope>("all")
  const missing = structure ? missingPaths(dump, tools, structure) : null

  if (!jobId)
    return (
      <p className="text-xs text-muted-foreground">
        Create a job and upload or choose its dataset first.
      </p>
    )

  const load = () => {
    const next = applyDump(job, dump, tools, scope)
    replaceJobDraft(jobId, next)
    setStepData("tools", {
      ...(toolsData ?? {}),
      jobId,
      selectedTools: next.tools.map((draft) => draft.tool),
    })
    for (const step of ["tools", "datasets"]) addCompletedStep(step)
    if (scope === "all") addCompletedStep("populations")
    setActiveStep(scope === "all" ? "configure" : "populations")
    toast.success(`Loaded ${dump.name} (${tools.map(label).join(", ")})`)
    onDone()
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap gap-3">
        {available.map((tool) => (
          <label key={tool} className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={tools.includes(tool)}
              onCheckedChange={(checked) =>
                setTools((current) =>
                  checked
                    ? [...current, tool]
                    : current.filter((other) => other !== tool)
                )
              }
            />
            {label(tool)}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-xs">
        {(
          [
            ["all", "Mapping + Configure (then submit)"],
            ["mapping", "Mapping page only"],
          ] as [DumpScope, string][]
        ).map(([value, text]) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="radio"
              name={`scope-${dump.file}`}
              checked={scope === value}
              onChange={() => setScope(value)}
            />
            {text}
          </label>
        ))}
      </div>
      {missing === null ? (
        <p className="text-xs text-muted-foreground">
          Checking paths against the dataset…
        </p>
      ) : missing.length > 0 ? (
        <div className="text-xs text-orange-700">
          <p className="font-medium">Not in this job&apos;s dataset:</p>
          <ul className="ml-4 list-disc">
            {missing.map((path) => (
              <li key={path}>{path}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-green-700">
          Every path is in this job&apos;s dataset.
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" disabled={tools.length === 0} onClick={load}>
          Load
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function DumpsTab() {
  const jobId = useBenchmarkingStore((state) => state.jobId)
  const job = useJobDraft(jobId)
  const [dumps, setDumps] = useState<StoredDump[]>([])
  const [name, setName] = useState("")
  const [dataset, setDataset] = useState("")
  const [loading, setLoading] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setDumps((await call<{ dumps: StoredDump[] }>()).dumps)
    } catch (error) {
      toast.error(`Couldn't list dumps: ${(error as Error).message}`)
    }
  }, [])
  useEffect(() => {
    void refresh()
  }, [refresh])

  const datasets = useMemo(
    () =>
      dumps
        .map((dump) => dump.dataset)
        .filter((value, index, all) => all.indexOf(value) === index)
        .sort(),
    [dumps]
  )

  const save = async (overwrite = false) => {
    if (!job) return
    try {
      await call({
        method: "POST",
        body: JSON.stringify({ dump: makeDump(job, name, dataset), overwrite }),
      })
      toast.success(`Saved ${name}`)
      setName("")
      void refresh()
    } catch (error) {
      const status = (error as { status?: number }).status
      if (
        status === 409 &&
        window.confirm(`${(error as Error).message}. Replace it?`)
      )
        return save(true)
      if (status !== 409) toast.error((error as Error).message)
    }
  }

  const rename = async (dump: StoredDump) => {
    const nextName = window.prompt("Dump name", dump.name)
    if (nextName === null) return
    const nextDataset = window.prompt("Dataset", dump.dataset)
    if (nextDataset === null) return
    try {
      await call({
        method: "PATCH",
        body: JSON.stringify({
          file: dump.file,
          name: nextName,
          dataset: nextDataset,
        }),
      })
      void refresh()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const remove = async (dump: StoredDump) => {
    if (!window.confirm(`Delete ${dump.name} (${dump.dataset})?`)) return
    await call({
      method: "DELETE",
      query: `?file=${encodeURIComponent(dump.file)}`,
    })
    void refresh()
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">Save this job as a dump</p>
        {!job || job.tools.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nothing to save yet: pick tools and map their files first.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {job.tools.map((draft) => label(draft.tool)).join(", ")} ·{" "}
              {job.evaluation_type}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. all tools, chr22"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dataset</Label>
                <Input
                  list="dev-dump-datasets"
                  value={dataset}
                  onChange={(event) => setDataset(event.target.value)}
                  placeholder="e.g. perchrom-with-eas (upload)"
                />
                <datalist id="dev-dump-datasets">
                  {datasets.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </div>
            </div>
            <Button
              size="sm"
              disabled={!name.trim() || !dataset.trim()}
              onClick={() => void save()}
            >
              Save dump
            </Button>
          </>
        )}
      </section>

      {datasets.length === 0 && (
        <p className="text-xs text-muted-foreground">No dumps saved yet.</p>
      )}
      {datasets.map((group) => (
        <section key={group} className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {group}
          </p>
          {dumps
            .filter((dump) => dump.dataset === group)
            .map((dump) => (
              <div key={dump.file} className="space-y-2 rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{dump.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(dump.savedAt).toLocaleString()} ·{" "}
                      {dump.job.evaluation_type}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {dump.job.tools.map((draft) => (
                        <Badge
                          key={draft.tool}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {label(draft.tool)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      disabled={!isLoadable(dump)}
                      title={
                        isLoadable(dump)
                          ? undefined
                          : "Saved by an older version of the app"
                      }
                      onClick={() =>
                        setLoading(loading === dump.file ? null : dump.file)
                      }
                    >
                      Load…
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Rename"
                      onClick={() => void rename(dump)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Download"
                      onClick={() => download(dump)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete"
                      onClick={() => void remove(dump)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {loading === dump.file && (
                  <LoadPanel dump={dump} onDone={() => setLoading(null)} />
                )}
              </div>
            ))}
        </section>
      ))}
    </div>
  )
}

function InspectorTab() {
  const jobId = useBenchmarkingStore((state) => state.jobId)
  const activeStep = useBenchmarkingStore((state) => state.activeStep)
  const job = useJobDraft(jobId)
  const built = useMemo(() => (job ? buildJobConfig(job) : null), [job])

  if (!job || !built)
    return <p className="text-xs text-muted-foreground">No job drafts yet.</p>
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Job {jobId} · step {activeStep} · {job.evaluation_type}
      </p>
      <section className="space-y-1">
        <p className="text-sm font-medium">Issues ({built.issues.length})</p>
        {built.issues.length === 0 ? (
          <p className="text-xs text-green-700">
            None: this config can be submitted.
          </p>
        ) : (
          <ul className="ml-4 list-disc text-xs">
            {built.issues.map((issue) => (
              <li key={`${issue.tool}-${issue.path}-${issue.message}`}>
                <span className="font-medium">{label(issue.tool)}</span> (
                {issue.step}): {issue.message}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-1">
        <p className="text-sm font-medium">Config that submit would post</p>
        <JsonBlock value={{ config: built.config }} />
      </section>
      <section className="space-y-1">
        <p className="text-sm font-medium">Drafts</p>
        <JsonBlock value={job} />
      </section>
    </div>
  )
}

/** Development-only tools: save and load walkthroughs as dumps, and inspect the config. */
export function DevDrawer() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 left-4 z-40 shadow-md"
        onClick={() => setOpen(true)}
      >
        <Wrench className="mr-2 h-4 w-4" />
        Dev
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-xl"
        >
          <SheetHeader>
            <SheetTitle>Dev drawer</SheetTitle>
            <SheetDescription>
              Save a walkthrough as a dump, load it into another job, and see
              the config.
            </SheetDescription>
          </SheetHeader>
          <Tabs defaultValue="dumps" className="mt-4">
            <TabsList>
              <TabsTrigger value="dumps">Dumps</TabsTrigger>
              <TabsTrigger value="inspector">Inspector</TabsTrigger>
            </TabsList>
            <TabsContent value="dumps" className="pt-3">
              <DumpsTab />
            </TabsContent>
            <TabsContent value="inspector" className="pt-3">
              <InspectorTab />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  )
}
