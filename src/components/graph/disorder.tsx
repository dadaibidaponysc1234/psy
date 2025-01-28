"use client";

import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  Sector,
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  LabelList,
  SectorProps,
} from "recharts";
import html2canvas from "html2canvas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useGetDisorder } from "@/hooks/use-get-disorder";
import GraphSkeleton from "../skeletons/graph-skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import Search from "../Search";
import { CloudDownloadIcon } from "lucide-react";

// Define unique colors
const COLOR_RANGE = [
  "#FF1F5B", "#00CD6C", "#009ADE", "#AF58BA",
  "#FFC61E", "#F28522", "#A0B1BA", "#A6761D",
  "#E9002D", "#FFAA00", "#00B000",
];

// Function to get unique colors
const getColor = (() => {
  let index = 0;
  return () => {
    const color = COLOR_RANGE[index];
    index = (index + 1) % COLOR_RANGE.length;
    return color;
  };
})();

const DisorderStudyCount: React.FC = () => {
  const { data: year, isLoading } = useGetDisorder();
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const [clickedDisorder, setClickedDisorder] = useState<string | null>(null);
  const [showOtherModal, setShowOtherModal] = useState(false);

  const { processedData, otherData, otherLegend } = useMemo(() => {
    if (!year) return { processedData: [], otherData: [], otherLegend: [] };

    let otherCount = 0;
    const otherItems: any[] = [];
    const otherLegendItems: any[] = [];

    const filteredData = year
      .map((data) => {
        if (data.study_count <= 4) {
          otherCount += data.study_count;
          otherItems.push({
            disorder: `${data.disorder__disorder_name.slice(0, 8)}...`,
            fullName: data.disorder__disorder_name,
            study_count: data.study_count,
            fill: getColor(),
          });
          otherLegendItems.push({
            disorder: data.disorder__disorder_name,
            fill: otherItems[otherItems.length - 1].fill,
          });
          return null;
        }
        return {
          disorder: data.disorder__disorder_name,
          study_count: data.study_count,
          fill: getColor(),
        };
      })
      .filter(Boolean);

    if (otherCount > 0) {
      filteredData.push({
        disorder: "Other",
        study_count: otherCount,
        fill: "#808080",
      });
    }

    return { processedData: filteredData, otherData: otherItems, otherLegend: otherLegendItems };
  }, [year]);

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    outerRadius,
    index,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    outerRadius: number;
    index: number;
  }) => {
    if (!processedData[index]) return null;

    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="black"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${processedData[index].disorder} (${processedData[index].study_count})`}
      </text>
    );
  };

  const downloadGraph = async () => {
    const element = document.getElementById("chart-container");
    if (element) {
      const canvas = await html2canvas(element, { useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = "disorder_chart.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  const downloadBarChart = async () => {
    const element = document.getElementById("bar-chart-container");
    if (element) {
      const canvas = await html2canvas(element, { useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = "other_disorders_chart.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  if (isLoading) {
    return <GraphSkeleton pie={false} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disorder Study Count</CardTitle>
      </CardHeader>
      <CardContent>
        <div id="chart-container">
          <ChartContainer config={{}}>
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={processedData}
                dataKey="study_count"
                nameKey="disorder"
                cx="50%"
                cy="50%"
                innerRadius={100}
                outerRadius={220}
                label={renderCustomLabel}
                activeIndex={activeIndex}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)} // Set to undefined
                onClick={(state) => {
                  if (state.name === "Other") {
                    setShowOtherModal(true);
                  } else {
                    setClickedDisorder(state.name ?? null);
                  }
                }}
                activeShape={(props: SectorProps) => (
                  <Sector
                    {...props}
                    outerRadius={(props.outerRadius ?? 0) + 10}
                    innerRadius={props.innerRadius}
                  />
                )}
              />
            </PieChart>
          </ChartContainer>

          <button
            className="mt-4 px-4 py-2 flex items-center justify-center rounded-md h-fit w-[180px] gap-2 border text-sm font-bold sm:mt-8"
            onClick={downloadGraph}
          >
            <CloudDownloadIcon strokeWidth={2.5} className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>
      </CardContent>

      <Dialog open={showOtherModal} onOpenChange={setShowOtherModal}>
        <DialogContent className="max-h-[100vh] max-w-[800px] flex flex-col items-center">
          <DialogHeader>
            <DialogTitle>Breakdown of Other Disorders</DialogTitle>
          </DialogHeader>
          <div id="bar-chart-container">
            <BarChart
              width={600}
              height={350}
              data={otherData}
              onClick={(state) => {
                const selectedDisorder = otherData.find((d) => d.disorder === state.activeLabel);
                if (selectedDisorder) {
                  setClickedDisorder(selectedDisorder.fullName);
                }
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="disorder"
                tickMargin={10}
                axisLine={false}
                className="text-xs sm:text-sm"
                fontWeight={600}
              />
              <Bar dataKey="study_count" fill="#808080" radius={8}>
                <LabelList dataKey="study_count" position="top" />
              </Bar>
            </BarChart>

            {/* Color-coded legend for "Other" disorders */}
            <div className="flex flex-wrap gap-4 mt-4">
              {otherLegend.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <span className="block w-4 h-4 rounded-full" style={{ backgroundColor: item.fill }}></span>
                    {item.disorder}
          </div>
        ))}
      </div>
          </div>
          <button
            className="mt-4 px-4 py-2 flex items-center justify-center rounded-md h-fit w-[200px] gap-2 border text-sm font-bold"
            onClick={downloadBarChart}
          >
            <CloudDownloadIcon strokeWidth={2.5} className="w-4 h-4" />
            <span>Download Chart</span>
          </button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!clickedDisorder} onOpenChange={(open) => !open && setClickedDisorder(null)}>
        <DialogContent className="max-h-[80vh] max-w-[700px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Search Results for {clickedDisorder}</DialogTitle>
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
  );
};

export default DisorderStudyCount;
