"use client";

import React, { useMemo, useState } from "react";

import { TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Label,
  Legend,
  Pie,
  PieChart,
  Sector,
  XAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, LabelList } from "recharts";
import { useGetDisorder } from "@/hooks/use-get-disorder";
import { useGetBiological } from "@/hooks/use-get-biological";
import AbbreviationLegend from "../ui/abbreviation-legend";
import GraphSkeleton from "../skeletons/graph-skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import Search from "../Search";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { getRandomColor } from "@/lib/utils";
import { PieSectorDataItem } from "recharts/types/polar/Pie";

const BiologicalStudyCount: React.FC = () => {
  const { data: year, isLoading, isError } = useGetBiological();
  const [activeBiologicalModality, setActiveBiologicalModality] = useState("");
  const [clickedBiologicalModality, setClickedBiologicalModility] = useState<
    string | null
  >(null);

  const chartData = useMemo(
    () =>
      year
        ?.map((data) => ({
          biological_modalities__modality_name:
            data.biological_modalities__modality_name,
          study_count: data.study_count,
          fill: getRandomColor(),
        }))
        ?.filter((d) => d.biological_modalities__modality_name !== null) ?? [],
    [year]
  );

  const activeIndex = chartData.findIndex(
    (item) =>
      item.biological_modalities__modality_name === activeBiologicalModality
  );

  const chartConfig = {
    desktop: {
      label: "Desktop",
      color: "hsl(var(--chart-1))",
    },
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Biological modality Study-count</CardTitle>
        <CardDescription>Number of Publications </CardDescription>
        <Select
          value={activeBiologicalModality}
          onValueChange={setActiveBiologicalModality}
        >
          <SelectTrigger
            className="ml-auto w-fit h-7 flex justify-center items-center font-medium text-gray-700 hover:bg-gray-50 border px-4 py-1 rounded-sm"
            aria-label="Select a biological modality"
          >
            <SelectValue placeholder="Select biological modality" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {chartData?.map((modality, index) => (
              <SelectItem
                key={index}
                value={modality.biological_modalities__modality_name}
                className="rounded-lg [&_span]:flex"
              >
                <div className="w-48 flex items-center gap-2 text-xs">
                  <span
                    className="flex h-3 w-3 shrink-0 rounded-sm"
                    style={{
                      backgroundColor: modality.fill,
                    }}
                  />
                  {modality.biological_modalities__modality_name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <GraphSkeleton pie />
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square w-full max-w-[300px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={chartData}
                dataKey={"study_count"}
                nameKey={"biological_modalities__modality_name"}
                innerRadius={60}
                strokeWidth={5}
                activeIndex={chartData.findIndex(
                  (item) =>
                    item.biological_modalities__modality_name ===
                    activeBiologicalModality
                )}
                onClick={(state) => {
                  setClickedBiologicalModility(
                    state.biological_modalities__modality_name ?? null
                  );
                }}
                activeShape={({
                  outerRadius = 0,
                  ...props
                }: PieSectorDataItem) => (
                  <g>
                    <Sector {...props} outerRadius={outerRadius + 10} />
                    <Sector
                      {...props}
                      outerRadius={outerRadius + 25}
                      innerRadius={outerRadius + 12}
                    />
                  </g>
                )}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          // className="text-lg font-medium"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {chartData[
                              activeIndex
                            ]?.study_count.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground"
                          >
                            {
                              chartData[activeIndex]
                                ?.biological_modalities__modality_name
                            }{" "}
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
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
        open={!!clickedBiologicalModality}
        onOpenChange={(open) => !open && setClickedBiologicalModility(null)}
      >
        <DialogContent className="max-w-screen-md overflow-y-auto max-h-screen">
          <DialogHeader>
            <DialogTitle>
              Search Results for &quot;{clickedBiologicalModality}&quot;
              biological modality
            </DialogTitle>
          </DialogHeader>
          <Search
            biological_modalities={clickedBiologicalModality || ""}
            showFilters={false}
            showSearchBar={false}
            showVisualize={false}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BiologicalStudyCount;
