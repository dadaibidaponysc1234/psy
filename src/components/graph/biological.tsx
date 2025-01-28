"use client";

import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  Sector,
  SectorProps,
} from "recharts";
import html2canvas from "html2canvas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useGetBiological } from "@/hooks/use-get-biological";
import GraphSkeleton from "../skeletons/graph-skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import Search from "../Search";
import { CloudDownloadIcon } from "lucide-react";

// Define a fixed set of unique colors
const COLOR_RANGE = [
  "#FF1F5B",
  "#00CD6C",
  "#009ADE",
  "#AF58BA",
  "#FFC61E",
  "#F28522",
  "#A0B1BA",
  "#A6761D",
  "#E9002D",
  "#FFAA00",
  "#00B000",
];

// Function to get unique colors
const getColor = (() => {
  let index = 0; // Track the current color index
  return () => {
    const color = COLOR_RANGE[index];
    index = (index + 1) % COLOR_RANGE.length; // Cycle back to the start if the end is reached
    return color;
  };
})();

const BiologicalStudyCount: React.FC = () => {
  const { data: year, isLoading } = useGetBiological();
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const [clickedBiologicalModality, setClickedBiologicalModility] = useState<string | null>(null);

  // Generate chart data with unique colors
  const chartData = useMemo(() => {
    if (!year) return [];
    return year
      .map((data) => ({
        biological_modalities__modality_name: data.biological_modalities__modality_name,
        study_count: data.study_count,
        fill: getColor(),
      }))
      .filter((d) => d.biological_modalities__modality_name !== null);
  }, [year]);

  // Custom Label Renderer for Pie Slices
  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, index }: any) => {
    if (!chartData[index]) return null;

    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20; // Adjust the distance of the label
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
        {`${chartData[index].biological_modalities__modality_name} (${chartData[index].study_count})`}
      </text>
    );
  };

  // Function to download the chart with the legend
  const downloadGraph = async () => {
    const element = document.getElementById("chart-container");
    if (element) {
      try {
        const canvas = await html2canvas(element, {
          useCORS: true,
          backgroundColor: "#ffffff",
        });
        const link = document.createElement("a");
        link.download = "chart_with_labels.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (error) {
        console.error("Error capturing chart:", error);
      }
    }
  };

  if (isLoading) {
    return <GraphSkeleton pie={false} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Number of studies, by biological modality</CardTitle>
      </CardHeader>
      <CardContent>
        <div id="chart-container">
          <ChartContainer config={{}}>
            <PieChart>
              <Tooltip />
              <Pie
                data={chartData}
                dataKey="study_count"
                nameKey="biological_modalities__modality_name"
                cx="50%"
                cy="50%"
                innerRadius={100}
                outerRadius={220}
                label={renderCustomLabel}
                activeIndex={activeIndex}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
                onClick={(state) => setClickedBiologicalModility(state.name ?? null)}
                activeShape={(props: SectorProps) => (
                  <Sector
                    {...props}
                    outerRadius={(props.outerRadius ?? 0) + 10}
                    innerRadius={props.innerRadius ?? 0}
                  />
                )}
              />
            </PieChart>
          </ChartContainer>

          {/* Legend displayed below the chart */}
          <div className="flex flex-wrap gap-4 mt-4">
            {chartData.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm"
                style={{ color: item.fill }}
              >
                <span
                  className="block w-4 h-4 rounded-full"
                  style={{ backgroundColor: item.fill }}
                ></span>
                {item.biological_modalities__modality_name}
              </div>
            ))}
          </div>

          <div className="mt-5">
            <button
              className="mt-4 px-4 py-2 flex items-center justify-center rounded-md h-fit w-[180px] gap-2 border text-sm font-bold sm:mt-8"
              onClick={downloadGraph}
            >
              <CloudDownloadIcon strokeWidth={2.5} className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </CardContent>

      <Dialog
        open={!!clickedBiologicalModality}
        onOpenChange={(open) => !open && setClickedBiologicalModility(null)}
      >
        <DialogContent className="max-h-[80vh] max-w-[700px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Search Results for &quot;{clickedBiologicalModality}&quot;
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
