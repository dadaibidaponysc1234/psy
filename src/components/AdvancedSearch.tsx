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
}: {
  setFilters: React.Dispatch<SetStateAction<DocumentState>>;
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
  });

  const { data: disorders, isLoading: isDisorderLoading } = useQuery({
    queryKey: ["disorders"],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/disorders`);
      return response.data;
    },
  });

  const { data: articleTypes, isLoading: isArticleTypesLoading } = useQuery({
    queryKey: ["article-types"],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/articletypes`);
      return response.data;
    },
  });

  const {
    data: biologicalModilities,
    isLoading: isBiologicalModalitiesLoading,
  } = useQuery({
    queryKey: ["biological-modalities"],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/biologicalmodalities`);
      return response.data;
    },
  });

  const { data: geneticSources, isLoading: isGeneticSourcesLoading } = useQuery(
    {
      queryKey: ["genetic-sources"],
      queryFn: async () => {
        const response = await axios.get(`${BASE_URL}/geneticsourcematerials`);
        return response.data;
      },
    }
  );

  function onSubmit(values: DocumentState) {
    setFilters(values);
  }

  useEffect(() => {
    if (!!clearFilters) {
      form.reset();
    }
  }, [clearFilters]);

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
          name="article"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="">Article Type</FormLabel>
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
                        disorder: { id: number; article_name: string },
                        index: number
                      ) => (
                        <SelectItem key={index} value={disorder.article_name}>
                          {disorder.article_name}
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
          name="region"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="">Region</FormLabel>
              <FormControl>
                <Select
                  {...field}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger aria-label="Select a region">
                    <SelectValue placeholder="Select region" />
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
          name="genetic_source"
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
                        disorder: { id: number; material_type: string },
                        index: number
                      ) => (
                        <SelectItem key={index} value={disorder.material_type}>
                          {disorder.material_type}
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
          name="modalities"
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
                    <SelectValue placeholder="Select biological modality" />
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
