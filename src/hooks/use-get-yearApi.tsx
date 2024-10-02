import { StudyCount } from "@/types/yearApi";
import { useQuery } from "@tanstack/react-query"
import axios from "axios"



export const useGetYears = () => {
    const query = useQuery<StudyCount[], Error>({
        queryKey: ["year"],
        queryFn: async () => {
           const response = await axios.get("api/year")

            if(response.status === 500) {
                throw new Error("Failed to fetch study list")
            }

            // console.log(response);
 
            return response.data;
        },
    });

    return query;
}