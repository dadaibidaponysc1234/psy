import { getSuggestion } from "@/action/suggestion";
import { Suggestion } from "@/types/suggestion";
import { useQuery } from "@tanstack/react-query"


// interface SearchProps {
//     searchTerm: string,
// }


export const useGetSuggestion = ( searchTerm: string) => {
    const query = useQuery<Suggestion, Error>({
        queryKey: ['suggestion', searchTerm],
        queryFn: () => getSuggestion(searchTerm)
    });

    return query;
}