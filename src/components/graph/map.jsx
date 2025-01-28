import { useEffect } from "react";
import html2canvas from "html2canvas";
import { Card, CardContent } from "../ui/card";
import GraphSkeleton from "../skeletons/graph-skeleton";
import { CloudDownloadIcon } from "lucide-react";

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

  // Function to download the map
  const downloadMap = async () => {
    const element = document.getElementById("map");
    if (element) {
      const canvas = await html2canvas(element, { useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = "map_study_count.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  return (
    <Card>
      <CardContent className="p-5 overflow-auto flex flex-col items-center">
        {isLoading ? (
          <GraphSkeleton />
        ) : (
          <>
            {/* Map Container */}
            <div
              id="map"
              style={{
                width: "100%",
                height: 600,
              }}
            ></div>

            {/* Legend and Download Button */}
            <div className="flex flex-col items-center">
              {/* Legend */}
              <div className="flex flex-row items-center gap-4 mb-4">
                <div className="flex items-center">
                  <span
                    className="block w-4 h-4 rounded-sm"
                    style={{ backgroundColor: "#440154" }}
                  ></span>
                  <span className="ml-2 text-xs">Low</span>
                </div>
                <div className="flex items-center">
                  <span
                    className="block w-4 h-4 rounded-sm"
                    style={{ backgroundColor: "#3B528B" }}
                  ></span>
                  <span className="ml-2 text-xs">Medium</span>
                </div>
                <div className="flex items-center">
                  <span
                    className="block w-4 h-4 rounded-sm"
                    style={{ backgroundColor: "#5DC863" }}
                  ></span>
                  <span className="ml-2 text-xs">High</span>
                </div>
                <div className="flex items-center">
                  <span
                    className="block w-4 h-4 rounded-sm"
                    style={{ backgroundColor: "#FDE725" }}
                  ></span>
                  <span className="ml-2 text-xs">Very High</span>
                </div>
              </div>

              {/* Download Button */}
              <button
                className="px-4 py-2 flex items-center justify-center rounded-md h-fit w-[200px] gap-2 border text-sm font-bold sm:mt-8"
                onClick={downloadMap}
              >
                <CloudDownloadIcon strokeWidth={2.5} className="w-4 h-4" />
                <span>Download Map</span>
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MapStudyCount;
