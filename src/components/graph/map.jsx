import { useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import GraphSkeleton from "../skeletons/graph-skeleton";

const MapStudyCount = ({ data, isLoading, error }) => {
  useEffect(() => {
    if (!data || data.length === 0) return;
    // Extract country names and study counts from the API data
    const locations = data.map((d) => d.countries__name);
    const studyCounts = data.map((d) => d.study_count);

    // Define the trace for the choropleth map
    const trace = {
      type: "choropleth",
      locationmode: "country names", // Mapping by country names
      locations: locations, // The country names
      z: studyCounts, // Study counts (color intensity)
      text: locations, // Country names for hover text
      colorscale: "Viridis", // Color scale
      autocolorscale: false,
      reversescale: true,
      colorbar: {
        title: "Study Count",
      },
      hoverinfo: "location+z", // Display both the country name and study count on hover
      hovertemplate: "%{location}: %{z} studies<extra></extra>", // Custom hover format
    };

    // Layout for the map
    const layout = {
      title: "Study Count per African Country",
      geo: {
        scope: "africa", // Focus on Africa
        showframe: false,
        showcoastlines: true,
        coastlinecolor: "black",
        projection: {
          type: "mercator", // Projection type for map
        },
      },
    };

    // Render the map
    Plotly.newPlot("map", [trace], layout);
  }, [data]);
  return (
    <Card>
      <CardContent className="p-5 overflow-auto flex items-center justify-center">
        {isLoading ? (
          <GraphSkeleton />
        ) : (
          <div
            id="map"
            style={{
              width: "100%",
              height: 600,
            }}
          ></div>
        )}
      </CardContent>
    </Card>
  );
};

export default MapStudyCount;
