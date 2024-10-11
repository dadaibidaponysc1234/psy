import { useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import GraphSkeleton from "../skeletons/graph-skeleton";

const WordCloud = ({ data, isLoading, error }) => {
  console.log(data);
  useEffect(() => {
    if (!data || !data?.length > 0) return;
    const words = data.map((item) => ({
      text: item.text,
      size: item.size / 2, // Reduce the size for better visibility
    }));

    // Create the word cloud layout
    const layout = d3.layout
      .cloud()
      .size([800, 400])
      .words(words)
      .padding(5) // Space between words
      .rotate(0) // Remove rotation
      .fontSize((d) => d.size) // Font size based on data
      .on("end", draw); // Call draw function when layout is ready

    // Start the layout
    layout.start();

    // Draw the word cloud
    function draw(words) {
      d3.select("#wordCloud").selectAll("*").remove(); // Clear previous drawings
      d3.select("#wordCloud")
        .append("g")
        .attr("transform", "translate(400,200)") // Center the words
        .selectAll("text")
        .data(words)
        .enter()
        .append("text")
        .attr("class", "word")
        .style("font-size", (d) => `${d.size}px`)
        .style(
          "fill",
          () => d3.schemeCategory10[Math.floor(Math.random() * 10)]
        ) // Random colors
        .attr("text-anchor", "middle")
        .attr("transform", (d) => `translate(${d.x},${d.y})`) // Remove rotation from the transformation
        .text((d) => d.text);
    }
  }, [data]);
  return (
    <Card>
      <CardContent className="p-5 overflow-auto flex items-center justify-center">
        {isLoading ? (
          <GraphSkeleton />
        ) : (
          <div
            id="wordCloudContainer"
            style={{
              width: 800,
              height: 400,
            }}
          >
            <svg id="wordCloud" width="800" height="400"></svg>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WordCloud;
