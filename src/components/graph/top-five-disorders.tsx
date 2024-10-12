import { useQuery } from "@tanstack/react-query";
import axios from "axios";
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
  CartesianAxis,
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
  const { data, isLoading, error } = useQuery<RawDataType>({
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Five Disorders</CardTitle>
        <CardDescription>Number of Publications</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <GraphSkeleton />
        ) : (
          data && (
            <ChartContainer config={chartConfig}>
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <Legend verticalAlign="bottom" className="mt-10" />
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
          )
        )}
      </CardContent>
    </Card>
  );
};

export default TopFiveDisorders;
