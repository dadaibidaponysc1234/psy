"use client"

import FilterButton from "@/components/filterBtn";
import StudySkeleton from "@/components/studies/study-skeleton";
import StudyList from "@/components/studies/StudyList";
import { DocumentState } from "@/lib/validators/document-validator";
import {
  ChevronDown,
  Filter,
  Search,
} from "lucide-react";
import { useRef, useState } from "react";
import { useGetSearchResult } from "@/hooks/use-get-searchResults";
import { Input } from "@/components/ui/input";
import useDebounce from "@/hooks/useDebounce";
import NotFound from "@/components/NotFound";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import PaginationControls from "@/components/PaginationControls";
import AdvancedSearch from "@/components/AdvancedSearch";
import { useGetSuggestion } from "@/hooks/use-get-suggestion";
import Link from "next/link";
import { useOnClickOutside } from "@/hooks/use-on-click-outside";


const REGIONS = {
  id: "region",
  name: "region",
  options: [
    { value: "European", label: "European" },
    { value: "Northern Africa", label: "Northern Africa" },
    { value: "Southern Africa", label: "Southern Africa" },
    { value: "Eastern Africa", label: "Eastern Africa" },
    { value: "Western Africa", label: "Western Africa" },
    { value: "Central", label: "Central" },
  ] as const
}

const GENOMIC_CATEGORY = {
  id: "Genomic Category",
  name: "Genomic Category",
  options: [
    { value: "GWAS", label: "GWAS" },
    { value: "Candidate Gene", label: "Candidate Gene" },
    { value: "Familial Linkage", label: "Familial Linkage" },
    { value: "Epigenetics", label: "Epigenetics" },
    { value: "Expression", label: "Expression" },
    { value: "Microbiome", label: "Microbiome" },
    { value: "Others", label: "Others" },
    { value: "Undefined", label: "Undefined" }
  ] as const

}

const DISORDERS = {
  id: "disorder",
  name: "Disorder",
  options: [
    { value: "Mood", label: "Mood" },
    { value: "Pyschotic", label: "Pyschotic" },
    { value: "Substance", label: "Substance" },
    { value: "Depression", label: "Depression" },
    { value: "Anxiety", label: "Anxiety" },
    { value: "PTSD", label: "PTSD" },
    { value: "Neurodevelopmental", label: "Neurodevelopmental" },
    { value: "Suicide", label: "Suicide" },
    { value: "Others", label: "Others" }
  ] as const

}

const ARTICLE = {
  id: "article",
  name: "Article",
  options: [
    { value: "Case Report", label: "Case Report" },
    { value: "Research Study", label: "Research Study" },
    { value: "Systematic Review", label: "Systematic Review" }
  ] as const

}

const YEAR = {
  id: "year",
  name: "Year",
  options: [
    { value: "2024", label: "2024" },
    { value: "2023", label: "2023" },
    { value: "2022", label: "2022" },
    { value: "2021", label: "2021" },
    { value: "2020", label: "2020" },
  ] as const

}



const SearchPage = () => {
  const [page, setPage] = useState<number>(1);
  // const [activeIndex, setActiveIndex] = useState<null | number>(null)
  const [filter, setFilter] = useState<DocumentState>({
    searchTerm: "",
    region: "",
    disorder: "",
    article: "",
    year: ""
  });



  const debouncedSearchTerm = useDebounce(filter.searchTerm, 400);

  const { data: searches, isLoading, isError } = useGetSearchResult(debouncedSearchTerm, page, filter);
  const { data: suggestion } = useGetSuggestion(filter.searchTerm)

  console.log('suggestion', suggestion);

  const nextPage = () => setPage((prevPage) => prevPage + 1);
  const prevPage = () => setPage((prevPage) => Math.max(prevPage - 1, 1));

  const applyStringFilter = ({
    category,
    value
  }: {
    category: keyof typeof filter,
    value: string
  }) => {
    setFilter((prev) => ({
      ...prev,
      [category]: prev[category] === value ? "" : value
    }));
  }

  const clearFilters = () => {
    setFilter((prev) => {
      const newFilters = { ...prev };
      Object.keys(newFilters).forEach((key) => {
        newFilters[key as keyof typeof filter] = "";
      });
      return newFilters;
    });
  };

  // State to handle the visibility of the suggestion list
  const [isSuggestionVisible, setIsSuggestionVisible] = useState(true);

  // Ref for the suggestion list
  const suggestionRef = useRef<HTMLUListElement | null>(null);

  // Close suggestion list when clicking outside of it
  useOnClickOutside(suggestionRef, () => setIsSuggestionVisible(false));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter({ ...filter, searchTerm: e.target.value });
    setIsSuggestionVisible(true); // Show the suggestion list when input changes
  };


  return (
    <div className="w-full relative flex flex-col mx-auto mb-10">
      <div className="w-3/5 lg:max-w-2xl flex flex-col mx-auto mt-10 lg:mt-16 space-y-3">
        <div className="flex items-center justify-center ring-1 ring-gray-500 focus-within:ring-gray-400 rounded-md">
          <Search
            className='size-5 ml-4 text-gray-700 group-hover:text-gray-900 dark:text-white dark:group-hover:text-white'
            aria-hidden='true'
          />
          <Input
            value={filter.searchTerm}
            onChange={handleInputChange}
            className='border-0 dark:text-white dark:placeholder:text-white'
            placeholder='Search for disorders'
            autoComplete="off"
          />
        </div>

        <AdvancedSearch setFilter={setFilter} />

        {isSuggestionVisible && suggestion?.disorders?.at(1) ? (
          <ul
            ref={suggestionRef}
            className="w-3/5 lg:max-w-2xl bg-muted flex flex-col justify-center absolute top-[72px] lg:top-24 z-40 mx-auto space-y-2 py-4 rounded-lg"
          >
            {suggestion?.disorders?.map((disorder) => (
              <li key={disorder.id} className="p-2 hover:bg-gray-200">
                <Link href={`/Search/${disorder.id}`} className="font-medium tracking-tight text-balance">
                  {disorder.disorder_name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className='flex gap-6 mx-4 lg:mx-10 mt-20'>
        <div className='hidden md:flex md:flex-col lg:w-80 h-fit shrink sticky top-0 z-30 space-y-10'>
          <h2 className='text-4xl font-semibold'>Filter by:</h2>
          <div className='flex gap-4 lg:gap-6'>
            <FilterButton name="Clear Filters" type="ghost" onClick={clearFilters} />
            <FilterButton name="Save Filters" type="outline" />
          </div>

          <div>
            <h3 className='font-medium'>Year(s)</h3>
            <div className='pt-6'>
              <ul className='space-y-4'>{YEAR.options.map((option, optionIdx) => (
                <li key={option.value} className='flex items-center'>
                  <input
                    type='radio'
                    id={`year-${optionIdx}`}
                    onChange={() => {
                      applyStringFilter({
                        category: "year",
                        value: option.value
                      })
                    }}
                    checked={filter.year === option.value}
                    className='h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500'
                  />
                  <label
                    htmlFor={`year-${optionIdx}`}
                    className='ml-3 text-sm text-gray-600'>
                    {option.label}
                  </label>
                </li>
              ))}
              </ul>
              <div className='flex items-center mt-4 group cursor-pointer'>
                <p className='text-sm text-muted-foreground group-hover:text-gray-900'>show more</p>
                <ChevronDown className='ml-2 w-4 h-4 text-gray-400 group-hover:text-gray-500' />
              </div>
            </div>
          </div>

          <div>
            <h3 className='font-medium'>Region(s)</h3>
            <div className='pt-6'>
              <ul className='space-y-4'>{REGIONS.options.map((option, optionIdx) => (
                <li key={option.value} className='flex items-center'>
                  <input
                    type='radio'
                    id={`region-${optionIdx}`}
                    onChange={() => {
                      applyStringFilter({
                        category: "region",
                        value: option.value
                      })
                    }}
                    checked={filter.region === option.value}
                    className='h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500'
                  />
                  <label
                    htmlFor={`region-${optionIdx}`}
                    className='ml-3 text-sm text-gray-600'>
                    {option.label}
                  </label>
                </li>
              ))}</ul>
            </div>
          </div>

          {/* <div>
            <h3 className='font-medium'>Genomic Category</h3>
            <div className='pt-6'>
              <ul className='space-y-4'>{GENOMIC_CATEGORY.options.map((option, optionIdx) => (
                <li key={option.value} className='flex items-center'>
                  <input
                    type='radio'
                    id={`genomic-${optionIdx}`}
                    onChange={() => {
                      applyStringFilter({
                        category: "genomic",
                        value: option.value
                      })
                    }}
                    checked={filter.genomic === option.value}
                    className='h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500'
                  />
                  <label
                    htmlFor={`genomic-${optionIdx}`}
                    className='ml-3 text-sm text-gray-600'>
                    {option.label}
                  </label>
                </li>
              ))}</ul>
            </div>
          </div> */}

          <div>
            <h3 className='font-medium'>Disorder(s)</h3>
            <div className='pt-6'>
              <ul className='space-y-4'>{DISORDERS.options.map((option, optionIdx) => (
                <li key={option.value} className='flex items-center'>
                  <input
                    type='radio'
                    id={`disorder-${optionIdx}`}
                    onChange={() => {
                      applyStringFilter({
                        category: "disorder",
                        value: option.value
                      })
                    }}
                    checked={filter.disorder === option.value}
                    className='h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500'
                  />
                  <label
                    htmlFor={`disorder-${optionIdx}`}
                    className='ml-3 text-sm text-gray-600'>
                    {option.label}
                  </label>
                </li>
              ))}</ul>
            </div>
          </div>

          <div>
            <h3 className='font-medium'>Article Type</h3>
            <div className='pt-6'>
              <ul className='space-y-4'>{ARTICLE.options.map((option, optionIdx) => (
                <li key={option.value} className='flex items-center'>
                  <input
                    type='radio'
                    id={`article-${optionIdx}`}
                    onChange={() => {
                      applyStringFilter({
                        category: "article",
                        value: option.value
                      })
                    }}
                    checked={filter.article === option.value}
                    className='h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500'
                  />
                  <label
                    htmlFor={`article-${optionIdx}`}
                    className='ml-3 text-sm text-gray-600'>
                    {option.label}
                  </label>
                </li>
              ))}</ul>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col">
          <div className='flex items-center justify-between'>
            <div>
              {isLoading ? (
                <div></div>
              ) : (searches?.results && searches?.results.length > 0) ? (
                <h1 className="text-2xl lg:text-2xl font-bold">{searches?.count} Results</h1>
              ) : null}
            </div>

            <div className='flex flex-col md:hidden'>
              <Sheet>
                <SheetTrigger className='group -m-2 flex items-center p-2 border rounded-md'>
                  <Filter
                    aria-hidden='true'
                    className='h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-gray-500'
                  />
                  <span className='ml-2 text-sm font-medium text-gray-700 group-hover:text-gray-800'>
                    Filter By
                  </span>
                </SheetTrigger>
                <SheetContent className='flex w-3/6 flex-col pr-0 sm:max-w-lg overflow-y-auto'>
                  <SheetHeader className='mt-6 space-y-2.5 pr-6'>
                    <SheetTitle>
                      <div className='flex gap-4 lg:gap-6'>
                        <FilterButton name="Clear Filters" type="ghost" onClick={clearFilters} />
                        <FilterButton name="Save Filters" type="outline" />
                      </div>
                    </SheetTitle>
                  </SheetHeader>
                  <div>
                    <h3 className='font-medium'>Year(s)</h3>
                    <div className='pt-6'>
                      <ul className='space-y-4'>{YEAR.options.map((option, optionIdx) => (
                        <li key={option.value} className='flex items-center'>
                          <input
                            type='radio'
                            id={`year-${optionIdx}`}
                            onChange={() => {
                              applyStringFilter({
                                category: "year",
                                value: option.value
                              })
                            }}
                            checked={filter.year === option.value}
                            className='h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500'
                          />
                          <label
                            htmlFor={`year-${optionIdx}`}
                            className='ml-3 text-sm text-gray-600'>
                            {option.label}
                          </label>
                        </li>
                      ))}
                      </ul>
                      <div className='flex items-center mt-4 group cursor-pointer'>
                        <p className='text-sm text-muted-foreground group-hover:text-gray-900'>show more</p>
                        <ChevronDown className='ml-2 w-4 h-4 text-gray-400 group-hover:text-gray-500' />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className='font-medium'>Region(s)</h3>
                    <div className='pt-6'>
                      <ul className='space-y-4'>{REGIONS.options.map((option, optionIdx) => (
                        <li key={option.value} className='flex items-center'>
                          <input
                            type='radio'
                            id={`region-${optionIdx}`}
                            onChange={() => {
                              applyStringFilter({
                                category: "region",
                                value: option.value
                              })
                            }}
                            checked={filter.region === option.value}
                            className='h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500'
                          />
                          <label
                            htmlFor={`region-${optionIdx}`}
                            className='ml-3 text-sm text-gray-600'>
                            {option.label}
                          </label>
                        </li>
                      ))}</ul>
                    </div>
                  </div>
                  {/* 
                  <div>
                    <h3 className='font-medium'>Genomic Category</h3>
                    <div className='pt-6'>
                      <ul className='space-y-4'>{GENOMIC_CATEGORY.options.map((option, optionIdx) => (
                        <li key={option.value} className='flex items-center'>
                          <input
                            type='radio'
                            id={`genomic-${optionIdx}`}
                            onChange={() => {
                              applyStringFilter({
                                category: "genomic",
                                value: option.value
                              })
                            }}
                            checked={filter.genomic === option.value}
                            className='h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500'
                          />
                          <label
                            htmlFor={`genomic-${optionIdx}`}
                            className='ml-3 text-sm text-gray-600'>
                            {option.label}
                          </label>
                        </li>
                      ))}</ul>
                    </div>
                  </div> */}

                  <div>
                    <h3 className='font-medium'>Disorder(s)</h3>
                    <div className='pt-6'>
                      <ul className='space-y-4'>{DISORDERS.options.map((option, optionIdx) => (
                        <li key={option.value} className='flex items-center'>
                          <input
                            type='radio'
                            id={`disorder-${optionIdx}`}
                            onChange={() => {
                              applyStringFilter({
                                category: "disorder",
                                value: option.value
                              })
                            }}
                            checked={filter.disorder === option.value}
                            className='h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500'
                          />
                          <label
                            htmlFor={`disorder-${optionIdx}`}
                            className='ml-3 text-sm text-gray-600'>
                            {option.label}
                          </label>
                        </li>
                      ))}</ul>
                    </div>
                  </div>

                  <div>
                    <h3 className='font-medium'>Article Type</h3>
                    <div className='pt-6'>
                      <ul className='space-y-4'>{ARTICLE.options.map((option, optionIdx) => (
                        <li key={option.value} className='flex items-center'>
                          <input
                            type='radio'
                            id={`article-${optionIdx}`}
                            onChange={() => {
                              applyStringFilter({
                                category: "article",
                                value: option.value
                              })
                            }}
                            checked={filter.article === option.value}
                            className='h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500'
                          />
                          <label
                            htmlFor={`article-${optionIdx}`}
                            className='ml-3 text-sm text-gray-600'>
                            {option.label}
                          </label>
                        </li>
                      ))}</ul>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="flex flex-col gap-4 grow">
            {isLoading ? (
              new Array(10)
                .fill(null)
                .map((_, i) => <StudySkeleton key={i} />)
            ) : isError ? (
              <div className="flex items-center col-span-3">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <p className="flex text-sm font-medium text-gray-900">Something went wrong</p>
              </div>
            ) : (searches?.results && searches?.results.length > 0) ? (
              searches?.results?.map((study, i: number) => (
                <StudyList key={i} study={study} />
              ))
            ) : (
              <NotFound searchTerm={filter.searchTerm} />
            )}
          </div>

          <div>
            {(isError || (searches?.results && searches?.results.length <= 0)) ? (
              null
            ) : (
              <PaginationControls
                prevPage={prevPage}
                nextPage={nextPage}
                page={page}
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

export default SearchPage;
