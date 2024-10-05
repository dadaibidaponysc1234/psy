"use client";

import React, { useMemo, useState } from "react";

import { TrendingUp } from "lucide-react";
import { Label, Pie, PieChart, Sector, XAxis } from "recharts";
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
import { useGetDisorder } from "@/hooks/use-get-disorder";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { getRandomColor } from "@/lib/utils";
import { PieSectorDataItem } from "recharts/types/polar/Pie";

const DisorderStudyCount: React.FC = () => {
  const { data: year, isLoading, isError } = useGetDisorder();
  const [activeDisorder, setActiveDisorder] = useState("");

  const chartData = useMemo(
    () =>
      year?.map((data) => ({
        disorder: data.disorder__disorder_name,
        study_count: data.study_count,
        fill: getRandomColor(),
      })) ?? [],
    [year]
  );

  const activeIndex = chartData.findIndex(
    (item) => item.disorder === activeDisorder
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
        <CardTitle>Disorder study-count</CardTitle>
        <CardDescription>Number of Publications </CardDescription>
        <Select value={activeDisorder} onValueChange={setActiveDisorder}>
          <SelectTrigger
            className="ml-auto w-fit h-7 flex justify-center items-center font-medium text-gray-700 hover:bg-gray-50 border px-4 py-1 rounded-sm"
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
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="study_count"
              nameKey="disorder" //  Change here to use 'genetic' as the name key
              innerRadius={60}
              strokeWidth={5}
              activeIndex={chartData.findIndex(
                (item) => item.disorder === activeDisorder
              )}
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
                          {chartData[activeIndex]?.study_count.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          {chartData[activeIndex]?.disorder}{" "}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Highlight <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter>
    </Card>
  );
};

export default DisorderStudyCount;
