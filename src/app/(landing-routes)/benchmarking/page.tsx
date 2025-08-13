"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Upload,
  Settings,
  FileText,
  BarChart3,
  FileText as FileTextIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Tooltip } from "@/components/ui/tooltip"
import { Toaster } from "react-hot-toast"
import { ToolSelection } from "@/components/benchmarking/tool-selection"
import { DatasetUpload } from "@/components/benchmarking/dataset-upload"
import { JobStatus } from "@/components/benchmarking/job-status"
import { Mapping } from "@/components/benchmarking/mapping"
import {
  useBenchmarkingStore,
  useActiveStep,
  useCompletedSteps,
  useStepData,
  useSidebarCollapsed,
  useJobId,
} from "@/stores/benchmarking-store"
import { useHydration } from "@/hooks/use-hydration"

const steps = [
  {
    id: "tools",
    title: "Select Tools",
    icon: Settings,
    description: "Choose benchmarking tools",
    shortDesc: "Tools",
  },
  {
    id: "datasets",
    title: "Upload Datasets",
    icon: Upload,
    description: "Upload data files",
    shortDesc: "Data",
  },
  {
    id: "populations",
    title: "Map Files",
    icon: FileText,
    description: "Map files to configuration fields",
    shortDesc: "Mapping",
  },
  {
    id: "configure",
    title: "Configure",
    icon: Settings,
    description: "Preprocessing settings",
    shortDesc: "Config",
  },
  {
    id: "results",
    title: "Results",
    icon: BarChart3,
    description: "View results & logs",
    shortDesc: "Results",
  },
]

function DynamicForm({
  onNext,
  onPrevious,
  data,
  toolsData,
}: {
  onNext: (data: any) => void
  onPrevious?: () => void
  data?: any
  toolsData?: any
}) {
  const [formData, setFormData] = useState(data || {})
  const selectedTools = toolsData?.selectedTools || []

  const getFormFields = () => {
    const fields: any[] = []
    fields.push({
      id: "maf_threshold",
      label: "Minor Allele Frequency Threshold",
      type: "slider",
      min: 0.001,
      max: 0.1,
      step: 0.001,
      default: 0.01,
      description: "Minimum MAF for variant inclusion",
    })
    fields.push({
      id: "missing_threshold",
      label: "Missing Data Threshold",
      type: "slider",
      min: 0.01,
      max: 0.2,
      step: 0.01,
      default: 0.05,
      description: "Maximum missing data rate per variant",
    })
    if (selectedTools.includes("plink"))
      fields.push({
        id: "plink_memory",
        label: "PLINK Memory Allocation (MB)",
        type: "number",
        default: 4000,
        description: "Memory allocation for PLINK operations",
      })
    if (selectedTools.includes("gcta"))
      fields.push({
        id: "gcta_grm_cutoff",
        label: "GCTA GRM Cutoff",
        type: "number",
        min: 0.025,
        max: 0.5,
        step: 0.025,
        default: 0.025,
        description: "Genetic relationship matrix cutoff",
      })
    if (selectedTools.includes("bolt"))
      fields.push({
        id: "bolt_num_threads",
        label: "BOLT-LMM Threads",
        type: "select",
        options: ["1", "2", "4", "8", "16"],
        default: "4",
        description: "Number of threads for BOLT-LMM",
      })
    return fields
  }

  const updateFormData = (fieldId: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [fieldId]: value }))
  }

  const renderField = (field: any) => {
    switch (field.type) {
      case "slider":
        return (
          <div key={field.id} className="mb-4">
            <Label>{field.label}</Label>
            <Slider
              min={field.min}
              max={field.max}
              step={field.step}
              defaultValue={[formData[field.id] ?? field.default]}
              onValueChange={([v]) => updateFormData(field.id, v)}
            />
            <div className="mt-1 text-xs text-muted-foreground">
              {field.description}
            </div>
          </div>
        )
      case "number":
        return (
          <div key={field.id} className="mb-4">
            <Label>{field.label}</Label>
            <Input
              type="number"
              value={formData[field.id] ?? field.default}
              onChange={(e) => updateFormData(field.id, Number(e.target.value))}
            />
            <div className="mt-1 text-xs text-muted-foreground">
              {field.description}
            </div>
          </div>
        )
      case "select":
        return (
          <div key={field.id} className="mb-4">
            <Label>{field.label}</Label>
            <Select
              value={formData[field.id] ?? field.default}
              onValueChange={(v) => updateFormData(field.id, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-1 text-xs text-muted-foreground">
              {field.description}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="mb-2 text-xl font-semibold">Configure Benchmarking</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onNext(formData)
        }}
      >
        {getFormFields().map(renderField)}
        <div className="mt-4 flex gap-2">
          {onPrevious && (
            <Button variant="secondary" onClick={onPrevious}>
              Back
            </Button>
          )}
          <Button type="submit">Next</Button>
        </div>
      </form>
    </div>
  )
}

function Results({
  onPrevious,
  allData,
}: {
  onPrevious?: () => void
  allData?: any
}) {
  // Placeholder for results step
  return (
    <div className="space-y-6">
      <h3 className="mb-2 text-xl font-semibold">Results</h3>
      <p className="text-muted-foreground">
        Benchmarking results and logs will be displayed here. (Coming soon)
      </p>
      {onPrevious && (
        <Button variant="secondary" onClick={onPrevious}>
          Back
        </Button>
      )}
    </div>
  )
}

const Sidebar = ({
  steps,
  isCollapsed,
  onToggleCollapse,
}: {
  steps: any[]
  isCollapsed: boolean
  onToggleCollapse: () => void
}) => {
  const { activeStep, setActiveStep, completedSteps, stepData } =
    useBenchmarkingStore()
  const jobId = useJobId()

  const handleStepClick = (stepId: string) => {
    setActiveStep(stepId)
  }

  const hasJob = stepData["tools"]?.jobId || jobId

  return (
    <aside
      className={`flex min-h-[500px] flex-col gap-4 rounded-lg border-r border-border bg-card p-4 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Collapse/Expand Button */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2">
          {steps.map((step, idx) => {
            const isActive = activeStep === step.id
            const isCompleted = completedSteps.includes(step.id)
            const isDisabled =
              idx > 0 && !completedSteps.includes(steps[idx - 1].id)

            if (isCollapsed) {
              const tooltipContent = isDisabled
                ? `${step.title} - Complete the previous step to unlock`
                : step.title

              return (
                <li key={step.id}>
                  <Tooltip content={tooltipContent}>
                    <button
                      className={`flex h-10 w-10 items-center justify-center rounded transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      } ${isCompleted ? "opacity-80" : ""} ${
                        isDisabled ? "cursor-not-allowed opacity-50" : ""
                      }`}
                      onClick={() => handleStepClick(step.id)}
                      disabled={isDisabled}
                    >
                      <step.icon className="h-5 w-5" />
                    </button>
                  </Tooltip>
                </li>
              )
            }

            const buttonContent = (
              <button
                className={`flex w-full items-center gap-3 rounded px-3 py-2 transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                } ${isCompleted ? "opacity-80" : ""} ${
                  isDisabled ? "cursor-not-allowed opacity-50" : ""
                }`}
                onClick={() => handleStepClick(step.id)}
                disabled={isDisabled}
              >
                <step.icon className="h-5 w-5" />
                <span className="font-medium">{step.shortDesc}</span>
                {isCompleted && (
                  <Badge variant="outline" className="ml-auto">
                    Done
                  </Badge>
                )}
              </button>
            )

            return (
              <li key={step.id}>
                {isDisabled ? (
                  <Tooltip
                    content={`${step.title} - Complete the previous step to unlock this section.`}
                  >
                    {buttonContent}
                  </Tooltip>
                ) : (
                  buttonContent
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Job Status Section */}
      {hasJob && (
        <>
          <div className="border-t border-border pt-4">
            {!isCollapsed && (
              <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Job Monitoring
              </div>
            )}
            {isCollapsed ? (
              <Tooltip content="Job Logs - Monitor upload progress and processing status">
                <button
                  className={`flex h-10 w-10 items-center justify-center rounded transition-colors ${
                    activeStep === "job-status"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => handleStepClick("job-status")}
                >
                  <FileTextIcon className="h-5 w-5" />
                </button>
              </Tooltip>
            ) : (
              <button
                className={`flex w-full items-center gap-3 rounded px-3 py-2 transition-colors ${
                  activeStep === "job-status"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => handleStepClick("job-status")}
              >
                <FileTextIcon className="h-5 w-5" />
                <span className="font-medium">Logs</span>
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  )
}

const BenchmarkingPage = () => {
  const isHydrated = useHydration()
  const {
    activeStep,
    setActiveStep,
    completedSteps,
    addCompletedStep,
    stepData,
    setStepData,
    isSidebarCollapsed,
    setSidebarCollapsed,
    resetWorkflow,
  } = useBenchmarkingStore()

  // Don't render until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center space-x-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!isSidebarCollapsed)
  }

  const handleStepComplete = (stepId: string, data: any) => {
    setStepData(stepId, data)
    addCompletedStep(stepId)

    // Auto-navigate to next step
    const currentIndex = steps.findIndex((s) => s.id === stepId)
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1].id
      setActiveStep(nextStep)
    }
  }

  const handleBack = () => {
    const currentIndex = steps.findIndex((s) => s.id === activeStep)
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1].id
      setActiveStep(prevStep)
    }
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case "tools":
        return (
          <ToolSelection
            onNext={(data) => handleStepComplete("tools", data)}
            data={stepData["tools"]}
          />
        )
      case "datasets":
        return (
          <DatasetUpload
            onNext={(data) => handleStepComplete("datasets", data)}
            onPrevious={handleBack}
            data={stepData["datasets"]}
          />
        )
      case "job-status":
        return (
          <JobStatus
            onNext={(data) => handleStepComplete("job-status", data)}
            onPrevious={handleBack}
            data={stepData["job-status"]}
            onReset={resetWorkflow}
          />
        )
      case "populations":
        return (
          <Mapping
            onNext={(data) => handleStepComplete("populations", data)}
            onPrevious={handleBack}
            data={stepData["populations"]}
            toolsData={stepData["tools"]}
          />
        )
      case "configure":
        return (
          <DynamicForm
            onNext={(data) => handleStepComplete("configure", data)}
            onPrevious={handleBack}
            data={stepData["configure"]}
            toolsData={stepData["tools"]}
          />
        )
      case "results":
        return <Results onPrevious={handleBack} allData={stepData} />
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header section */}
      <div className="mx-auto mb-10 max-w-4xl text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
          Polygenic Risk Score (PRS) Benchmarking
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Comprehensive benchmarking tools and analysis for polygenic risk
          scores
        </p>
      </div>
      <div className="mx-auto flex max-w-7xl gap-8">
        <Sidebar
          steps={steps}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
        <main className="flex-1">{renderStepContent()}</main>
      </div>
      <Toaster />
    </div>
  )
}

export default BenchmarkingPage
