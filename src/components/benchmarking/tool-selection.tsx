"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"
import { getBenchmarkJobsUrl } from "@/lib/config"
import axios from "axios"
import { toast } from "react-hot-toast"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"
import { useJobId, useJobStatus } from "@/stores/benchmarking-store"

const toolOptions = [
  {
    id: "prsice",
    name: "PRSice",
    description:
      "Polygenic Risk Score software for calculating and evaluating polygenic risk scores",
    category: "PRS Tools",
    supported: true,
  },
  {
    id: "prscsx",
    name: "PRScsx",
    description:
      "Polygenic Risk Score software for cross-population polygenic prediction",
    category: "PRS Tools",
    supported: true,
  },
  {
    id: "bridgeprs",
    name: "BridgePRS",
    description:
      "Bridging polygenic risk scores across populations using transfer learning",
    category: "PRS Tools",
    supported: true,
  },
  {
    id: "sdprx",
    name: "SDPRX",
    description:
      "Supervised dimensionality reduction for polygenic risk prediction",
    category: "PRS Tools",
    supported: true,
  },
  {
    id: "xpass",
    name: "XPASS",
    description: "Cross-population PRS leveraging genetic correlation",
    category: "PRS Tools",
    supported: true,
  },
  {
    id: "xpass+",
    name: "XPASS+",
    description: "XPASS plus variant for cross-population PRS",
    category: "PRS Tools",
    supported: true,
  },
]

interface ToolSelectionProps {
  onNext: (data: any) => void
  data?: any
}

export function ToolSelection({ onNext, data }: ToolSelectionProps) {
  const [selectedTools, setSelectedTools] = useState<string[]>(
    data?.selectedTools || []
  )
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isCreatingJob, setIsCreatingJob] = useState(false)
  const { setJobId, setJobStatus } = useBenchmarkingStore()
  const jobId = useJobId()
  const jobStatus = useJobStatus()

  const groupedTools = toolOptions.reduce(
    (acc, tool) => {
      if (!acc[tool.category]) acc[tool.category] = []
      acc[tool.category].push(tool)
      return acc
    },
    {} as Record<string, typeof toolOptions>
  )

  const handleNext = () => {
    setShowConfirmation(true)
  }

  const handleConfirmJobCreation = async () => {
    setIsCreatingJob(true)
    try {
      // If a job already exists, extend tools within the same job instead of creating a new one
      if (jobId) {
        setShowConfirmation(false)
        onNext({ selectedTools, jobId, jobStatus })
        return
      }

      console.log("🚀 Creating benchmark job...")
      console.log("📋 Selected tools:", selectedTools)

      const response = await axios.post(getBenchmarkJobsUrl(), {
        tools: selectedTools,
      })

      console.log("📡 Job creation response:", response.data)

      const { job_id, status } = response.data

      if (job_id) {
        // Store the job ID in Zustand store
        setJobId(job_id)
        setJobStatus(status)
        console.log("💾 Job ID stored in Zustand:", job_id)

        toast.success(`Job created successfully! Job ID: ${job_id}`)

        // Close modal and proceed to next step
        setShowConfirmation(false)
        onNext({ selectedTools, jobId: job_id, jobStatus: status })
      } else {
        throw new Error("No job ID received from server")
      }
    } catch (error) {
      console.error("❌ Job creation failed:", error)
      if (axios.isAxiosError(error)) {
        console.error("  Response status:", error.response?.status)
        console.error("  Response data:", error.response?.data)
        toast.error(
          `Job creation failed: ${error.response?.data?.detail || error.message}`
        )
      } else {
        toast.error(
          `Job creation failed: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      }
    } finally {
      setIsCreatingJob(false)
    }
  }

  const hasExistingJob = Boolean(jobId)
  const modalTitle = hasExistingJob
    ? "Update Selected Tools"
    : "Create Benchmark Job"
  const modalDescription = hasExistingJob
    ? `You are updating the current benchmark job (${jobId}) to include the following tools: ${selectedTools.join(", ")}. Your uploads and mappings remain associated with this job.`
    : `You are about to create a new benchmark job with the following tools: ${selectedTools.join(", ")}. This will start the benchmarking process and you'll be able to upload your datasets next.`
  const confirmText = hasExistingJob ? "Continue" : "Create Job"

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xl font-semibold">
          Select Benchmarking Tools
        </h3>
        <p className="text-muted-foreground">
          Choose the tools you want to benchmark. You can select multiple tools
          from different categories.
        </p>
      </div>
      {Object.entries(groupedTools).map(([category, categoryTools]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {categoryTools.map((tool) => (
              <div key={tool.id} className="flex items-center gap-2">
                <Checkbox
                  checked={selectedTools.includes(tool.id)}
                  onCheckedChange={() =>
                    tool.supported &&
                    setSelectedTools((prev) =>
                      prev.includes(tool.id)
                        ? prev.filter((id) => id !== tool.id)
                        : [...prev, tool.id]
                    )
                  }
                  id={tool.id}
                  disabled={!tool.supported}
                />
                <Label
                  htmlFor={tool.id}
                  className={`cursor-pointer ${!tool.supported ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tool.name}</span>
                    {!tool.supported && (
                      <Badge variant="outline" className="text-xs">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {tool.description}
                  </span>
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <Button
        className="mt-4"
        onClick={handleNext}
        disabled={selectedTools.length === 0}
      >
        Next
      </Button>

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmJobCreation}
        title={modalTitle}
        description={modalDescription}
        confirmText={confirmText}
        cancelText="Cancel"
        isLoading={isCreatingJob}
      />
    </div>
  )
}
