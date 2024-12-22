"use client"

import FilterButton from "@/components/filterBtn"
import StudySkeleton from "@/components/skeletons/study-skeleton"
import StudyList from "@/components/studies/StudyList"
import { DocumentState } from "@/lib/validators/document-validator"
import {
  ChevronDown,
  ChevronUp,
  CloudDownloadIcon,
  Filter,
  Search as SearchIcon,
  TrendingUp,
} from "lucide-react"
import React, { useMemo, useRef, useState } from "react"
import { useGetSearchResult } from "@/hooks/use-get-searchResults"
import { Input } from "@/components/ui/input"
import useDebounce from "@/hooks/useDebounce"
import NotFound from "@/components/NotFound"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import PaginationControls from "@/components/PaginationControls"
import AdvancedSearch from "@/components/AdvancedSearch"
import { useGetSuggestion } from "@/hooks/use-get-suggestion"
import { useOnClickOutside } from "@/hooks/use-on-click-outside"
import { Button } from "@/components/ui/button"
import { useQuery } from "@tanstack/react-query"
import { BASE_URL } from "@/static"
import GraphSkeleton from "@/components/skeletons/graph-skeleton"
import {
  CardTitle,
  CardDescription,
  CardContent,
  CardHeader,
  Card,
  CardFooter,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  CartesianGrid,
  XAxis,
  Line,
  LineChart,
  Bar,
  LabelList,
  BarChart,
  Legend,
  PieChart,
  Pie,
  Sector,
  Label,
  YAxis,
} from "recharts"
import axios from "axios"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { StudyCount } from "@/types/yearApi"
import { Region } from "@/types/regionData"
import AbbreviationLegend from "./ui/abbreviation-legend"
import { Disorder } from "@/types/disorderData"
import { getRandomColor } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { PieSectorDataItem } from "recharts/types/polar/Pie"
import { BiologicalRecord } from "@/types/biological"
import { Genetics } from "@/types/genetic"
import Chord from "./graph/chord"

const Search = ({
  title = "",
  research_regions = "",
  journal_name = "",
  keyword = "",
  article_type = "",
  year = "",
  year_min = "",
  year_max = "",
  disorder = "",
  impact_factor_min = "",
  impact_factor_max = "",
  genetic_source_materials = "",
  biological_modalities = "",
  page = "1",
  showSearchBar = true,
  showFilters = true,
  showVisualize = true,
}: DocumentState & {
  showSearchBar?: boolean
  showFilters?: boolean
  showVisualize?: boolean
}) => {
  const defaultFilter = {
    title,
    research_regions,
    journal_name,
    keyword,
    article_type,
    year,
    year_min,
    year_max,
    disorder,
    impact_factor_min,
    impact_factor_max,
    genetic_source_materials,
    biological_modalities,
    page,
  }
  const [filter, setFilter] = useState<DocumentState>(defaultFilter)
  const [isAdvanceFilterOpen, setIsAdvanceFilterOpen] = useState(false)
  const [isGraphOpen, setIsGraphOpen] = useState(false)
  const [clearFilters, setClearFilters] = useState(false)
  const debouncedSearchTerm = useDebounce(filter?.title ?? "", 700)

  const sanitizedFilters = {
    title: debouncedSearchTerm || undefined,
    journal_name: filter.journal_name || undefined,
    keyword: filter.keyword || undefined,
    impact_factor_min: filter.impact_factor_min || undefined,
    impact_factor_max: filter.impact_factor_max || undefined,
    year: filter.year || undefined,
    year_min: filter.year_min || undefined,
    year_max: filter.year_max || undefined,
    research_regions: filter.research_regions || undefined,
    disorder: filter.disorder || undefined,
    article_type: filter.article_type || undefined,
    biological_modalities: filter.biological_modalities || undefined,
    genetic_source_materials: filter.genetic_source_materials || undefined,
    page: filter.page || "1",
  }

  const {
    data: searches,
    isLoading,
    isError,
  } = useGetSearchResult(sanitizedFilters)

  const { data: suggestion } = useGetSuggestion(debouncedSearchTerm ?? "")

  const { data: geneticSources, isLoading: isGeneticSourcesLoading } = useQuery(
    {
      queryKey: ["search-genetic-sources"],
      queryFn: async () => {
        const response = await axios.get(`${BASE_URL}/genetic-source-materials`)
        return response.data
      },
      refetchOnMount: false,
    }
  )

  const { data: disorders, isLoading: isDisorderLoading } = useQuery({
    queryKey: ["search-disorders"],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/disorders`)
      return response.data
    },
    refetchOnMount: false,
  })

  const { data: articleTypes, isLoading: isArticleTypesLoading } = useQuery({
    queryKey: ["search-article-types"],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/article-types`)
      return response.data
    },
    refetchOnMount: false,
  })

  const nextPage = () =>
    setFilter((prev) => ({ ...prev, page: `${(Number(prev.page) || 1) + 1}` }))

  const prevPage = () =>
    setFilter((prev) => ({
      ...prev,
      page: `${Math.max((Number(prev.page) || 1) - 1, 1)}`,
    }))

  const applyStringFilter = ({
    category,
    value,
  }: {
    category: keyof typeof filter
    value: string
  }) => {
    setFilter((prev) => ({
      ...prev,
      [category]: prev[category] === value ? "" : value,
    }))
  }

  const handleClearFilters = () => {
    setClearFilters(true)
    setFilter(defaultFilter)
  }

  const handleDownload = () => {
    // Create an object to hold only defined and non-empty parameters
    const params = {
      ...sanitizedFilters,
      export: "csv",
    }

    // Filter out undefined or empty string parameters
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(
        ([_, value]) => value !== undefined && value !== ""
      )
    )

    // Construct the export URL with the filtered parameters
    const exportUrl = `${BASE_URL}/studies?${new URLSearchParams(
      filteredParams as Record<string, string>
    ).toString()}`

    // Open the export URL in a new tab
    window.open(exportUrl, "_blank")

    // Return a placeholder to satisfy the function's return type
    return null
  }

  const chartConfig: ChartConfig = {
    desktop: {
      label: "Desktop",
      color: "hsl(var(--chart-1))",
    },
    mobile: {
      label: "Desktop",
      color: "hsl(var(--chart-5))",
    },
  }

  // State to handle the visibility of the suggestion list
  const [isSuggestionVisible, setIsSuggestionVisible] = useState(true)

  // Ref for the suggestion list
  const suggestionRef = useRef<HTMLUListElement | null>(null)

  // Close suggestion list when clicking outside of it
  useOnClickOutside(suggestionRef, () => setIsSuggestionVisible(false))

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter({ ...filter, title: e.target.value })
    setIsSuggestionVisible(true) // Show the suggestion list when input changes
  }

  return (
    <div
      className={`relative mx-auto mb-10 flex w-full flex-col ${
        showSearchBar ? "px-4 lg:px-10" : "p-0"
      }`}
    >
      {showSearchBar && (
        <div
          className={`relative mx-auto mt-10 flex w-full flex-col p-6 sm:w-4/5 sm:p-10 lg:mt-16 lg:max-w-2xl ${
            isAdvanceFilterOpen ? "rounded-lg border" : "border-none"
          }`}
        >
          <div className="flex items-center justify-center rounded-md ring-1 ring-gray-500 focus-within:ring-gray-400">
            <SearchIcon
              className="ml-4 size-5 text-gray-700 group-hover:text-gray-900 dark:text-white dark:group-hover:text-white"
              aria-hidden="true"
            />
            <Input
              value={filter.title}
              onChange={handleInputChange}
              className="border-0 dark:text-white dark:placeholder:text-white"
              placeholder="Type your query here"
              autoComplete="off"
            />
          </div>

          <div
            className="my-8 flex items-center justify-center"
            onClick={() => setIsAdvanceFilterOpen((prev) => !prev)}
          >
            <p className="cursor-pointer text-sm font-bold text-[#6666E7] sm:text-base">
              {isAdvanceFilterOpen
                ? "Close Advance Search Options"
                : "Use Advanced Search"}
            </p>
            <ChevronDown
              strokeWidth={2}
              className={`ml-1 size-4 text-[#6666E7] transition-transform duration-300 ${
                isAdvanceFilterOpen ? "rotate-180" : ""
              }`}
            />
          </div>
          {showVisualize && (
            <Button
              className="mx-auto mb-8 h-12 w-40 text-sm sm:h-14 sm:w-[200px] sm:text-base"
              onClick={() => setIsGraphOpen((prev) => !prev)}
            >
              {isGraphOpen ? "Close visuals" : "Visualise"}
            </Button>
          )}

          {isAdvanceFilterOpen && (
            <AdvancedSearch
              filters={filter}
              setFilters={setFilter}
              clearFilters={clearFilters}
              setClearFilters={setClearFilters}
            />
          )}

          {isSuggestionVisible && suggestion?.disorders?.at(1) ? (
            <ul
              ref={suggestionRef}
              className="absolute top-[72px] z-40 mx-auto flex w-3/5 flex-col justify-center space-y-2 rounded-lg bg-muted py-4 lg:top-24 lg:max-w-2xl"
            >
              {suggestion?.disorders?.map((disorder) => (
                <li
                  key={disorder.id}
                  className="p-2 hover:bg-gray-200"
                  onClick={() =>
                    setFilter({ ...filter, disorder: disorder.disorder_name })
                  }
                >
                  <span className="text-balance font-medium tracking-tight">
                    {disorder.disorder_name}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <Dialog
        open={isGraphOpen && showVisualize}
        onOpenChange={(open) => setIsGraphOpen(open)}
      >
        <DialogContent className="max-h-dvh max-w-screen-md overflow-y-auto sm:max-h-[80%]">
          <DialogHeader>
            <Tabs defaultValue="collaboration" className="mb-6 mt-8 space-y-10">
              <div className="overflow-auto rounded-md border p-2">
                <TabsList className="flex h-full">
                  <TabsTrigger value="collaboration" className="w-full">
                    Collaboration
                  </TabsTrigger>
                  <TabsTrigger value="year" className="w-full">
                    Year
                  </TabsTrigger>
                  <TabsTrigger value="region" className="w-full">
                    Country
                  </TabsTrigger>
                  <TabsTrigger value="disorder" className="w-full">
                    Disorder
                  </TabsTrigger>
                  <TabsTrigger value="biologicalModality" className="w-full">
                    Biological Modality
                  </TabsTrigger>
                  <TabsTrigger value="geneticSource" className="w-full">
                    Genetic Source
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="year">
                <YearlyStudyCount
                  isLoading={isLoading}
                  chartData={(searches?.yearly_study_counts ?? []).map((c) => ({
                    year: c.year,
                    study_count: c.study_count,
                    citation: c.total_citations,
                    impact_factor: c.average_impact_factor,
                  }))}
                />
              </TabsContent>
              <TabsContent value="region">
                <RegionalStudyCount
                  isLoading={isLoading}
                  chartData={searches?.african_study_counts ?? []}
                />
              </TabsContent>
              <TabsContent value="disorder">
                <DisorderStudyCount
                  isLoading={isLoading}
                  data={searches?.disorder_study_counts ?? []}
                />
              </TabsContent>
              <TabsContent value="biologicalModality">
                <BiologicalStudyCount
                  isLoading={isLoading}
                  data={searches?.biological_modality_study_counts ?? []}
                />
              </TabsContent>
              <TabsContent value="geneticSource">
                <GeneticsStudyCount
                  isLoading={isLoading}
                  data={searches?.genetic_source_material_study_counts ?? []}
                />
              </TabsContent>
              <TabsContent value="collaboration">
                <Chord
                  data={searches?.collaboration_data}
                  isLoading={isLoading}
                  error={isError ? "Something went wrong" : undefined}
                />
              </TabsContent>
            </Tabs>
          </DialogHeader>
          {/* {isLoading ? (
            <GraphSkeleton />
          ) : (
            <ChartContainer config={chartConfig}>
              <LineChart
                data={searches?.yearly_study_counts ?? []}
                margin={{ left: 12, right: 12 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Line
                  dataKey="study_count"
                  type="linear"
                  stroke="var(--color-mobile)"
                  strokeWidth={2}
                  dot={true}
                />
              </LineChart>
            </ChartContainer>
          )} */}
        </DialogContent>
      </Dialog>

      <div className="mt-14 flex gap-6">
        {showFilters && (
          <div className="sticky top-0 z-30 hidden h-fit shrink space-y-10 md:flex md:flex-col lg:w-80">
            <h2 className="text-4xl font-semibold">Filter by:</h2>
            <div className="flex gap-4 lg:gap-6">
              <FilterButton
                name="Clear Filters"
                type="ghost"
                onClick={handleClearFilters}
              />
              {/* <FilterButton name="Save Filters" type="outline" /> */}
            </div>
            <SideFilters
              clearFilters={clearFilters}
              filter={filter}
              applyStringFilter={applyStringFilter}
              isGeneticSourcesLoading={isGeneticSourcesLoading}
              geneticSources={geneticSources ?? []}
              isArticleTypesLoading={isArticleTypesLoading}
              articleTypes={articleTypes ?? []}
              disorders={disorders ?? []}
              isDisorderLoading={isDisorderLoading}
            />
          </div>
        )}

        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-col-reverse justify-between gap-5 sm:flex-row sm:items-center">
            {isLoading ? (
              ""
            ) : searches?.results && searches?.results.length > 0 ? (
              <>
                <h1 className="text-2xl font-bold lg:text-2xl">
                  {searches?.count} Results
                </h1>

                <div className="flex flex-col gap-3 min-[500px]:flex-row">
                  <Button
                    className="w-full gap-2 text-white sm:w-auto"
                    onClick={() => handleDownload()}
                  >
                    <CloudDownloadIcon strokeWidth={2} />
                    <span>Download Search Result</span>
                  </Button>
                  {showFilters && (
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant={"outline"}
                          className="group flex w-full items-center rounded-md border sm:w-auto md:hidden"
                        >
                          <Filter
                            aria-hidden="true"
                            className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-gray-800">
                            Filter By
                          </span>
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="flex w-3/6 flex-col overflow-y-auto pr-0 sm:max-w-lg md:hidden">
                        <SheetHeader className="mt-6 space-y-2.5 pr-6">
                          <SheetTitle>
                            <FilterButton
                              name="Clear Filters"
                              type="ghost"
                              onClick={handleClearFilters}
                            />
                          </SheetTitle>
                        </SheetHeader>
                        <SideFilters
                          clearFilters={clearFilters}
                          filter={filter}
                          applyStringFilter={applyStringFilter}
                          isGeneticSourcesLoading={isGeneticSourcesLoading}
                          geneticSources={geneticSources ?? []}
                          isArticleTypesLoading={isArticleTypesLoading}
                          articleTypes={articleTypes ?? []}
                          isDisorderLoading={isDisorderLoading}
                          disorders={disorders ?? []}
                        />
                      </SheetContent>
                    </Sheet>
                  )}
                </div>
              </>
            ) : null}
          </div>

          <div className="flex grow flex-col gap-5">
            {isLoading ? (
              new Array(10).fill(null).map((_, i) => <StudySkeleton key={i} />)
            ) : isError ? (
              <div className="col-span-3 flex items-center">
                <span className="relative mr-2 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
                </span>
                <p className="flex text-sm font-medium text-gray-900">
                  Something went wrong
                </p>
              </div>
            ) : searches?.results && searches?.results.length > 0 ? (
              searches?.results?.map((study, i: number) => (
                <StudyList key={i} study={study} />
              ))
            ) : (
              <NotFound searchTerm={filter.title ?? ""} />
            )}
          </div>

          <div>
            {isError ||
            (searches?.results && searches?.results.length <= 0) ? null : (
              <PaginationControls
                prevPage={prevPage}
                nextPage={nextPage}
                page={Number(filter.page) || 1}
                count={searches?.count}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const FilterSkeleton = (
  <>
    <p className="h-6 w-64 animate-pulse rounded bg-gray-200 backdrop-blur-lg"></p>
    <p className="h-6 w-64 animate-pulse rounded bg-gray-200 backdrop-blur-lg"></p>
  </>
)

const YearlyStudyCount = ({
  isLoading,
  chartData,
}: {
  isLoading: boolean
  chartData: StudyCount[]
}) => {
  const chartConfig = {
    desktop: {
      label: "Desktop",
      color: "hsl(var(--chart-1))",
    },
    mobile: {
      label: "Desktop",
      color: "hsl(var(--chart-5))",
    },
  }
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Yearly Study-Count</CardTitle>
          <CardDescription>Number of Publications </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <GraphSkeleton />
          ) : (
            <ChartContainer config={chartConfig}>
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 20, bottom: 10 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickMargin={8}
                  // fontSize={10}
                  // fontWeight={600}
                />
                <YAxis domain={["auto", "auto"]} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Line
                  dataKey="study_count"
                  type="linear"
                  stroke="var(--color-mobile)"
                  strokeWidth={2}
                  dot={true}
                />
                {/* <Line
                  data={studyCountTrendLine}
                  dataKey="trend"
                  type="linear"
                  stroke="#FF6347"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="3 3"
                /> */}
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
        {/* <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            Highlight <TrendingUp className="h-4 w-4" />
          </div>
          <div className="leading-none text-muted-foreground">
            The data on African genomics research reveals a clear upward trend
            from 2007, with a significant surge in publications starting around
            2014. This growth reflects increasing global interest and investment
            in the field, peaking at 14 publications in 2022. The consistent
            activity over the years highlights the growing importance and
            recognition of African genomics on the global research stage.
          </div>
        </CardFooter> */}
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Yearly Citation</CardTitle>
          <CardDescription>Number of Publications </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <GraphSkeleton />
          ) : (
            <ChartContainer config={chartConfig} className="h-full">
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 20, bottom: 10 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="year" axisLine={false} tickMargin={8} />
                <YAxis domain={["auto", "auto"]} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Line
                  dataKey="citation"
                  type="linear"
                  stroke="var(--color-desktop)"
                  strokeWidth={2}
                  dot={true}
                />
                {/* <Line
                  data={citationTrendLine}
                  dataKey="trend"
                  type="linear"
                  stroke="#32CD32"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="3 3"
                /> */}
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
        {/* <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            Highlight <TrendingUp className="h-4 w-4" />
          </div>
          <div className="leading-none text-muted-foreground">
            The data on African genomics research reveals a clear upward trend
            from 2007, with a significant surge in publications starting around
            2014. This growth reflects increasing global interest and investment
            in the field, peaking at 14 publications in 2022. The consistent
            activity over the years highlights the growing importance and
            recognition of African genomics on the global research stage.
          </div>
        </CardFooter> */}
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Yearly Impact factor</CardTitle>
          <CardDescription>Number of Publications </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <GraphSkeleton />
          ) : (
            <ChartContainer config={chartConfig} className="h-full">
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 20, bottom: 10 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="year" axisLine={false} tickMargin={8} />
                <YAxis domain={["auto", "auto"]} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Line
                  dataKey="impact_factor"
                  type="linear"
                  stroke="var(--color-desktop)"
                  strokeWidth={2}
                  dot={true}
                />
                {/* <Line
                  data={impactFactorTrendLine}
                  dataKey="trend"
                  type="linear"
                  stroke="#32CD32"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="3 3"
                /> */}
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
        {/* <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            Highlight <TrendingUp className="h-4 w-4" />
          </div>
          <div className="leading-none text-muted-foreground">
            The data on African genomics research reveals a clear upward trend
            from 2007, with a significant surge in publications starting around
            2014. This growth reflects increasing global interest and investment
            in the field, peaking at 14 publications in 2022. The consistent
            activity over the years highlights the growing importance and
            recognition of African genomics on the global research stage.
          </div>
        </CardFooter> */}
      </Card>
    </div>
  )
}

const RegionalStudyCount = ({
  isLoading,
  chartData,
}: {
  isLoading: boolean
  chartData: Region[]
}) => {
  const chartConfig = {
    desktop: {
      label: "Desktop",
      color: "hsl(var(--chart-1))",
    },
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Country Study-count</CardTitle>
        <CardDescription>Number of Publications</CardDescription>
      </CardHeader>
      <CardContent>
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
            >
              {/* <Legend
                verticalAlign="bottom"
                content={
                  <AbbreviationLegend
                    data={(chartData ?? []).map((val) => ({
                      name: val.countries__name,
                    }))}
                  />
                }
              /> */}
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
      </CardContent>
      {/* <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Highlight <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter> */}
    </Card>
  )
}

const DisorderStudyCount = ({
  isLoading,
  data,
}: {
  isLoading: boolean
  data: Disorder[]
}) => {
  const [activeDisorder, setActiveDisorder] = useState("")
  const chartData = useMemo(
    () =>
      data
        ?.map((data) => ({
          disorder: data.disorder__disorder_name,
          study_count: data.study_count,
          // fill: getRandomColor(),
        }))
        ?.filter((d) => d.disorder !== null) ?? [],
    [data]
  )

  const activeIndex = chartData.findIndex(
    (item) => item.disorder === activeDisorder
  )

  const chartConfig = {
    desktop: {
      label: "Desktop",
      color: "hsl(var(--chart-1))",
    },
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Disorder study-count</CardTitle>
        <CardDescription>Number of Publications </CardDescription>
        {/* <Select value={activeDisorder} onValueChange={setActiveDisorder}>
          <SelectTrigger
            className="ml-auto flex h-7 w-fit items-center justify-center rounded-sm border px-4 py-1 font-medium text-gray-700 hover:bg-gray-50"
            aria-label="Select a disorder"
          >
            <SelectValue placeholder="Select disorder" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {chartData?.map((disorder, index) => (
              <SelectItem
                key={index}
                value={disorder.disorder}
                className="rounded-lg [&_span]:flex"
              >
                <div className="flex w-48 items-center gap-2 text-xs">
                  <span
                    className="flex h-3 w-3 shrink-0 rounded-sm"
                    style={{
                      backgroundColor: disorder.fill,
                    }}
                  />
                  {disorder.disorder}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select> */}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex size-full items-center justify-center">
            <GraphSkeleton pie={false} />
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                top: 20,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="disorder"
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
              name: val.disorder,
            }))}
          />
        )}
      </CardContent>
      {/* <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Highlight <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter> */}
    </Card>
  )
}

const BiologicalStudyCount = ({
  isLoading,
  data,
}: {
  isLoading: boolean
  data: BiologicalRecord[]
}) => {
  const chartData =
    data
      ?.map((d) => ({
        biological_modalities__modality_name:
          d.biological_modalities__modality_name,
        study_count: d.study_count,
        // fill: getRandomColor(),
      }))
      ?.filter((d) => d.biological_modalities__modality_name !== null) ?? []

  const chartConfig = {
    desktop: {
      label: "Desktop",
      color: "hsl(var(--chart-1))",
    },
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Number of studies, by biological modality</CardTitle>
        {/* <CardDescription>Number of Publications </CardDescription> */}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <GraphSkeleton pie />
        ) : (
          <ChartContainer config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                top: 20,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="biological_modalities__modality_name"
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
              name: val.biological_modalities__modality_name,
            }))}
          />
        )}
      </CardContent>
      {/* <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Highlight <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter> */}
    </Card>
  )
}

const GeneticsStudyCount = ({
  isLoading,
  data,
}: {
  isLoading: boolean
  data: Genetics[]
}) => {
  const chartData =
    data
      ?.map((d) => ({
        genetic_source_materials__material_type:
          d.genetic_source_materials__material_type,
        study_count: d.study_count,
        // fill: getRandomColor(),
      }))
      ?.filter((d) => d.genetic_source_materials__material_type !== null) ?? []

  const chartConfig = {
    desktop: {
      label: "Desktop",
      color: "hsl(var(--chart-1))",
    },
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Number of studies, by DNA source</CardTitle>
        {/* <CardDescription>Number of Publications </CardDescription> */}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <GraphSkeleton pie />
        ) : (
          <ChartContainer config={chartConfig} className="w-full">
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                top: 20,
              }}
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
        {chartData && chartData.length > 0 && (
          <AbbreviationLegend
            data={(chartData ?? []).map((val) => ({
              name: val.genetic_source_materials__material_type,
            }))}
          />
        )}
      </CardContent>
      {/* <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Highlight <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter> */}
    </Card>
  )
}

const SideFilters = ({
  filter,
  applyStringFilter,
  isGeneticSourcesLoading,
  geneticSources,
  isArticleTypesLoading,
  articleTypes,
  disorders,
  isDisorderLoading,
  clearFilters,
}: {
  filter: DocumentState
  applyStringFilter: ({
    category,
    value,
  }: {
    category: keyof typeof filter
    value: string
  }) => void
  isGeneticSourcesLoading: boolean
  geneticSources: any[]
  isArticleTypesLoading: boolean
  articleTypes: any[]
  disorders: any[]
  isDisorderLoading: boolean
  clearFilters: boolean
}) => {
  const [visibleYears, setVisibleYears] = useState(5)
  const [visibleDisorders, setVisibleDisorders] = useState(5)
  const [visibleGeneticSources, setVisibleGeneticSources] = useState(5)
  const [visibleArticleTypes, setVisibleArticleTypes] = useState(5)

  const currentYear = new Date().getFullYear()

  const allYears = Array.from(
    { length: visibleYears },
    (_, i) => currentYear - i
  )

  const handleShowMoreYears = () => setVisibleYears((prev) => prev + 5)
  const handleShowLessYears = () => setVisibleYears(5)

  const handleShowMore = (
    setVisible: React.Dispatch<React.SetStateAction<number>>,
    total: number
  ) => {
    setVisible((prev) => (prev + 5 <= total ? prev + 5 : total))
  }

  const handleShowLess = (setVisible: (value: number) => void) => {
    setVisible(5)
  }
  return (
    <>
      <div>
        <h3 className="font-medium">Year(s)</h3>
        <div className="pt-6">
          {allYears.length > 5 && (
            <button
              className="group mt-4 flex cursor-pointer items-center"
              onClick={() => handleShowLessYears()}
            >
              <p className="text-sm text-muted-foreground group-hover:text-gray-900">
                Show Newer Years
              </p>
              <p className="text-sm text-muted-foreground group-hover:text-gray-900"></p>
              <ChevronUp className="ml-2 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            </button>
          )}
          <ul className="my-4 space-y-4">
            {allYears
              // .sort((a, b) => a - b)
              .slice(-5)
              .map((year, index) => (
                <li key={index} className="flex items-center">
                  <input
                    name="year"
                    type="radio"
                    id={`year-${index + 1}`}
                    onChange={() => {
                      applyStringFilter({
                        category: "year",
                        value: `${year}`,
                      })
                    }}
                    value={`${year}`}
                    checked={filter.year === `${year}`}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <label
                    htmlFor={`year-${index + 1}`}
                    className="ml-3 text-sm text-gray-600"
                  >
                    {year}
                  </label>
                </li>
              ))}
          </ul>
          <button
            className="group mt-4 flex cursor-pointer items-center"
            onClick={handleShowMoreYears}
          >
            <p className="text-sm text-muted-foreground group-hover:text-gray-900">
              Show Earlier Years
            </p>
            <ChevronUp className="ml-2 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-medium">Disorders</h3>
        <div className="pt-6">
          {visibleDisorders > 5 && (
            <button
              className="group mt-4 flex cursor-pointer items-center"
              onClick={() => handleShowLess(setVisibleDisorders)}
            >
              <p className="text-sm text-muted-foreground group-hover:text-gray-900">
                Show Less Disorders
              </p>
              <ChevronDown className="ml-2 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            </button>
          )}
          <ul className="my-4 space-y-4">
            {isDisorderLoading ? (
              <>
                <p className="h-6 w-64 animate-pulse rounded bg-gray-200 backdrop-blur-lg"></p>
                <p className="h-6 w-64 animate-pulse rounded bg-gray-200 backdrop-blur-lg"></p>
              </>
            ) : (
              (disorders ? disorders.slice(0, visibleDisorders) : []).map(
                (
                  disorder: { id: number; disorder_name: string },
                  index: number
                ) => (
                  <li key={disorder.id} className="flex items-center">
                    <input
                      name="disorder"
                      type="radio"
                      id={`disorder-${index + 1}`}
                      onChange={() => {
                        applyStringFilter({
                          category: "disorder",
                          value: disorder.disorder_name,
                        })
                      }}
                      value={disorder.disorder_name}
                      checked={filter.disorder === disorder.disorder_name}
                      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <label
                      htmlFor={`disorder-${index + 1}`}
                      className="ml-3 text-sm text-gray-600"
                    >
                      {disorder.disorder_name}
                    </label>
                  </li>
                )
              )
            )}
          </ul>
          {disorders.length > visibleDisorders && (
            <button
              className="group mt-4 flex cursor-pointer items-center"
              onClick={() =>
                handleShowMore(setVisibleDisorders, disorders.length)
              }
            >
              <p className="text-sm text-muted-foreground group-hover:text-gray-900">
                Show More Disorders
              </p>
              <ChevronUp className="ml-2 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            </button>
          )}
        </div>
      </div>
      <div>
        <h3 className="font-medium">Genetic Sources(s)</h3>
        <div className="pt-6">
          {visibleGeneticSources > 5 && (
            <button
              className="group mt-4 flex cursor-pointer items-center"
              onClick={() => handleShowLess(setVisibleGeneticSources)}
            >
              <p className="text-sm text-muted-foreground group-hover:text-gray-900">
                Show Less Genetic Sources
              </p>
              <ChevronDown className="ml-2 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            </button>
          )}
          <ul className="my-4 space-y-4">
            {isGeneticSourcesLoading ? (
              <>
                <p className="h-6 w-64 animate-pulse rounded bg-gray-200 backdrop-blur-lg"></p>
                <p className="h-6 w-64 animate-pulse rounded bg-gray-200 backdrop-blur-lg"></p>
              </>
            ) : (
              (geneticSources
                ? geneticSources.slice(0, visibleGeneticSources)
                : []
              ).map(
                (
                  source: { id: number; material_type: string },
                  index: number
                ) => (
                  <li key={source.id} className="flex items-center">
                    <input
                      name="genetic-source"
                      type="radio"
                      id={`genetic-source-${index + 1}`}
                      onChange={() => {
                        applyStringFilter({
                          category: "genetic_source_materials",
                          value: source.material_type,
                        })
                      }}
                      value={source.material_type}
                      checked={
                        filter.genetic_source_materials === source.material_type
                      }
                      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <label
                      htmlFor={`genetic-source-${index + 1}`}
                      className="ml-3 text-sm text-gray-600"
                    >
                      {source.material_type}
                    </label>
                  </li>
                )
              )
            )}
          </ul>
          {geneticSources.length > visibleGeneticSources && (
            <button
              className="group mt-4 flex cursor-pointer items-center"
              onClick={() =>
                handleShowMore(setVisibleGeneticSources, geneticSources.length)
              }
            >
              <p className="text-sm text-muted-foreground group-hover:text-gray-900">
                Show More Genetic Sources
              </p>
              <ChevronUp className="ml-2 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-medium">Article Type</h3>
        <div className="pt-6">
          {visibleArticleTypes > 5 && (
            <button
              className="group mt-4 flex cursor-pointer items-center"
              onClick={() => handleShowLess(setVisibleArticleTypes)}
            >
              <p className="text-sm text-muted-foreground group-hover:text-gray-900">
                Show Less Article Types
              </p>
              <ChevronDown className="ml-2 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            </button>
          )}
          <ul className="my-4 space-y-4">
            {isArticleTypesLoading ? (
              <>
                <p className="h-6 w-64 animate-pulse rounded bg-gray-200 backdrop-blur-lg"></p>
                <p className="h-6 w-64 animate-pulse rounded bg-gray-200 backdrop-blur-lg"></p>
              </>
            ) : (
              (articleTypes
                ? articleTypes.slice(0, visibleArticleTypes)
                : []
              ).map(
                (
                  articleType: { id: number; article_name: string },
                  index: number
                ) => (
                  <li key={articleType.id} className="flex items-center">
                    <input
                      name="article-type"
                      type="radio"
                      id={`article-${index + 1}`}
                      onChange={() => {
                        applyStringFilter({
                          category: "article_type",
                          value: articleType.article_name,
                        })
                      }}
                      value={articleType.article_name}
                      checked={filter.article_type === articleType.article_name}
                      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <label
                      htmlFor={`article-${index + 1}`}
                      className="ml-3 text-sm text-gray-600"
                    >
                      {articleType.article_name}
                    </label>
                  </li>
                )
              )
            )}
          </ul>
          {articleTypes.length > visibleArticleTypes && (
            <button
              className="group mt-4 flex cursor-pointer items-center"
              onClick={() =>
                handleShowMore(setVisibleArticleTypes, articleTypes.length)
              }
            >
              <p className="text-sm text-muted-foreground group-hover:text-gray-900">
                Show More Article Types
              </p>
              <ChevronDown className="ml-2 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            </button>
          )}
        </div>
      </div>
    </>
  )
}

export default Search
