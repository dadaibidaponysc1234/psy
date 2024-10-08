import { Genetics } from "../types/genetic";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useGetGenetics = () => {
  const query = useQuery<Genetics[], Error>({
    queryKey: ["genetics"],
    queryFn: async () => {
      const response = await axios.get(
        "https://algorithmxcomp.pythonanywhere.com/api/genetic-source-material-study-count/"
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
