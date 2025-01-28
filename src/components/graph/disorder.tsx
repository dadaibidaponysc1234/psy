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
  "#E9002D", "#FFAA00", "#00B000"
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

const DisorderStudyCount: React.FC = () => {
  const { data: year, isLoading } = useGetDisorder();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [clickedDisorder, setClickedDisorder] = useState<string | null>(null);
  const [showOtherModal, setShowOtherModal] = useState(false);

  // Process chart data: group disorders with study_count ≤ 4 into "Other"
  const { processedData, otherData, otherLegend } = useMemo(() => {
    if (!year) return { processedData: [], otherData: [], otherLegend: [] };

    let otherCount = 0;
    let otherItems: any[] = [];
    let otherLegendItems: any[] = [];

    const filteredData = year
      .map((data) => {
        if (data.study_count <= 4) {
          otherCount += data.study_count; // Sum counts for "Other"
          otherItems.push({
            disorder: data.disorder__disorder_name.slice(0, 8) + "...", // Shortened name
            fullName: data.disorder__disorder_name, // Full name for legend & search
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
      .filter(Boolean); // Remove null values

    if (otherCount > 0) {
      filteredData.push({
        disorder: "Other",
        study_count: otherCount,
        fill: "#808080",
      });
    }

    return { processedData: filteredData, otherData: otherItems, otherLegend: otherLegendItems };
  }, [year]);

  // Custom Label Renderer for Pie Slices
  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20; // Adjust the label distance
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

  // Chart config
  const chartConfig = useMemo(() => {
    return year
      ? { desktop: { label: "Desktop", color: "hsl(var(--chart-1))" } }
      : {};
  }, [year]);

  // Download the chart
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
  
  {/* Function to download the bar chart */}
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
          <ChartContainer config={chartConfig || {}}>
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={processedData}
                dataKey="study_count"
                nameKey="disorder"
                cx="50%"
                cy="50%"
                innerRadius={6}
                outerRadius={220}
                label={renderCustomLabel} // Labels for pie slices
                activeIndex={activeIndex}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={(state) => {
                  if (state.name === "Other") {
                    setShowOtherModal(true); // Open modal for "Other"
                  } else {
                    setClickedDisorder(state.name ?? null); // Open search results for normal disorders
                  }
                }}
                activeShape={(props) => (
                  <Sector {...props} outerRadius={props.outerRadius + 10} innerRadius={props.innerRadius} />
                )}
              />
            </PieChart>
          </ChartContainer>

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

{/*<Dialog open={showOtherModal} onOpenChange={setShowOtherModal}>
  <DialogContent className="max-h-[100vh] max-w-[800px] flex flex-col items-center justify-center">
   
    <DialogHeader>
      <DialogTitle>Breakdown of "Other" Disorders</DialogTitle>
    </DialogHeader>

    <div className="flex flex-col items-center justify-center">
      <BarChart
        width={600} // Increased width
        height={350} // Increased height
        data={otherData}
        onClick={(state) => {
          const selectedDisorder = otherData.find((d) => d.disorder === state.activeLabel);
          if (selectedDisorder) {
            setClickedDisorder(selectedDisorder.fullName); // Use full name for search
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
        <Bar dataKey="study_count" radius={8} />
      </BarChart>

      
      <div className="flex flex-wrap gap-4 mt-4">
        {otherLegend.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span className="block w-4 h-4 rounded-full" style={{ backgroundColor: item.fill }}></span>
            {item.disorder}
          </div>
        ))}
      </div>
    </div>
  </DialogContent>
</Dialog>*/}

{/* Dialog for "Other" bar chart */}
<Dialog open={showOtherModal} onOpenChange={setShowOtherModal}>
  <DialogContent className="max-h-[100vh] max-w-[800px] flex flex-col items-center justify-center">
    <DialogHeader>
      <DialogTitle>Breakdown of Other Disorders</DialogTitle>
    </DialogHeader>

    <div id="bar-chart-container" className="flex flex-col items-center justify-center">
      <BarChart
        width={600} // Increased width
        height={350} // Increased height
        data={otherData}
        onClick={(state) => {
          const selectedDisorder = otherData.find((d) => d.disorder === state.activeLabel);
          if (selectedDisorder) {
            setClickedDisorder(selectedDisorder.fullName); // Use full name for search
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
        <Bar dataKey="study_count" radius={8} />
      </BarChart>

      {/* Color-coded legend for "Other" disorders */}
      <div className="flex flex-wrap gap-4 mt-4">
        {otherLegend.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span className="block w-4 h-4 rounded-full" style={{ backgroundColor: item.fill }}></span>
            {item.disorder}
          </div>
        ))}
      </div>
    </div>

    {/* Download Button */}
    <div className="">
      <button
        className="px-4 py-2 flex items-center justify-center rounded-md h-fit w-[200px] gap-2 border text-sm font-bold sm:mt-8"
        onClick={downloadBarChart}
      >
        <CloudDownloadIcon strokeWidth={2.5} className="w-4 h-4" />
        <span>Download</span>
      </button>
    </div>
  </DialogContent>
</Dialog>


      {/* Dialog for Search Functionality */}
      <Dialog open={!!clickedDisorder} onOpenChange={(open) => !open && setClickedDisorder(null)}>
        <DialogContent className="max-h-[80vh] max-w-[700px] overflow-y-auto"> {/* Adjusted height */}
          <DialogHeader>
            <DialogTitle>Search Results for {clickedDisorder}</DialogTitle>
          </DialogHeader>
          <Search disorder={clickedDisorder || ""} showFilters={false} showSearchBar={false} showVisualize={false} />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DisorderStudyCount;
