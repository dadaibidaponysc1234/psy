"use client";

import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  Sector,
  SectorProps,
  ResponsiveContainer,
} from "recharts";
import html2canvas from "html2canvas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetGenetics } from "@/hooks/use-get-genetics";
import GraphSkeleton from "../skeletons/graph-skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import Search from "../Search";
import { CloudDownloadIcon } from "lucide-react";

// Define a fixed set of unique colors
const COLOR_RANGE = [
  "#FF1F5B","#F28522", "#FFAA00",
  "#00CD6C", "#AF58BA","#A6761D", 
  "#009ADE", "#FFC61E","#A0B1BA",
  "#E9002D", "#00B000",
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

const GeneticsStudyCount: React.FC = () => {
  const { data: year, isLoading } = useGetGenetics();
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const [clickedGenetics, setClickedGenetics] = useState<string | null>(null);

  // Generate chart data with unique colors
  const chartData = useMemo(() => {
    if (!year) return [];
    return year
      .map((data) => ({
        genetic_source_materials__material_type: data.genetic_source_materials__material_type,
        study_count: data.study_count,
        fill: getColor(),
      }))
      .filter((d) => d.genetic_source_materials__material_type !== null);
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
        fontSize="10"
        fontWeight="bold"
      >
        {`${chartData[index].genetic_source_materials__material_type} (${chartData[index].study_count})`}
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
        <CardTitle>Number of studies, by DNA source</CardTitle>
      </CardHeader>
      <CardContent>
        <div id="chart-container">
          <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Tooltip />
            <Pie
              data={chartData}
              dataKey="study_count"
              nameKey="genetic_source_materials__material_type"
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="90%"
              label={renderCustomLabel}
              activeIndex={activeIndex}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
              onClick={(state) => setClickedGenetics(state.name ?? null)}
              activeShape={(props: SectorProps) => (
                <Sector
                  {...props}
                  outerRadius={(props.outerRadius ?? 0) + 10}
                  innerRadius={props.innerRadius ?? 0}
                />
              )}
            />
          </PieChart>
          </ResponsiveContainer>

          {/* Legend displayed below the chart */}
          <div className="flex flex-wrap gap-4 mt-4">
            {chartData.length > 0 ? (
              chartData.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: item.fill }}
                >
                  <span
                    className="block w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  ></span>
                  {item.genetic_source_materials__material_type}
                </div>
              ))
            ) : (
              <p>No data available for legend</p>
            )}
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
        open={!!clickedGenetics}
        onOpenChange={(open) => !open && setClickedGenetics(null)}
      >
        <DialogContent className="max-h-[80vh] max-w-[700px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Search Results for &quot;{clickedGenetics}&quot;
            </DialogTitle>
          </DialogHeader>
          <Search
            genetic_source_materials={clickedGenetics || ""}
            showFilters={false}
            showSearchBar={false}
            showVisualize={false}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default GeneticsStudyCount;
