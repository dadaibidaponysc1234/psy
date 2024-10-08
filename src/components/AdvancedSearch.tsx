import { Button } from "@/components/ui/button";
import {
  DocumentFilterValidator,
  DocumentState,
} from "@/lib/validators/document-validator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { SetStateAction, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "@/static";
import axios from "axios";

const AdvancedSearch = ({
  filters,
  setFilters,
  clearFilters,
  setClearFilters,
}: {
  setFilters: React.Dispatch<SetStateAction<DocumentState>>;
  setClearFilters: React.Dispatch<SetStateAction<boolean>>;
  filters: DocumentState;
  clearFilters: boolean;
}) => {
  const form = useForm<DocumentState>({
    resolver: zodResolver(DocumentFilterValidator),
    values: filters,
  });

  const { data: countries, isLoading: isCountriesLoading } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/countries`);
      return response.data;
    },
    refetchOnMount: false,
  });

  const { data: disorders, isLoading: isDisorderLoading } = useQuery({
    queryKey: ["search-disorders"],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/disorders`);
      return response.data;
    },
    refetchOnMount: false,
  });

  const { data: articleTypes, isLoading: isArticleTypesLoading } = useQuery({
    queryKey: ["search-article-types"],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/article-types`);
      return response.data;
    },
    refetchOnMount: false,
  });

  const {
    data: biologicalModilities,
    isLoading: isBiologicalModalitiesLoading,
  } = useQuery({
    queryKey: ["search-biological-modalities"],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/biological-modalities`);
      return response.data;
    },
    refetchOnMount: false,
  });

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

  function onSubmit(values: DocumentState) {
    setFilters(values);
  }

  useEffect(() => {
    if (!!clearFilters) {
      form.reset();
      setClearFilters(false);
    }
  }, [clearFilters, form, setClearFilters]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="gap-4 grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1"
      >
        <FormField
          control={form.control}
          name="keyword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="">Keywords</FormLabel>
              <FormControl>
                <Input placeholder="In the Article" {...field} className="" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="article_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Article Type</FormLabel>
              <FormControl>
                <Select
                  {...field}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger aria-label="Select an article type">
                    <SelectValue placeholder="Select article type" />
                  </SelectTrigger>
                  <SelectContent align="end" className="rounded-xl">
                    {(articleTypes ?? []).map(
                      (
                        articleType: { id: number; article_name: string },
                        index: number
                      ) => (
                        <SelectItem
                          key={index}
                          value={articleType.article_name}
                        >
                          {articleType.article_name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="research_regions"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="">Country</FormLabel>
              <FormControl>
                <Select
                  {...field}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger aria-label="Select a country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent align="end" className="rounded-xl">
                    {(countries ?? []).map(
                      (
                        country: { id: number; name: string },
                        index: number
                      ) => (
                        <SelectItem key={index} value={country.name}>
                          {country.name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="disorder"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="">Disorder</FormLabel>
              <FormControl>
                <Select
                  {...field}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger aria-label="Select a disorder">
                    <SelectValue placeholder="Select disorder" />
                  </SelectTrigger>
                  <SelectContent align="end" className="rounded-xl">
                    {(disorders ?? []).map(
                      (
                        disorder: { id: number; disorder_name: string },
                        index: number
                      ) => (
                        <SelectItem key={index} value={disorder.disorder_name}>
                          {disorder.disorder_name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="impact_factor_min"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="">Minimum Impact factor</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Impact factor"
                  {...field}
                  className=""
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="impact_factor_max"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="">Maximum Impact factor</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Impact factor"
                  {...field}
                  className=""
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="genetic_source_materials"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="">Genetic Source</FormLabel>
              <FormControl>
                <Select
                  {...field}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger aria-label="Select a genetic source">
                    <SelectValue placeholder="Select genetic source" />
                  </SelectTrigger>
                  <SelectContent align="end" className="rounded-xl">
                    {(geneticSources ?? []).map(
                      (
                        source: { id: number; material_type: string },
                        index: number
                      ) => (
                        <SelectItem key={index} value={source.material_type}>
                          {source.material_type}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="biological_modalities"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="">Biological Mordalities</FormLabel>
              <FormControl>
                <Select
                  {...field}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger aria-label="Select a biological modality">
                    <SelectValue
                      defaultValue={""}
                      placeholder="Select biological modality"
                    />
                  </SelectTrigger>
                  <SelectContent align="end" className="rounded-xl">
                    {(biologicalModilities ?? []).map(
                      (
                        disorder: { id: number; modality_name: string },
                        index: number
                      ) => (
                        <SelectItem key={index} value={disorder.modality_name}>
                          {disorder.modality_name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="">Year</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="2020"
                  {...field}
                  className=""
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="year_min"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="">Start Year</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="2020"
                  {...field}
                  className=""
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="year_max"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="">End Year</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="2020"
                  {...field}
                  className=""
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="mt-auto"
          loading={
            isCountriesLoading ||
            isDisorderLoading ||
            isArticleTypesLoading ||
            isBiologicalModalitiesLoading ||
            isGeneticSourcesLoading
          }
        >
          Search
        </Button>
      </form>
    </Form>
  );
};

export default AdvancedSearch;
