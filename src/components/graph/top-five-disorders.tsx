import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import html2canvas from "html2canvas";
import { CloudDownloadIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import GraphSkeleton from "../skeletons/graph-skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  XAxis,
  YAxis,
} from "recharts";
import { getRandomColor } from "@/lib/utils";

type RawDataType = {
  [disorder: string]: {
    [year: string]: number;
  };
};

// Define the type for the transformed data
interface TransformedDataType {
  year: string;
  [disorder: string]: any;
}

const transformData = (data: RawDataType): TransformedDataType[] => {
  const years = new Set<string>();
  const disorders = Object.keys(data);

  // Collect all unique years from the dataset
  disorders.forEach((disorder) => {
    Object.keys(data[disorder]).forEach((year) => {
      years.add(year);
    });
  });

  // Create an array of objects where each object represents a year and its values for each disorder
  const result = Array.from(years)
    .sort()
    .map((year) => {
      const entry: { [disorder: string]: any; year: string } = { year }; // Start with the year

      disorders.forEach((disorder) => {
        // If the disorder has data for that year, use it; otherwise, set it to 0
        entry[disorder] = data[disorder][year] || 0;
      });

      return entry;
    });

  return result;
};

const TopFiveDisorders = () => {
  const { data, isLoading } = useQuery<RawDataType>({
    queryKey: ["top-five-disorders"],
    queryFn: async () => {
      const res = await axios.get(
        "https://algorithmxcomp.pythonanywhere.com/api/TopFive-Disorders/"
      );
      return res.data;
    },
  });

  const chartData = data ? transformData(data) : [];
  const disorderColorMap: Map<string, string> = new Map();

  const chartConfig = {
    desktop: {
      label: "Desktop",
      color: "hsl(var(--chart-1))",
    },
  };

  const getBarColor = (disorder: string): string => {
    // If the disorder already has a color, return it
    if (disorderColorMap.has(disorder)) {
      return disorderColorMap.get(disorder)!;
    }

    // Otherwise, generate a new random color and store it in the map
    const newColor = getRandomColor();
    disorderColorMap.set(disorder, newColor);
    return newColor;
  };

  // Function to download the chart
  const downloadChart = async () => {
    const element = document.getElementById("chart-container");
    if (element) {
      const canvas = await html2canvas(element, { useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = "top_five_disorders_chart.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Five Disorders</CardTitle>
        <CardDescription>Number of Publications</CardDescription>
      </CardHeader>
      <CardContent className="overflow-auto">
        {isLoading ? (
          <GraphSkeleton />
        ) : (
          data && (
            <div>
              {/* Chart and Container */}
              <div id="chart-container">
                <ChartContainer config={chartConfig} className="min-h-96">
                  <BarChart data={chartData} className="h-full w-full">
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="year"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <YAxis />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    {Object.keys(data).map((disorder) => (
                      <Bar
                        key={disorder}
                        dataKey={disorder}
                        stackId="a"
                        fill={getBarColor(disorder)}
                      />
                    ))}
                  </BarChart>
                </ChartContainer>
              </div>

              {/* Color Legend */}
              <div className="flex flex-wrap gap-4 mt-4">
                {Object.keys(data).map((disorder) => (
                  <div
                    key={disorder}
                    className="flex items-center gap-1 text-xs"
                  >
                    <span
                      className="block w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: getBarColor(disorder),
                      }}
                    ></span>
                    {disorder}
                  </div>
                ))}
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
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default TopFiveDisorders;
