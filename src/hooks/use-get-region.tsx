import { Region } from "../types/regionData";
import { useQuery } from "@tanstack/react-query"
import axios from "axios"



export const useGetRegion = () => {
    const query = useQuery<Region[], Error>({
        queryKey: ["region"],
        queryFn: async () => {
           const response = await axios.get("api/region")

            if(response.status === 500) {
                throw new Error("Failed to fetch study list")
            }

            // console.log(response);
 
            return response.data;
        },
    });

    return query;
}