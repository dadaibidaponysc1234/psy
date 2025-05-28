import { DocumentState } from "@/lib/validators/document-validator"
import { BASE_URL } from "@/static"
import { ApiResponse } from "@/types/studyViewList"
import { useQuery } from "@tanstack/react-query"
import axios from "axios"

export const useGetSearchResult = (filters: DocumentState) => {
  console.log("=== API Call Debug ===")
  console.log("Filters being sent to API:", filters)
  console.log("API URL:", `${BASE_URL}/studies/`)
  const query = useQuery<ApiResponse, Error>({
    queryKey: ["searchResults", ...Object.values(filters)],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/studies/`, {
        params: filters,
      })
      console.log("API Response status:", response.status)
      console.log("API Response data:", response.data)

      if (response.status === 500) {
        throw new Error("Failed to fetch search results")
      }

      return response.data
    },
  })

  return query
}
