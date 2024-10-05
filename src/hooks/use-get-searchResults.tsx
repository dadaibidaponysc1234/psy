import { DocumentState } from "@/lib/validators/document-validator";
import { BASE_URL } from "@/static";
import { ApiResponse } from "@/types/studyViewList";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useGetSearchResult = (filters: DocumentState) => {
  const query = useQuery<ApiResponse, Error>({
    queryKey: ["searchResults", ...Object.values(filters)],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/studies`, {
        params: filters,
      });

      if (response.status === 500) {
        throw new Error("Failed to fetch search results");
      }

      return response.data;
    },
  });

  return query;
};
