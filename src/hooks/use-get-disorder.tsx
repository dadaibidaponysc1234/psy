import { Region } from "../types/disorderData";
import { useQuery } from "@tanstack/react-query"
import axios from "axios"



export const useGetDisorder = () => {
    const query = useQuery<Region[], Error>({
        queryKey: ["region"],
        queryFn: async () => {
           const response = await axios.get("api/disorder")

            if(response.status === 500) {
                throw new Error("Failed to fetch study list")
            }

            // console.log(response);
 
            return response.data;
        },
    });

    return query;
}