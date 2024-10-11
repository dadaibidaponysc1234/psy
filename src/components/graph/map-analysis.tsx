import MapStudyCount from "./map";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const MapAnalysis = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["map"],
    queryFn: async () => {
      const res = await axios.get(
        "http://algorithmxcomp.pythonanywhere.com/api/research-region-study-count/"
      );
      return res.data;
    },
  });

  return <MapStudyCount data={data} isLoading={isLoading} error={error} />;
};

export default MapAnalysis;
