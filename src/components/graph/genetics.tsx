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
//         <DialogContent className="max-w-screen-md overflow-y-auto max-h-dvh opacity-70 backdrop-blur-3xl">
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

"use client"

import * as React from "react"
import {
  XAxis,
  BarChart,
  CartesianGrid,
  Label,
  Legend,
  Pie,
  PieChart,
  Sector,
  Bar,
  LabelList,
} from "recharts"
import { PieSectorDataItem } from "recharts/types/polar/Pie"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useGetGenetics } from "@/hooks/use-get-genetics"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import Search from "../Search"
import { useMemo, useState } from "react"
import GraphSkeleton from "../skeletons/graph-skeleton"
import AbbreviationLegend from "../ui/abbreviation-legend"
import { getRandomColor } from "@/lib/utils"

export const description = "An interactive pie chart"

export function GeneticsStudyCount() {
  const { data: year, isLoading, isError } = useGetGenetics()

  // Map genetics data and generate unique colors
  const desktopData = React.useMemo(
    () =>
      year?.map((data) => ({
        genetic_source_materials__material_type:
          data.genetic_source_materials__material_type,
        study_count: data.study_count,
        // fill: getRandomColor(),
      })) || [],
    [year]
  )

  const chartConfig = {
    desktop: {
      label: "Desktop",
      color: "hsl(var(--chart-1))",
    },
  }

  const [activeGenetic, setActiveGenetic] = useState("")
  const [clickedGenetics, setClickedGenetics] = useState<string | null>(null)

  const activeIndex = useMemo(
    () =>
      desktopData?.findIndex(
        (item) => item.genetic_source_materials__material_type === activeGenetic
      ),
    [activeGenetic, desktopData]
  )

  const genetics = useMemo(
    () =>
      desktopData?.map((item) => item.genetic_source_materials__material_type),
    [desktopData]
  )

  if (isError) return <div>Error loading data</div>
  if (!desktopData.length && !isLoading) return <div>No data available</div>

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Number of studies, by DNA source</CardTitle>
        {/* <CardDescription>Number of Publications</CardDescription> */}

        {/* <Select value={activeGenetic} onValueChange={setActiveGenetic}>
          <SelectTrigger
            className="!mt-4 flex h-7 w-fit items-center justify-center rounded-sm border px-4 py-1 font-medium text-gray-700 hover:bg-gray-50 sm:ml-auto"
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
                <div className="flex w-48 items-center gap-2 text-xs">
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
        </Select> */}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <GraphSkeleton pie={false} />
        ) : (
          <ChartContainer config={chartConfig} className="w-full">
            <BarChart
              accessibilityLayer
              data={desktopData}
              margin={{
                top: 20,
              }}
              onClick={(state) => setClickedGenetics(state.activeLabel ?? null)}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="genetic_source_materials__material_type"
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
        {desktopData && desktopData.length > 0 && (
          <AbbreviationLegend
            data={(desktopData ?? []).map((val) => ({
              name: val.genetic_source_materials__material_type,
            }))}
          />
        )}
      </CardContent>
      <Dialog
        open={!!clickedGenetics}
        onOpenChange={(open) => !open && setClickedGenetics(null)}
      >
        <DialogContent className="max-h-dvh max-w-screen-md overflow-y-auto">
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
  )
}

export default GeneticsStudyCount
