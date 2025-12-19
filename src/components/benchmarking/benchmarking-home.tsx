"use client"

import React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"

export const BenchmarkingHome: React.FC = () => {
  const { setActiveStep } = useBenchmarkingStore()

  const handleStartBenchmarking = () => {
    setActiveStep("tools")
  }

  return (
    <div className="mx-auto mb-10 max-w-6xl">
      <Tabs defaultValue="home" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold"> Trances-PRS Benchmarking Framework</h1>
            <p className="text-lg text-muted-foreground">
              A unified, visual workflow to configure, run, and compare Polygenic Risk Score tools across populations.
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="home" className="space-y-8">
          {/* Hero section */}
          <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-background via-background to-primary/10">
            <div className="grid gap-6 p-8 md:grid-cols-2">
              <div className="flex flex-col justify-center">
                <h2 className="mb-3 text-2xl font-semibold">
                  Configure, execute, and compare PRS tools with clarity
                </h2>
                <p className="mb-6 text-muted-foreground">
                  Streamline dataset mapping, tool configuration, and evaluation in one place. Visual summaries and results help you interpret performance quickly.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleStartBenchmarking}>
                    Start Benchmarking
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="#about">Learn more</a>
                  </Button>
                </div>
              </div>
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/Unified-Metadata-Repo.jpg"
                  alt="PRS Benchmarking Overview"
                  className="h-full w-full rounded-lg object-cover"
                />
              </div>
            </div>
          </div>

          {/* Highlights */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline">Tools</Badge>
                  Population-aware benchmarking
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Configure multiple PRS tools side-by-side and review metrics like R2 and AUC across populations and datasets.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline">Mapping</Badge>
                  Unified dataset mapping
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Intuitive file and field mapping flows reduce setup friction and help standardize inputs for consistent results.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline">Results</Badge>
                  Visual summaries & downloads
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Explore plots, tables, and artifacts with quick actions to preview or export everything as a single archive.
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="about" className="space-y-8" id="about">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Framework Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc space-y-2 pl-5">
                  <li>Provide a standardized, transparent workflow for PRS benchmarking.</li>
                  <li>Support diverse populations and datasets through flexible mapping.</li>
                  <li>Enable clear visual comparisons of tool performance.</li>
                  <li>Promote reproducibility with structured outputs and exports.</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Authors & Affiliations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This framework is developed by the Psychegen Africa team and collaborators.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Lead Contributors: Add names here.</li>
                  <li>Affiliations: Add institutions and labs here.</li>
                  <li>Contact: Add contact or support details here.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              The benchmarking flow guides you through selecting tools, uploading datasets, mapping fields, configuring preprocessing, and reviewing results. Each step aims to reduce friction and provide a consistent, visual experience.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
