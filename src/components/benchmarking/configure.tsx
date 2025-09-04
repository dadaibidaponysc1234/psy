"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
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

interface ConfigureProps {
  onNext: (data: any) => void
  onPrevious?: () => void
  data?: any
  toolsData?: any
}

export function Configure({
  onNext,
  onPrevious,
  data,
  toolsData,
}: ConfigureProps) {
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
