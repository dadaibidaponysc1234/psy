// "use client";

// import { TrendingUp } from "lucide-react";
// import { CartesianGrid, Legend, XAxis } from "recharts";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   ChartContainer,
//   ChartTooltip,
//   ChartTooltipContent,
// } from "@/components/ui/chart";
// import { Bar, BarChart, LabelList } from "recharts";
// import { useGetGenetics } from "@/hooks/use-get-genetics";
// import AbbreviationLegend from "../ui/abbreviation-legend";
// import GraphSkeleton from "../skeletons/graph-skeleton";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
// import { useState } from "react";
// import Search from "../Search";

// const GeneticsStudyCount: React.FC = () => {
//   const { data: year, isLoading, isError } = useGetGenetics();
//   const [activeGenetic, setActiveBiologicalModality] = useState("");
//   const [clickedGenetics, setClickedGenetics] = useState<string | null>(null);

//   const chartData =
//     year
//       ?.map((data) => ({
//         genetic_source_materials__material_type:
//           data.genetic_source_materials__material_type,
//         study_count: data.study_count,
//       }))
//       ?.filter((d) => d.genetic_source_materials__material_type !== null) ?? [];

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
//         {isLoading ? (
//           <GraphSkeleton />
//         ) : (
//           <ChartContainer config={chartConfig}>
//             <BarChart
//               accessibilityLayer
//               data={chartData}
//               margin={{
//                 top: 20,
//               }}
//               onClick={(state) => setClickedGenetics(state.activeLabel ?? null)}
//             >
//               <Legend
//                 verticalAlign="bottom"
//                 content={
//                   <AbbreviationLegend
//                     data={(chartData ?? []).map((val) => ({
//                       name: val.genetic_source_materials__material_type,
//                     }))}
//                   />
//                 }
//               />
//               <CartesianGrid vertical={false} />
//               <XAxis
//                 dataKey="genetic_source_materials__material_type"
//                 tickLine={false}
//                 tickMargin={10}
//                 axisLine={false}
//                 tickFormatter={(value) => (value ? value.slice(0, 3) : "-")}
//               />
//               <ChartTooltip
//                 cursor={false}
//                 content={<ChartTooltipContent hideLabel />}
//               />
//               <Bar dataKey="study_count" fill="var(--color-desktop)" radius={8}>
//                 <LabelList
//                   position="top"
//                   offset={12}
//                   className="fill-foreground"
//                   fontSize={12}
//                 />
//               </Bar>
//             </BarChart>
//           </ChartContainer>
//         )}
//       </CardContent>
//       <CardFooter className="flex-col items-start gap-2 text-sm">
//         <div className="flex gap-2 font-medium leading-none">
//           Highlight <TrendingUp className="h-4 w-4" />
//         </div>
//         <div className="leading-none text-muted-foreground">
//           Showing total visitors for the last 6 months
//         </div>
//       </CardFooter>
//       <Dialog
//         open={!!clickedGenetics}
//         onOpenChange={(open) => !open && setClickedGenetics(null)}
//       >
//         <DialogContent className="max-w-screen-md overflow-y-auto max-h-screen opacity-70 backdrop-blur-3xl">
//           <DialogHeader>
//             <DialogTitle>
//               Search Results for &quot;{clickedGenetics}&quot; genetic source
//             </DialogTitle>
//           </DialogHeader>
//           <Search
//             genetic_source_materials={clickedGenetics || ""}
//             showFilters={false}
//             showSearchBar={false}
//             showVisualize={false}
//           />
//         </DialogContent>
//       </Dialog>
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import Search from "../Search";
import { useMemo, useState } from "react";
import GraphSkeleton from "../skeletons/graph-skeleton";

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
    () =>
      year?.map((data) => ({
        genetic_source_materials__material_type:
          data.genetic_source_materials__material_type,
        study_count: data.study_count,
        fill: getRandomColor(),
      })) || [],
    [year]
  );

  const chartConfig = {
    desktop: {
      label: "Desktop",
      color: "hsl(var(--chart-1))",
    },
  };

  const [activeGenetic, setActiveGenetic] = useState("");
  const [clickedGenetics, setClickedGenetics] = useState<string | null>(null);

  const activeIndex = useMemo(
    () =>
      desktopData?.findIndex(
        (item) => item.genetic_source_materials__material_type === activeGenetic
      ),
    [activeGenetic, desktopData]
  );

  const genetics = useMemo(
    () =>
      desktopData?.map((item) => item.genetic_source_materials__material_type),
    [desktopData]
  );

  if (isError) return <div>Error loading data</div>;
  if (!desktopData.length && !isLoading) return <div>No data available</div>;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start space-y-0">
        <div className="grid gap-1">
          <CardTitle>Number of studies, by DNA source</CardTitle>
          {/* <CardDescription>Number of Publications</CardDescription> */}
        </div>
        <Select value={activeGenetic} onValueChange={setActiveGenetic}>
          <SelectTrigger
            className="ml-auto w-fit h-7 flex justify-center items-center font-medium text-gray-700 hover:bg-gray-50 border px-4 py-1 rounded-sm"
            aria-label="Select a genetic source"
          >
            <SelectValue placeholder="Select genetic source" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {genetics?.map((key) => (
              <SelectItem
                key={key}
                value={key}
                className="rounded-lg [&_span]:flex"
              >
                <div className="w-48 flex items-center gap-2 text-xs">
                  <span
                    className="flex h-3 w-3 shrink-0 rounded-sm"
                    style={{
                      backgroundColor: desktopData.find(
                        (item) =>
                          item.genetic_source_materials__material_type === key
                      )?.fill,
                    }}
                  />
                  {key}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-1 justify-center">
        {isLoading ? (
          <GraphSkeleton pie />
        ) : (
          <ChartContainer
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
                dataKey="study_count"
                nameKey="genetic_source_materials__material_type" // Change here to use 'genetic' as the name key
                innerRadius={60}
                strokeWidth={5}
                activeIndex={activeIndex}
                onClick={(state) => {
                  setClickedGenetics(state.genetic ?? null);
                }}
                activeShape={({
                  outerRadius = 0,
                  ...props
                }: PieSectorDataItem) => (
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
                            {desktopData[
                              activeIndex
                            ]?.study_count.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground"
                          >
                            {
                              desktopData[activeIndex]
                                ?.genetic_source_materials__material_type
                            }{" "}
                            {/* Display the genetic name */}
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
        )}
      </CardContent>
      <Dialog
        open={!!clickedGenetics}
        onOpenChange={(open) => !open && setClickedGenetics(null)}
      >
        <DialogContent className="max-w-screen-md overflow-y-auto max-h-screen">
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
}

export default GeneticsStudyCount;
