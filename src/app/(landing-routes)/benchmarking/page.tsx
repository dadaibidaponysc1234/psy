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
  Loader2,
  Home as HomeIcon,
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
  useIsUploading,
  useUploadProgress,
} from "@/stores/benchmarking-store"
import { useHydration } from "@/hooks/use-hydration"
import { ToolConfiguration } from "@/components/benchmarking/tool-configuration"
import { BenchmarkingResults } from "@/components/benchmarking/benchmarking-results"
import { AuthControls } from "@/components/benchmarking/auth-controls"
import { BenchmarkingHome } from "@/components/benchmarking/benchmarking-home"
import { DevTestingDrawer } from "@/components/benchmarking/dev-testing-drawer"

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
  const isUploading = useIsUploading()
  const uploadProgress = useUploadProgress()

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
          {/* Home link - always accessible, no "Done" badge */}
          {isCollapsed ? (
            <li>
              <Tooltip content="Home">
                <button
                  className={`flex h-10 w-10 items-center justify-center rounded transition-colors ${
                    activeStep === "home"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => handleStepClick("home")}
                >
                  <HomeIcon className="h-5 w-5" />
                </button>
              </Tooltip>
            </li>
          ) : (
            <li>
              <button
                className={`flex w-full items-center gap-3 rounded px-3 py-2 transition-colors ${
                  activeStep === "home"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => handleStepClick("home")}
              >
                <HomeIcon className="h-5 w-5" />
                <span className="font-medium">Home</span>
              </button>
            </li>
          )}
          
          {/* Separator */}
          <li className="my-2 border-t border-border" />
          
          {/* Workflow steps */}
          {steps.map((step, idx) => {
            const isActive = activeStep === step.id
            const isCompleted = completedSteps.includes(step.id)
            // First step (tools) is always enabled, others require previous step completion
            const isDisabled =
              idx > 0 && !completedSteps.includes(steps[idx - 1].id)

            // // Dev MODE: all steps are enabled
            // const isDisabled = false

            if (isCollapsed) {
              const tooltipContent = isDisabled
                ? `${step.title} - Complete the previous step to unlock`
                : step.id === "datasets" && isUploading
                  ? `Upload in progress... ${uploadProgress}%`
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
                      {step.id === "datasets" && isUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <step.icon className="h-5 w-5" />
                      )}
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
                } ${step.id === "datasets" && isUploading ? "animate-pulse border border-blue-200 bg-blue-50" : ""}`}
                onClick={() => handleStepClick(step.id)}
                disabled={isDisabled}
              >
                {step.id === "datasets" && isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
                <span className="font-medium">{step.shortDesc}</span>
                {isCompleted && (
                  <Badge variant="outline" className="ml-auto">
                    Done
                  </Badge>
                )}
                {step.id === "datasets" && isUploading && (
                  <Badge
                    variant="outline"
                    className="ml-auto bg-blue-100 text-blue-800"
                  >
                    {uploadProgress}%
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

  const jobId = useJobId()

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
      case "home":
        return <BenchmarkingHome />
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
          <ToolConfiguration
            onNext={(data) => handleStepComplete("configure", data)}
            onPrevious={handleBack}
            data={stepData["configure"]}
            toolsData={stepData["tools"]}
            mappingData={stepData["populations"]}
          />
        )
      case "results":
        return <BenchmarkingResults jobId={jobId || ""} onBack={handleBack} />
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto overflow-x-hidden px-4 py-8">
      {/* Top-right auth controls (UI-only) */}
      <div className="mx-auto mb-4 flex max-w-7xl justify-end">
        <AuthControls isAuthenticated={false} />
      </div>
      <div className="mx-auto flex min-w-0 max-w-7xl gap-8 overflow-x-hidden" id="workflow">
        <Sidebar
          steps={steps}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden">
          {renderStepContent()}
        </main>
      </div>
      <Toaster />
      {process.env.NODE_ENV !== "production" && <DevTestingDrawer />}
    </div>
  )
}

export default BenchmarkingPage
