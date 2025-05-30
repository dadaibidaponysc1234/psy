import { DocumentState } from "@/lib/validators/document-validator"
import { BASE_URL } from "@/static"
import { useQuery } from "@tanstack/react-query"
import axios from "axios"

export const useGetAllStudies = () => {
  const query = useQuery({
    queryKey: ["allStudies"],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/studies/`)
      return response.data
    },
    staleTime: 1000 * 60 * 5, // cache for 5 minutes
  })

  return query
}
