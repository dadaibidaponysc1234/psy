import WordCloud from "./word-cloud";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const WordCloudAnalysis = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["word-cloud"],
    queryFn: async () => {
      const res = await axios.get(
        "https://algorithmxcomp.pythonanywhere.com/api/word-cloud/"
      );
      return res.data;
    },
  });

  return <WordCloud data={data ?? []} isLoading={isLoading} error={error} />;
};

export default WordCloudAnalysis;
