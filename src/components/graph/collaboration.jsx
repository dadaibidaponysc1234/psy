// eslint-disable-next-line
import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { Card, CardContent } from "../ui/card";
import GraphSkeleton from "../skeletons/graph-skeleton";
import Chord from "./chord";

const Collaboration = () => {
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({});

  // Fetch data on mount
  useEffect(() => {
    setLoading(true);
    fetch(
      "https://algorithmxcomp.pythonanywhere.com/api/country-collaboration/"
      // "http://127.0.0.1:8000/api/country-collaboration/"
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((fetchedData) => {
        setData(fetchedData);
      })
      .catch((fetchError) => {
        console.error("Error fetching data:", fetchError);
        setError("Failed to load data. Please try again later.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return <Chord data={data} isLoading={isLoading} error={error} />;
};

export default Collaboration;
