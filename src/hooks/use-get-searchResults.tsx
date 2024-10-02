import { ApiResponse } from "@/types/studyViewList";
import { useQuery } from "@tanstack/react-query"
import axios from "axios"

interface SearchProps {
    searchTerm: string,
    year: string
    disorder: string
    region: string
    article: string
}


export const useGetSearchResult = ( debouncedSearchTerm: string, pageNum: number, { searchTerm, year, region, disorder, article }: SearchProps) => {
    const query = useQuery<ApiResponse, Error>({
        queryKey: ['searchResults', debouncedSearchTerm, year, region, disorder, article, pageNum],
        queryFn: async () => {
            const response = await axios.get(`api/search-study?title=${searchTerm}&year=${year}&research_regions=${region}&disorder=${disorder}&article_type=${article}&page=${pageNum}`)

            if (response.status === 500) {
                throw new Error("Failed to fetch search results")
            }

            return response.data;
        },
    });

    return query;
}