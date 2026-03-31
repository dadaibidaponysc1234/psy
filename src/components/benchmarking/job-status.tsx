"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { JobTracker } from "./job-tracker"
import { toast } from "react-hot-toast"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"
import { getBenchmarkJobStatusUrl } from "@/lib/config"

interface JobStatusProps {
  onNext: (data: any) => void
  onPrevious?: () => void
  data?: any
  onReset?: () => void
  reconnectSSE?: () => void
}

export function JobStatus({
  onNext,
  onPrevious,
  data,
  onReset,
  reconnectSSE,
}: JobStatusProps) {
  const [showClearModal, setShowClearModal] = useState(false)
  const { jobId, clearJob: clearJobFromStore } = useBenchmarkingStore()

  const handleClearJob = async () => {
    if (!jobId) return

    // Debug: Check what's happening
    console.log("🔍 Debug clearJob:", { jobId })

    // If job is not completed, cancel it first
    try {
      const response = await fetch(getBenchmarkJobStatusUrl(jobId), {
        method: "DELETE",
      })
      if (response.ok) {
        console.log("🗑️ Job cancelled before clearing")
      }
    } catch (error) {
      console.error("❌ Failed to cancel job:", error)
    }

    // Clear from Zustand store
    clearJobFromStore()

    // Reset the entire benchmarking workflow
    if (onReset) {
      onReset()
    }

    toast.success("Job cleared")
  }

  const showClearModalHandler = () => {
    setShowClearModal(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xl font-semibold">Logs</h3>
        <p className="text-muted-foreground">
          Monitor the status of your benchmarking jobs. You can track upload
          progress, file extraction, and overall job status in real-time.
        </p>
      </div>

      {jobId ? (
        <JobTracker
          jobId={jobId}
          onClear={showClearModalHandler}
          onReset={onReset}
          reconnectSSE={reconnectSSE}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Active Job</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">
              No active job found. Jobs are created when you upload files in the
              previous step.
            </p>
          </CardContent>
        </Card>
      )}

      <ConfirmationModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleClearJob}
        title="Clear Job"
        description="Are you sure you want to clear this job? This will cancel the job on the server (if still running) and reset the entire benchmarking workflow."
        confirmText="Clear Job"
        cancelText="Keep Job"
      />
    </div>
  )
}
