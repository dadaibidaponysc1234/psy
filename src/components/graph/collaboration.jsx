// eslint-disable-next-line
import { useQuery } from "@tanstack/react-query";
import Chord from "./chord";
import axios from "axios";

const Collaboration = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["collaboration"],
    queryFn: async () => {
      const res = await axios.get(
        "https://algorithmxcomp.pythonanywhere.com/api/country-collaboration/"
      );
      return res.data;
    },
  });

  return <Chord data={data} isLoading={isLoading} error={error} />;
};

export default Collaboration;
