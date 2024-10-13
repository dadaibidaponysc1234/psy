import React, { useEffect, useState } from "react";

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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
import { useGetYears } from "@/hooks/use-get-yearApi";
import GraphSkeleton from "../skeletons/graph-skeleton";
import { StudyCount } from "@/types/yearApi";

const YearlyStudyCount: React.FC = () => {
  const { data: year, isLoading, isError } = useGetYears();

  const chartData =
    year?.map((data) => ({
      year: data.year,
      study_count: data.study_count,
      impact_factor: data.impact_factor,
      citation: data.citation,
    })) ?? [];

  const chartConfig = {
    desktop: {
      label: "Desktop",
      color: "hsl(var(--chart-1))",
    },
    mobile: {
      label: "Desktop",
      color: "hsl(var(--chart-5))",
    },
  };

  const calculateTrendLine = (data: any[], dataKey: string) => {
    const n = data.length;
    const sumX = data.reduce((sum, d) => sum + d.year, 0);
    const sumY = data.reduce((sum, d) => sum + d[dataKey], 0);
    const sumXY = data.reduce((sum, d) => sum + d.year * d[dataKey], 0);
    const sumX2 = data.reduce((sum, d) => sum + d.year * d.year, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Attach trend line values to the original data
    return data.map((d) => ({
      year: d.year,
      trend: slope * d.year + intercept,
    }));
  };

  const studyCountTrendLine = calculateTrendLine(chartData, "study_count");
  const impactFactorTrendLine = calculateTrendLine(chartData, "impact_factor");
  const citationTrendLine = calculateTrendLine(chartData, "citation");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Yearly Study-Count</CardTitle>
          <CardDescription>Number of Publications </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <GraphSkeleton />
          ) : (
            <ChartContainer config={chartConfig}>
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 20, bottom: 10 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickMargin={8}
                  // fontSize={10}
                  // fontWeight={600}
                />
                <YAxis domain={["auto", "auto"]} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Line
                  dataKey="study_count"
                  type="linear"
                  stroke="var(--color-mobile)"
                  strokeWidth={2}
                  dot={true}
                />
                <Line
                  data={studyCountTrendLine}
                  dataKey="trend"
                  type="linear"
                  stroke="#FF6347"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="3 3"
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            Highlight <TrendingUp className="h-4 w-4" />
          </div>
          <div className="leading-none text-muted-foreground">
            The data on African genomics research reveals a clear upward trend
            from 2007, with a significant surge in publications starting around
            2014. This growth reflects increasing global interest and investment
            in the field, peaking at 14 publications in 2022. The consistent
            activity over the years highlights the growing importance and
            recognition of African genomics on the global research stage.
          </div>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Yearly Citation</CardTitle>
          <CardDescription>Number of Publications </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <GraphSkeleton />
          ) : (
            <ChartContainer config={chartConfig} className="h-full">
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 20, bottom: 10 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="year" axisLine={false} tickMargin={8} />
                <YAxis domain={["auto", "auto"]} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Line
                  dataKey="citation"
                  type="linear"
                  stroke="var(--color-desktop)"
                  strokeWidth={2}
                  dot={true}
                />
                <Line
                  data={citationTrendLine}
                  dataKey="trend"
                  type="linear"
                  stroke="#32CD32"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="3 3"
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            Highlight <TrendingUp className="h-4 w-4" />
          </div>
          <div className="leading-none text-muted-foreground">
            The data on African genomics research reveals a clear upward trend
            from 2007, with a significant surge in publications starting around
            2014. This growth reflects increasing global interest and investment
            in the field, peaking at 14 publications in 2022. The consistent
            activity over the years highlights the growing importance and
            recognition of African genomics on the global research stage.
          </div>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Yearly Impact factor</CardTitle>
          <CardDescription>Number of Publications </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <GraphSkeleton />
          ) : (
            <ChartContainer config={chartConfig} className="h-full">
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 20, bottom: 10 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="year" axisLine={false} tickMargin={8} />
                <YAxis domain={["auto", "auto"]} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Line
                  dataKey="impact_factor"
                  type="linear"
                  stroke="var(--color-desktop)"
                  strokeWidth={2}
                  dot={true}
                />
                <Line
                  data={impactFactorTrendLine}
                  dataKey="trend"
                  type="linear"
                  stroke="#32CD32"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="3 3"
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            Highlight <TrendingUp className="h-4 w-4" />
          </div>
          <div className="leading-none text-muted-foreground">
            The data on African genomics research reveals a clear upward trend
            from 2007, with a significant surge in publications starting around
            2014. This growth reflects increasing global interest and investment
            in the field, peaking at 14 publications in 2022. The consistent
            activity over the years highlights the growing importance and
            recognition of African genomics on the global research stage.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default YearlyStudyCount;
