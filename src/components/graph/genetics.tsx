// "use client";

// import React, { useEffect, useState } from "react";

// import { TrendingUp } from "lucide-react";
// import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   ChartConfig,
//   ChartContainer,
//   ChartTooltip,
//   ChartTooltipContent,
// } from "@/components/ui/chart";
// import { Bar, BarChart, LabelList } from "recharts";
// import { useGetDisorder } from "@/hooks/use-get-disorder";
// import { useGetBiological } from "@/hooks/use-get-biological";
// import { useGetGenetics } from "@/hooks/use-get-genetics";

// const GeneticsStudyCount: React.FC = () => {
//   const { data: year, isLoading, isError } = useGetGenetics();

//   const chartData = year?.map((data) => ({
//     disorder: data.source,
//     study_count: data.study_count,
//   }));

//   const chartConfig = {
//     desktop: {
//       label: "Desktop",
//       color: "hsl(var(--chart-1))",
//     },
//   };
//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>Genetic Source Study-Count</CardTitle>
//         <CardDescription>Number of Publications </CardDescription>
//       </CardHeader>
//       <CardContent>
//         <ChartContainer config={chartConfig}>
//           <BarChart
//             accessibilityLayer
//             data={chartData}
//             margin={{
//               top: 20,
//             }}
//           >
//             <CartesianGrid vertical={false} />
//             <XAxis
//               dataKey="disorder"
//               tickLine={false}
//               tickMargin={10}
//               axisLine={false}
//               tickFormatter={(value) => value.slice(0, 3)}
//             />
//             <ChartTooltip
//               cursor={false}
//               content={<ChartTooltipContent hideLabel />}
//             />
//             <Bar dataKey="study_count" fill="var(--color-desktop)" radius={8}>
//               <LabelList
//                 position="top"
//                 offset={12}
//                 className="fill-foreground"
//                 fontSize={12}
//               />
//             </Bar>
//           </BarChart>
//         </ChartContainer>
//       </CardContent>
//       <CardFooter className="flex-col items-start gap-2 text-sm">
//         <div className="flex gap-2 font-medium leading-none">
//           Highlight <TrendingUp className="h-4 w-4" />
//         </div>
//         <div className="leading-none text-muted-foreground">
//           Showing total visitors for the last 6 months
//         </div>
//       </CardFooter>
//     </Card>
//   );
// };

// export default GeneticsStudyCount;















"use client";

import * as React from "react";
import { Label, Pie, PieChart, Sector } from "recharts";
import { PieSectorDataItem } from "recharts/types/polar/Pie";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetGenetics } from "@/hooks/use-get-genetics";

export const description = "An interactive pie chart";

const getRandomColor = (): string => {
  const hue = Math.floor(Math.random() * 360);
  const saturation = Math.floor(Math.random() * 100) + 1;
  const lightness = Math.floor(Math.random() * 100) + 1;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export function GeneticsStudyCount() {
  const { data: year, isLoading, isError } = useGetGenetics();
  
  // Map genetics data and generate unique colors
  const desktopData = React.useMemo(
    () => year?.map((data) => ({
      genetic: data.genetic_source_materials__material_type,
      desktop: data.study_count,
      fill: getRandomColor(),
    })) || [],
    [year]
  );

  const chartConfig = {
    visitors: { label: "Genetic" },
  } satisfies ChartConfig;

  const id = "pie-interactive";
  const [activeGenetic, setActiveGenetic] = React.useState(desktopData?.[0]?.genetic);

  const activeIndex = React.useMemo(
    () => desktopData?.findIndex((item) => item.genetic === activeGenetic),
    [activeGenetic, desktopData]  
  );

  const genetics = React.useMemo(() => desktopData?.map((item) => item.genetic), [desktopData]);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading data</div>;
  if (!desktopData.length) return <div>No data available</div>;

  return (
    <Card data-chart={id} className="flex flex-col">
      <ChartStyle id={id} config={chartConfig} />
      <CardHeader className="flex-row items-start space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle>Pie Chart - Interactive</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
        <Select value={activeGenetic} onValueChange={setActiveGenetic}>
          <SelectTrigger
            className="ml-auto w-fit h-7 flex justify-center items-center font-medium text-gray-700 hover:bg-gray-50 border px-4 py-1 rounded-sm"
            aria-label="Select a genetic source"
          >
            <SelectValue placeholder="Select genetic" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {genetics?.map((key) => (
              <SelectItem key={key} value={key} className="rounded-lg [&_span]:flex">
                <div className="w-48 flex items-center gap-2 text-xs">
                  <span
                    className="flex h-3 w-3 shrink-0 rounded-sm"
                    style={{
                      backgroundColor: desktopData.find(item => item.genetic === key)?.fill,
                    }}
                  />
                  {key}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-1 justify-center pb-0">
        <ChartContainer
          id={id}
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={desktopData}
              dataKey="desktop"
              nameKey="genetic" // Change here to use 'genetic' as the name key
              innerRadius={60}
              strokeWidth={5}
              activeIndex={activeIndex}
              activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
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
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {desktopData[activeIndex]?.desktop.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          {desktopData[activeIndex]?.genetic} {/* Display the genetic name */}
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default GeneticsStudyCount;
