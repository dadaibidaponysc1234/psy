"use client";

import React, { useEffect, useState } from "react";

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, XAxis } from "recharts";
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

const BiologicalStudyCount: React.FC = () => {
  const { data: year, isLoading, isError } = useGetBiological();
  const [clickedBiologicalModality, setClickedBiologicalModility] = useState<
    string | null
  >(null);

  const chartData = year?.map((data) => ({
    biological_modalities__modality_name:
      data.biological_modalities__modality_name,
    study_count: data.study_count,
  }));

  const chartConfig = {
    desktop: {
      label: "Desktop",
      color: "hsl(var(--chart-1))",
    },
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Biological modularity Study-count</CardTitle>
        <CardDescription>Number of Publications </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <GraphSkeleton />
        ) : (
          <ChartContainer config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                top: 20,
              }}
              onClick={(state) =>
                setClickedBiologicalModility(state.activeLabel ?? null)
              }
            >
              <Legend
                verticalAlign="bottom"
                content={
                  <AbbreviationLegend
                    data={(year ?? []).map((val) => ({
                      name: val.biological_modalities__modality_name,
                    }))}
                  />
                }
              />
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="biological_modalities__modality_name"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => (value ? value.slice(0, 3) : "-")}
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
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Highlight <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter>
      <Dialog
        open={!!clickedBiologicalModality}
        onOpenChange={(open) => !open && setClickedBiologicalModility(null)}
      >
        <DialogContent className="lg:max-w-screen-lg max-w-screen-md overflow-y-scroll max-h-screen">
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
