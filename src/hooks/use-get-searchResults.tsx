import { DocumentState } from "@/lib/validators/document-validator";
import { ApiResponse } from "@/types/studyViewList";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useGetSearchResult = (
  debouncedSearchTerm: string,
  pageNum: number,
  filters: DocumentState
) => {
  const { searchTerm, region, article } = filters;
  const query = useQuery<ApiResponse, Error>({
    queryKey: [
      "searchResults",
      debouncedSearchTerm,
      pageNum,
      ...Object.values(filters),
    ],
    queryFn: async () => {
      const response = await axios.get(`api/search-study`, {
        params: {
          ...filters,
          title: searchTerm,
          research_regions: region,
          article_type: article,
          page: pageNum,
        },
      });

      if (response.status === 500) {
        throw new Error("Failed to fetch search results");
      }

      return response.data;
    },
  });

  return query;
};
