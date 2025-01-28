import React, { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import html2canvas from "html2canvas";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useGetYears } from "@/hooks/use-get-yearApi";
import GraphSkeleton from "../skeletons/graph-skeleton";
import { CloudDownloadIcon } from "lucide-react";

const YearlyStudyCount: React.FC = () => {
  const { data: year, isLoading } = useGetYears();

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

  // Download chart as image
  const downloadChart = async (chartId: string, fileName: string) => {
    const element = document.getElementById(chartId);
    if (element) {
      const canvas = await html2canvas(element, { useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `${fileName}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  if (isLoading) {
    return <GraphSkeleton pie={false} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Study Count Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Yearly Study-Count</CardTitle>
        </CardHeader>
        <CardContent>
          <div id="study-count-chart">
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
              </LineChart>
            </ChartContainer>
          </div>
          {/* Download Button */}
          <div className="flex justify-center">
            <button
              className="px-4 py-2 flex items-center justify-center rounded-md h-fit w-[200px] gap-2 border text-sm font-bold sm:mt-8"
              onClick={() => downloadChart("study-count-chart", "yearly_study_count")}
            >
              <CloudDownloadIcon strokeWidth={2.5} className="w-4 h-4" />
              <span>Download Chart</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Citation Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Yearly Citation</CardTitle>
        </CardHeader>
        <CardContent>
          <div id="citation-chart">
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
                />
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
              </LineChart>
            </ChartContainer>
          </div>
          {/* Download Button */}
          <div className="flex justify-center">
            <button
              className="px-4 py-2 flex items-center justify-center rounded-md h-fit w-[200px] gap-2 border text-sm font-bold sm:mt-8"
              onClick={() => downloadChart("citation-chart", "yearly_citation")}
            >
              <CloudDownloadIcon strokeWidth={2.5} className="w-4 h-4" />
              <span>Download Chart</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Impact Factor Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Yearly Impact Factor</CardTitle>
        </CardHeader>
        <CardContent>
          <div id="impact-factor-chart">
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
                />
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
              </LineChart>
            </ChartContainer>
          </div>
          {/* Download Button */}
          <div className="flex justify-center">
            <button
              className="px-4 py-2 flex items-center justify-center rounded-md h-fit w-[200px] gap-2 border text-sm font-bold sm:mt-8"
              onClick={() => downloadChart("impact-factor-chart", "yearly_impact_factor")}
            >
              <CloudDownloadIcon strokeWidth={2.5} className="w-4 h-4" />
              <span>Download Chart</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default YearlyStudyCount;
