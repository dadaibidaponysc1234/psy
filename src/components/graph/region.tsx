import React, { useEffect, useState } from "react";
import { TrendingUp, CloudDownloadIcon } from "lucide-react";
import {
  CartesianGrid,
  Bar,
  BarChart,
  LabelList,
  XAxis,
} from "recharts";
import html2canvas from "html2canvas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useGetRegion } from "@/hooks/use-get-region";
import AbbreviationLegend from "../ui/abbreviation-legend";
import GraphSkeleton from "../skeletons/graph-skeleton";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "../ui/dialog";
import Search from "../Search";

const RegionalStudyCount: React.FC = () => {
  const { data: year, isLoading } = useGetRegion();
  const [clickedRegion, setClickedRegion] = useState<string | null>(null);

  const chartData = year?.map((data) => ({
    countries__name: data.countries__name,
    study_count: data.study_count,
  }));

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

  // Function to download the chart and legend
  const downloadChart = async () => {
    const element = document.getElementById("chart-container");
    if (element) {
      const canvas = await html2canvas(element, { useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = "regional_study_chart.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Country Study-count</CardTitle>
        <CardDescription>Number of Publications</CardDescription>
      </CardHeader>
      <CardContent className="h-full w-full overflow-x-auto">
        <div id="chart-container">
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
                onClick={(state) => setClickedRegion(state.activeLabel ?? null)}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="countries__name"
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
                name: val.countries__name,
              }))}
            />
          )}
        </div>
        {/* Download Button */}
        <div className="mt-5">
          <button
            className="mt-4 px-4 py-2 flex items-center justify-center rounded-md h-fit w-[200px] gap-2 border text-sm font-bold sm:mt-8"
            onClick={downloadChart}
          >
            <CloudDownloadIcon strokeWidth={2.5} className="w-4 h-4" />
            <span>Download Chart</span>
          </button>
        </div>
      </CardContent>
      <Dialog
        open={!!clickedRegion}
        onOpenChange={(open) => !open && setClickedRegion(null)}
      >
        <DialogContent className="max-h-[80vh] max-w-[700px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Search Results for &quot;{clickedRegion}&quot;
            </DialogTitle>
          </DialogHeader>
          <Search
            research_regions={clickedRegion || ""}
            showFilters={false}
            showSearchBar={false}
            showVisualize={false}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default RegionalStudyCount;
