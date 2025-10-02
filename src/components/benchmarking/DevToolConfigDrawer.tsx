"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type {
  EvaluationType,
  PrscsxProcessingPayload,
  PrscsxProcessingState,
  ToolPreProcessingConfig,
} from "@/components/benchmarking/tool-configuration/types"

interface DebugSnapshot {
  sanitized: Record<string, ToolPreProcessingConfig>
  sanitizedProcessing: Record<string, PrscsxProcessingPayload>
  requestBody: any
  validationErrors: string[]
}

interface DevToolConfigDrawerProps {
  open: boolean
  onClose: () => void
  jobId: string | null
  evaluationType: EvaluationType
  normalizedTools: string[]
  configs: Record<string, ToolPreProcessingConfig>
  processingConfigs: Record<string, PrscsxProcessingState>
  snapshot: DebugSnapshot
  onPrefillMinimal?: () => void
  onPrefillTransitional?: () => void
}

export function DevToolConfigDrawer({
  open,
  onClose,
  jobId,
  evaluationType,
  normalizedTools,
  configs,
  processingConfigs,
  snapshot,
  onPrefillMinimal,
  onPrefillTransitional,
}: DevToolConfigDrawerProps) {
  if (!open) return null

  const json = (obj: unknown) => JSON.stringify(obj, null, 2)

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/30"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="h-full w-full max-w-[40rem] overflow-y-auto border-l bg-background p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Debug: Tool Configuration</h3>
          <div className="flex items-center gap-2">
            {onPrefillMinimal && (
              <Button variant="outline" onClick={onPrefillMinimal}>
                Prefill Minimal
              </Button>
            )}
            {onPrefillTransitional && (
              <Button variant="outline" onClick={onPrefillTransitional}>
                Prefill Transitional
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <Card className="mb-4">
          <CardContent className="space-y-2 p-4 text-sm">
            <div>
              <span className="font-medium">Job ID:</span> {jobId || "—"}
            </div>
            <div>
              <span className="font-medium">Evaluation Type:</span>{" "}
              {evaluationType}
            </div>
            <div>
              <span className="font-medium">Selected Tools:</span>{" "}
              {normalizedTools.join(", ") || "—"}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="state" className="w-full">
          <TabsList className="mb-2 w-full justify-start">
            <TabsTrigger value="state">State</TabsTrigger>
            <TabsTrigger value="payload">Payload</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
          </TabsList>

          <TabsContent value="state">
            <Card>
              <CardContent className="p-0">
                <pre className="max-h-[40vh] overflow-auto p-4 text-xs">
                  {json({ configs, processingConfigs })}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payload">
            <Card>
              <CardContent className="p-0">
                <pre className="max-h-[40vh] overflow-auto p-4 text-xs">
                  {json({
                    sanitized: snapshot.sanitized,
                    sanitizedProcessing: snapshot.sanitizedProcessing,
                    requestBody: snapshot.requestBody,
                  })}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validation">
            <Card>
              <CardContent className="p-0">
                <pre className="max-h-[40vh] overflow-auto p-4 text-xs">
                  {json({ errors: snapshot.validationErrors })}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}