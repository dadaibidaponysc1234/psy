"use client";

import FilterButton from "@/components/filterBtn";
import StudySkeleton from "@/components/skeletons/study-skeleton";
import StudyList from "@/components/studies/StudyList";
import { DocumentState } from "@/lib/validators/document-validator";
import {
  ChevronDown,
  CloudDownloadIcon,
  Filter,
  Search as SearchIcon,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { useGetSearchResult } from "@/hooks/use-get-searchResults";
import { Input } from "@/components/ui/input";
import useDebounce from "@/hooks/useDebounce";
import NotFound from "@/components/NotFound";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import PaginationControls from "@/components/PaginationControls";
import AdvancedSearch from "@/components/AdvancedSearch";
import { useGetSuggestion } from "@/hooks/use-get-suggestion";
import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "@/static";
import GraphSkeleton from "@/components/skeletons/graph-skeleton";
import {
  CardTitle,
  CardDescription,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CartesianGrid, XAxis, Line, LineChart } from "recharts";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

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
  showSearchBar?: boolean;
  showFilters?: boolean;
  showVisualize?: boolean;
}) => {
  const [filter, setFilter] = useState<DocumentState>({
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
  });
  const [isAdvanceFilterOpen, setIsAdvanceFilterOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [clearFilters, setClearFilters] = useState(false);
  const [yearsDisplayed, setYearsDisplayed] = useState(5);
  const debouncedSearchTerm = useDebounce(filter?.title ?? "", 700);

  const currentYear = new Date().getFullYear();
  // Generate an array of years starting from the current year
  const allYears = Array.from(
    { length: yearsDisplayed },
    (_, i) => currentYear - i
  );

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
  };

  const {
    data: searches,
    isLoading,
    isError,
  } = useGetSearchResult(sanitizedFilters);

  const { data: suggestion } = useGetSuggestion(debouncedSearchTerm ?? "");

  const { data: geneticSources, isLoading: isGeneticSourcesLoading } = useQuery(
    {
      queryKey: ["search-genetic-sources"],
      queryFn: async () => {
        const response = await axios.get(
          `${BASE_URL}/genetic-source-materials`
        );
        return response.data;
      },
      refetchOnMount: false,
    }
  );

  // const { data: disorders, isLoading: isDisorderLoading } = useQuery({
  //   queryKey: ["search-disorders"],
  //   queryFn: async () => {
  //     const response = await axios.get(`${BASE_URL}/disorders`);
  //     return response.data;
  //   },
  //   refetchOnMount: false,
  // });

  const { data: articleTypes, isLoading: isArticleTypesLoading } = useQuery({
    queryKey: ["search-article-types"],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/article-types`);
      return response.data;
    },
    refetchOnMount: false,
  });

  const nextPage = () =>
    setFilter((prev) => ({ ...prev, page: `${(Number(prev.page) || 1) + 1}` }));

  const prevPage = () =>
    setFilter((prev) => ({
      ...prev,
      page: `${Math.max((Number(prev.page) || 1) - 1, 1)}`,
    }));

  const handleShowMoreYears = () => {
    setYearsDisplayed((prev) => prev + 3);
  };

  const applyStringFilter = ({
    category,
    value,
  }: {
    category: keyof typeof filter;
    value: string;
  }) => {
    setFilter((prev) => ({
      ...prev,
      [category]: prev[category] === value ? "" : value,
    }));
  };

  const handleClearFilters = () => {
    setClearFilters(true);
    setFilter((prev) => {
      const newFilters = { ...prev };
      Object.keys(newFilters).forEach((key) => {
        newFilters[key as keyof typeof filter] = "";
      });
      return newFilters;
    });
  };

  const handleDownload = () => {
    // Create an object to hold only defined and non-empty parameters
    const params = {
      ...sanitizedFilters,
      export: "csv",
    };

    // Filter out undefined or empty string parameters
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(
        ([_, value]) => value !== undefined && value !== ""
      )
    );

    // Construct the export URL with the filtered parameters
    const exportUrl = `${BASE_URL}/studies?${new URLSearchParams(
      filteredParams as Record<string, string>
    ).toString()}`;

    // Open the export URL in a new tab
    window.open(exportUrl, "_blank");

    // Return a placeholder to satisfy the function's return type
    return null;
  };

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

  // State to handle the visibility of the suggestion list
  const [isSuggestionVisible, setIsSuggestionVisible] = useState(true);

  // Ref for the suggestion list
  const suggestionRef = useRef<HTMLUListElement | null>(null);

  // Close suggestion list when clicking outside of it
  useOnClickOutside(suggestionRef, () => setIsSuggestionVisible(false));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter({ ...filter, title: e.target.value });
    setIsSuggestionVisible(true); // Show the suggestion list when input changes
  };

  return (
    <div
      className={`w-full relative flex flex-col mx-auto mb-10 ${
        showSearchBar ? "px-4 lg:px-10" : "p-0"
      }`}
    >
      {showSearchBar && (
        <div
          className={`sm:w-4/5 w-full relative lg:max-w-2xl flex flex-col p-10 mx-auto mt-10 lg:mt-16 ${
            isAdvanceFilterOpen ? "border rounded-xl" : "border-none"
          }`}
        >
          <div className="flex items-center justify-center ring-1 ring-gray-500 focus-within:ring-gray-400 rounded-md">
            <SearchIcon
              className="size-5 ml-4 text-gray-700 group-hover:text-gray-900 dark:text-white dark:group-hover:text-white"
              aria-hidden="true"
            />
            <Input
              value={filter.title}
              onChange={handleInputChange}
              className="border-0 dark:text-white dark:placeholder:text-white"
              placeholder="Search for disorders"
              autoComplete="off"
            />
          </div>

          <div
            className="my-8 flex items-center justify-center"
            onClick={() => setIsAdvanceFilterOpen((prev) => !prev)}
          >
            <p className="text-[#6666E7] cursor-pointer font-bold">
              {isAdvanceFilterOpen
                ? "Close Advance Search Options"
                : "Use Advanced Search"}
            </p>
            <ChevronDown
              strokeWidth={2}
              className={`ml-1 text-[#6666E7] transition-transform duration-300 size-4 ${
                isAdvanceFilterOpen ? "rotate-180" : ""
              }`}
            />
          </div>
          {showVisualize && (
            <Button
              className="h-14 w-[200px] mb-8 text-base mx-auto"
              onClick={() => setIsGraphOpen((prev) => !prev)}
            >
              {isGraphOpen ? "Close visuals" : "Visualize"}
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
              className="w-3/5 lg:max-w-2xl bg-muted flex flex-col justify-center absolute top-[72px] lg:top-24 z-40 mx-auto space-y-2 py-4 rounded-lg"
            >
              {suggestion?.disorders?.map((disorder) => (
                <li
                  key={disorder.id}
                  className="p-2 hover:bg-gray-200"
                  onClick={() =>
                    setFilter({ ...filter, disorder: disorder.disorder_name })
                  }
                >
                  <span className="font-medium tracking-tight text-balance">
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
        <DialogContent className="lg:max-w-screen-lg max-w-screen-md overflow-y-auto max-h-screen">
          <DialogHeader>
            <DialogTitle>Yearly Study-Count</DialogTitle>
            <DialogDescription>Number of Publications</DialogDescription>
          </DialogHeader>
          {isLoading ? (
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
          )}
        </DialogContent>
      </Dialog>

      <div className="flex gap-6 mt-14">
        {showFilters && (
          <div className="hidden md:flex md:flex-col lg:w-80 h-fit shrink sticky top-0 z-30 space-y-10">
            <h2 className="text-4xl font-semibold">Filter by:</h2>
            <div className="flex gap-4 lg:gap-6">
              <FilterButton
                name="Clear Filters"
                type="ghost"
                onClick={handleClearFilters}
              />
              {/* <FilterButton name="Save Filters" type="outline" /> */}
            </div>

            <div>
              <h3 className="font-medium">Year(s)</h3>
              <div className="pt-6">
                <ul className="space-y-4">
                  {allYears.map((year, index) => (
                    <li key={index} className="flex items-center">
                      <input
                        name="year"
                        type="radio"
                        id={`year-${index + 1}`}
                        onChange={() => {
                          applyStringFilter({
                            category: "year",
                            value: `${year}`,
                          });
                        }}
                        value={`${year}`}
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
                  className="flex items-center mt-4 group cursor-pointer"
                  onClick={() => handleShowMoreYears()}
                >
                  <p className="text-sm text-muted-foreground group-hover:text-gray-900">
                    show more
                  </p>
                  <ChevronDown className="ml-2 w-4 h-4 text-gray-400 group-hover:text-gray-500" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-medium">Genetic Sources(s)</h3>
              <div className="pt-6">
                <ul className="space-y-4">
                  {isGeneticSourcesLoading ? (
                    <>
                      <p className="backdrop-blur-lg h-6 w-64 rounded bg-gray-200 animate-pulse"></p>
                      <p className="backdrop-blur-lg h-6 w-64 rounded bg-gray-200 animate-pulse"></p>
                    </>
                  ) : (
                    (geneticSources ?? []).map(
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
                              });
                            }}
                            value={source.material_type}
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
              </div>
            </div>

            <div>
              <h3 className="font-medium">Article Type</h3>
              <div className="pt-6">
                <ul className="space-y-4">
                  {isArticleTypesLoading ? (
                    <>
                      <p className="backdrop-blur-lg h-6 w-64 rounded bg-gray-200 animate-pulse"></p>
                      <p className="backdrop-blur-lg h-6 w-64 rounded bg-gray-200 animate-pulse"></p>
                    </>
                  ) : (
                    (articleTypes ?? []).map(
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
                              });
                            }}
                            value={articleType.article_name}
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
              </div>
            </div>
          </div>
        )}

        <div className="w-full flex flex-col">
          <div className="flex items-center justify-between">
            {isLoading ? (
              ""
            ) : searches?.results && searches?.results.length > 0 ? (
              <>
                <h1 className="text-2xl lg:text-2xl font-bold">
                  {searches?.count} Results
                </h1>
                <Button
                  className="gap-2 text-white"
                  onClick={() => handleDownload()}
                >
                  <CloudDownloadIcon strokeWidth={2} />
                  <span>Download Search Result</span>
                </Button>
              </>
            ) : null}

            {showFilters && (
              <div className="flex flex-col md:hidden">
                <Sheet>
                  <SheetTrigger className="group -m-2 flex items-center p-2 border rounded-md">
                    <Filter
                      aria-hidden="true"
                      className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-gray-800">
                      Filter By
                    </span>
                  </SheetTrigger>
                  <SheetContent className="flex w-3/6 flex-col pr-0 sm:max-w-lg overflow-y-auto">
                    <SheetHeader className="mt-6 space-y-2.5 pr-6">
                      <SheetTitle>
                        <div className="flex gap-4 lg:gap-6">
                          <FilterButton
                            name="Clear Filters"
                            type="ghost"
                            onClick={handleClearFilters}
                          />
                          {/* <FilterButton name="Save Filters" type="outline" /> */}
                        </div>
                      </SheetTitle>
                    </SheetHeader>
                    <div>
                      <h3 className="font-medium">Year(s)</h3>
                      <div className="pt-6">
                        <ul className="space-y-4">
                          {allYears.map((year, index) => (
                            <li key={index} className="flex items-center">
                              <input
                                name="year"
                                type="radio"
                                id={`year-${index + 1}`}
                                onChange={() => {
                                  applyStringFilter({
                                    category: "year",
                                    value: `${year}`,
                                  });
                                }}
                                value={`${year}`}
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
                          className="flex items-center mt-4 group cursor-pointer"
                          onClick={() => handleShowMoreYears()}
                        >
                          <p className="text-sm text-muted-foreground group-hover:text-gray-900">
                            show more
                          </p>
                          <ChevronDown className="ml-2 w-4 h-4 text-gray-400 group-hover:text-gray-500" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium">Genetic Sources(s)</h3>
                      <div className="pt-6">
                        <ul className="space-y-4">
                          {isGeneticSourcesLoading
                            ? FilterSkeleton
                            : (geneticSources ?? []).map(
                                (
                                  source: { id: number; material_type: string },
                                  index: number
                                ) => (
                                  <li
                                    key={source.id}
                                    className="flex items-center"
                                  >
                                    <input
                                      name="genetic-source"
                                      type="radio"
                                      id={`genetic-source-${index + 1}`}
                                      onChange={(e) => {
                                        applyStringFilter({
                                          category: "genetic_source_materials",
                                          value: e.target.value,
                                        });
                                      }}
                                      value={source.material_type}
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
                              )}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium">Article Type</h3>
                      <div className="pt-6">
                        <ul className="space-y-4">
                          {isArticleTypesLoading
                            ? FilterSkeleton
                            : (articleTypes ?? []).map(
                                (
                                  articleType: {
                                    id: number;
                                    article_name: string;
                                  },
                                  index: number
                                ) => (
                                  <li
                                    key={articleType.id}
                                    className="flex items-center"
                                  >
                                    <input
                                      name="article-type"
                                      type="radio"
                                      id={`article-${index + 1}`}
                                      onChange={() => {
                                        applyStringFilter({
                                          category: "article_type",
                                          value: articleType.article_name,
                                        });
                                      }}
                                      value={articleType.article_name}
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
                              )}
                        </ul>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 grow">
            {isLoading ? (
              new Array(10).fill(null).map((_, i) => <StudySkeleton key={i} />)
            ) : isError ? (
              <div className="flex items-center col-span-3">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
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
  );
};

const FilterSkeleton = (
  <>
    <p className="backdrop-blur-lg h-6 w-64 rounded bg-gray-200 animate-pulse"></p>
    <p className="backdrop-blur-lg h-6 w-64 rounded bg-gray-200 animate-pulse"></p>
  </>
);

export default Search;
