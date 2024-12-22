"use client"

import React, { useMemo, useState } from "react"

import { TrendingUp } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  LabelList,
  Pie,
  PieChart,
  Sector,
  XAxis,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useGetDisorder } from "@/hooks/use-get-disorder"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"
import { getRandomColor } from "@/lib/utils"
import { PieSectorDataItem } from "recharts/types/polar/Pie"
import GraphSkeleton from "../skeletons/graph-skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import Search from "../Search"
import AbbreviationLegend from "../ui/abbreviation-legend"

const DisorderStudyCount: React.FC = () => {
  const { data: year, isLoading, isError } = useGetDisorder()
  const [activeDisorder, setActiveDisorder] = useState("")
  const [clickedDisorder, setClickedDisorder] = useState<string | null>(null)

  const chartData = useMemo(
    () =>
      year
        ?.map((data) => ({
          disorder: data.disorder__disorder_name,
          study_count: data.study_count,
          // fill: getRandomColor(),
        }))
        ?.filter((d) => d.disorder !== null) ?? [],
    [year]
  )

  const activeIndex = chartData.findIndex(
    (item) => item.disorder === activeDisorder
  )

  const chartConfig = {
    desktop: {
      label: "Desktop",
      color: "hsl(var(--chart-1))",
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disorder study-count</CardTitle>
        <CardDescription>Number of Publications </CardDescription>
        {/* <Select value={activeDisorder} onValueChange={setActiveDisorder}>
          <SelectTrigger
            className="sm:ml-auto !mt-4 w-fit h-7 flex justify-center items-center font-medium text-gray-700 hover:bg-gray-50 border px-4 py-1 rounded-sm"
            aria-label="Select a disorder"
          >
            <SelectValue placeholder="Select disorder" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {chartData?.map((disorder, index) => (
              <SelectItem
                key={index}
                value={disorder.disorder}
                className="rounded-lg [&_span]:flex"
              >
                <div className="w-48 flex items-center gap-2 text-xs">
                  <span
                    className="flex h-3 w-3 shrink-0 rounded-sm"
                    style={{
                      backgroundColor: disorder.fill,
                    }}
                  />
                  {disorder.disorder}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select> */}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex size-full items-center justify-center">
            <GraphSkeleton pie={false} />
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                top: 20,
              }}
              onClick={(state) => setClickedDisorder(state.activeLabel ?? null)}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="disorder"
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => (value ? value.slice(0, 3) : "-")}
                className="text-xs sm:text-sm"
                fontWeight={600}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="study_count" fill="var(--color-desktop)" radius={8}>
                <LabelList
                  position="top"
                  offset={12}
                  className="fill-foreground"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
        {chartData && chartData.length > 0 && (
          <AbbreviationLegend
            data={(chartData ?? []).map((val) => ({
              name: val.disorder,
            }))}
          />
        )}
      </CardContent>
      {/* <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Highlight <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter> */}
      <Dialog
        open={!!clickedDisorder}
        onOpenChange={(open) => !open && setClickedDisorder(null)}
      >
        <DialogContent className="max-h-dvh max-w-screen-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Search Results for &quot;{clickedDisorder}&quot;
            </DialogTitle>
          </DialogHeader>
          <Search
            disorder={clickedDisorder || ""}
            showFilters={false}
            showSearchBar={false}
            showVisualize={false}
          />
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default DisorderStudyCount
