import FileSaver from "file-saver";
import { useCallback, useEffect, useId } from "react";
import { Card, CardContent } from "../ui/card";
import GraphSkeleton from "../skeletons/graph-skeleton";
import { useGenerateImage } from "recharts-to-png";
import { Button } from "../ui/button";
import { CloudDownloadIcon } from "lucide-react";

const WordCloud = ({ data, isLoading, error }) => {
  const uniqueId = useId();
  const [getDivJpeg, { ref: imageRef, isLoading: isDownloadLoading }] =
    useGenerateImage({
      quality: 1,
      type: "image/jpeg",
    });
  const chartId = `chart-${uniqueId.replace(/:/g, "")}`;

  const handleDownload = useCallback(async () => {
    const jpeg = await getDivJpeg();
    if (jpeg) {
      FileSaver.saveAs(jpeg, "graph.jpeg");
    }
  }, [getDivJpeg]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const container = document.getElementById("wordCloudContainer");
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    const words = data.map((item) => ({
      text: item.text,
      size: item.size / 2, // Reduce size for better visibility
    }));

    // Create word cloud layout
    const layout = d3.layout
      .cloud()
      .size([width, height])
      .words(words)
      .padding(5)
      .rotate(0)
      .fontSize((d) => d.size)
      .on("end", draw);

    layout.start();

    function draw(words) {
      d3.select("#wordCloud").selectAll("*").remove(); // Clear previous content
      d3.select("#wordCloud")
        .attr("viewBox", `0 0 ${width} ${height}`) // Set viewBox to match dimensions
        .attr("preserveAspectRatio", "xMidYMid meet") // Maintain aspect ratio
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`)
        .selectAll("text")
        .data(words)
        .enter()
        .append("text")
        .style("font-size", (d) => `${d.size}px`)
        .style(
          "fill",
          () => d3.schemeCategory10[Math.floor(Math.random() * 10)]
        )
        .attr("text-anchor", "middle")
        .attr("transform", (d) => `translate(${d.x},${d.y})`)
        .text((d) => d.text);
    }
  }, [data]);

  return (
    <Card>
      <CardContent className="p-5 overflow-auto flex flex-col items-center justify-center">
        {isLoading ? (
          <GraphSkeleton />
        ) : (
          <>
            <div
              data-chart={chartId}
              ref={imageRef}
              id="wordCloudContainer"
              className="w-full sm:min-h-80 min-h-0"
            >
              <svg id="wordCloud" className="w-full h-full"></svg>
            </div>
            <Button
              onClick={() => handleDownload()}
              loading={isDownloadLoading}
              variant={"ghost"}
              className="h-fit w-[180px] text-sm border mt-8 gap-2"
            >
              <CloudDownloadIcon strokeWidth={1.5} />
              Download Graph
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WordCloud;
