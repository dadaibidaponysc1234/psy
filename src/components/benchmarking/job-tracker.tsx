"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"
import { getBenchmarkUploadUrl } from "@/lib/config"
import axios from "axios"
import { toast } from "react-hot-toast"
import { RefreshCw, X, Trash2 } from "lucide-react"

interface JobTrackerProps {
  jobId: string
  onClear: () => void
  onReset?: () => void
  onStatusChange?: (status: string) => void
}

export function JobTracker({
  jobId,
  onClear,
  onReset,
  onStatusChange,
}: JobTrackerProps) {
  const [events, setEvents] = useState<
    Array<{ type: string; data: any; timestamp: Date }>
  >([])
  const [isConnected, setIsConnected] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<string>("")
  const [extractionProgress, setExtractionProgress] = useState<{
    current: number
    total: number
  } | null>(null)
  const [isCanceling, setIsCanceling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [eventSource, setEventSource] = useState<EventSource | null>(null)

  const cancelJob = async () => {
    setIsCanceling(true)
    try {
      const response = await axios.delete(
        `${getBenchmarkUploadUrl().replace("/upload", "")}/${jobId}`
      )
      console.log("🗑️ Job cancellation response:", response.data)
      toast.success("Job cancelled successfully")

      // Reset the entire benchmarking workflow
      if (onReset) {
        onReset()
      }

      onClear()
    } catch (error) {
      console.error("❌ Failed to cancel job:", error)
      toast.error("Failed to cancel job")
    } finally {
      setIsCanceling(false)
    }
  }

  const connectToSSE = () => {
    if (!jobId) return null

    // First, fetch current job status
    const fetchCurrentStatus = async () => {
      try {
        const response = await axios.get(
          `${getBenchmarkUploadUrl().replace("/upload", "")}/${jobId}`
        )
        if (response.data.status) {
          setCurrentStatus(response.data.status)
          localStorage.setItem("benchmark_job_status", response.data.status)
          setEvents((prev) => [
            ...prev,
            {
              type: "status",
              data: {
                status: response.data.status,
                message: `Current job status: ${response.data.status}`,
              },
              timestamp: new Date(),
            },
          ])
        }
      } catch (error) {
        console.error("Failed to fetch current job status:", error)
        setEvents((prev) => [
          ...prev,
          {
            type: "error",
            data: { message: "Failed to fetch current job status" },
            timestamp: new Date(),
          },
        ])
      }
    }

    // Fetch status before establishing SSE connection
    fetchCurrentStatus()

    const newEventSource = new EventSource(
      `${getBenchmarkUploadUrl().replace("/upload", "")}/${jobId}/events`
    )

    newEventSource.onopen = () => {
      setIsConnected(true)
      setIsReconnecting(false)
      setEvents((prev) => [
        ...prev,
        {
          type: "connected",
          data: { message: "Connected to job tracker" },
          timestamp: new Date(),
        },
      ])
    }

    newEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const eventType = event.type || "message"

        setEvents((prev) => [
          ...prev,
          {
            type: eventType,
            data,
            timestamp: new Date(),
          },
        ])

        // Handle specific event types
        if (eventType === "status") {
          setCurrentStatus(data.status)
          // Store job status in localStorage for safe clearing
          localStorage.setItem("benchmark_job_status", data.status)
          // Notify parent component of status change
          if (onStatusChange) {
            onStatusChange(data.status)
          }
        } else if (eventType === "extracting") {
          if (data.status === "start") {
            setExtractionProgress({ current: 0, total: data.total_files || 0 })
          } else if (data.status === "completed") {
            setExtractionProgress({
              current: data.total_files || 0,
              total: data.total_files || 0,
            })
          }
        }

        // Auto-clear job if completed or failed
        if (
          eventType === "status" &&
          (data.status === "completed" || data.status === "failed")
        ) {
          setTimeout(() => {
            toast.success(
              `Job ${data.status}! You can now proceed to the next step.`
            )
          }, 1000)
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error)
      }
    }

    newEventSource.onerror = (error) => {
      console.error("SSE connection error:", error)
      setIsConnected(false)
      setEvents((prev) => [
        ...prev,
        {
          type: "error",
          data: { message: "Connection lost" },
          timestamp: new Date(),
        },
      ])
    }

    return newEventSource
  }

  const handleRefreshConnection = () => {
    setIsReconnecting(true)
    setEvents((prev) => [
      ...prev,
      {
        type: "info",
        data: { message: "Attempting to reconnect..." },
        timestamp: new Date(),
      },
    ])

    // Close existing connection if any
    if (eventSource) {
      eventSource.close()
    }

    // Small delay to show the reconnecting message
    setTimeout(() => {
      const newEventSource = connectToSSE()
      if (newEventSource) {
        setEventSource(newEventSource)
      }
    }, 500)
  }

  useEffect(() => {
    if (!jobId) return

    const newEventSource = connectToSSE()
    if (newEventSource) {
      setEventSource(newEventSource)
    }

    return () => {
      if (newEventSource) {
        newEventSource.close()
      }
      setIsConnected(false)
    }
  }, [jobId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "uploaded":
        return "text-blue-600"
      case "configured":
        return "text-yellow-600"
      case "queued":
        return "text-orange-600"
      case "running":
        return "text-purple-600"
      case "completed":
        return "text-green-600"
      case "failed":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "uploaded":
        return "📤"
      case "running":
        return "🔄"
      case "completed":
        return "✅"
      case "failed":
        return "❌"
      default:
        return "📋"
    }
  }

  const getEventBadgeStyle = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case "connected":
        return "bg-green-100 text-green-800 border-green-200" // Green
      case "status":
        return "bg-blue-100 text-blue-800 border-blue-200" // Blue
      case "extracting":
        return "bg-gray-100 text-gray-800 border-gray-200" // Gray
      case "progress":
        return "bg-blue-100 text-blue-800 border-blue-200" // Blue
      case "keepalive":
        return "bg-gray-100 text-gray-800 border-gray-200" // Gray
      case "error":
        return "bg-red-100 text-red-800 border-red-200" // Red
      case "info":
        return "bg-blue-100 text-blue-800 border-blue-200" // Blue
      default:
        return "bg-gray-100 text-gray-800 border-gray-200" // Gray
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Job Status</CardTitle>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-sm text-muted-foreground">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowCancelModal(true)}
              disabled={isCanceling}
            >
              {isCanceling ? "Canceling..." : "Cancel Job"}
            </Button>
            <Button variant="outline" size="sm" onClick={onClear}>
              Clear Job
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshConnection}
              disabled={isReconnecting}
              title={isReconnecting ? "Reconnecting..." : "Refresh Connection"}
            >
              <RefreshCw
                className={`h-4 w-4 ${isReconnecting ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
        {currentStatus && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getStatusIcon(currentStatus)}</span>
            <span className={`font-medium ${getStatusColor(currentStatus)}`}>
              {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
            </span>
          </div>
        )}
        {extractionProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Extracting files...</span>
              <span>
                {extractionProgress.current}/{extractionProgress.total}
              </span>
            </div>
            <Progress
              value={
                (extractionProgress.current / extractionProgress.total) * 100
              }
              className="h-2"
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-96 space-y-2 overflow-y-auto">
          {events.map((event, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <span className="min-w-[60px] text-muted-foreground">
                {event.timestamp.toLocaleTimeString()}
              </span>
              <Badge className={getEventBadgeStyle(event.type)}>
                {event.type}
              </Badge>
              <span className="flex-1">
                {event.data.message || JSON.stringify(event.data)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>

      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={cancelJob}
        title="Cancel Job"
        description="Are you sure you want to cancel this job? This action cannot be undone and will reset the entire benchmarking workflow."
        confirmText="Cancel Job"
        cancelText="Keep Job"
      />
    </Card>
  )
}
