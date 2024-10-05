import { BiologicalRecord } from "../types/biological";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useGetBiological = () => {
  const query = useQuery<BiologicalRecord[], Error>({
    queryKey: ["biological"],
    queryFn: async () => {
      const response = await axios.get(
        "https://algorithmxcomp.pythonanywhere.com/api/biological-modality-study-count/"
      );

      if (response.status === 500) {
        throw new Error("Failed to fetch study list");
      }

      // console.log(response);

      return response.data;
    },
  });

  return query;
};
