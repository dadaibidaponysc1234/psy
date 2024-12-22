import FileSaver from "file-saver"
import { useCallback, useEffect, useId } from "react"
import { Card, CardContent } from "../ui/card"
import GraphSkeleton from "../skeletons/graph-skeleton"
import { useGenerateImage } from "recharts-to-png"
import { Button } from "../ui/button"
import { CloudDownloadIcon } from "lucide-react"

const WordCloud = ({ data, isLoading, error }) => {
  const uniqueId = useId()
  const [getDivJpeg, { ref: imageRef, isLoading: isDownloadLoading }] =
    useGenerateImage({
      quality: 1,
      type: "image/jpeg",
    })
  const chartId = `chart-${uniqueId.replace(/:/g, "")}`

  const handleDownload = useCallback(async () => {
    const jpeg = await getDivJpeg()
    if (jpeg) {
      FileSaver.saveAs(jpeg, "graph.jpeg")
    }
  }, [getDivJpeg])

  useEffect(() => {
    if (!data || !data?.length > 0) return
    const words = data.map((item) => ({
      text: item.text,
      size: item.size / 2, // Reduce the size for better visibility
    }))

    // Create the word cloud layout
    const layout = d3.layout
      .cloud()
      .size([800, 400])
      .words(words)
      .padding(5) // Space between words
      .rotate(0) // Remove rotation
      .fontSize((d) => d.size) // Font size based on data
      .on("end", draw) // Call draw function when layout is ready

    // Start the layout
    layout.start()

    // Draw the word cloud
    function draw(words) {
      d3.select("#wordCloud").selectAll("*").remove() // Clear previous drawings
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
        .text((d) => d.text)
    }
  }, [data])
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center overflow-auto p-5">
        {isLoading ? (
          <GraphSkeleton />
        ) : (
          <>
            <div
              data-chart={chartId}
              ref={imageRef}
              id="wordCloudContainer"
              // style={{
              //   width: 800,
              //   height: 400,
              // }}
              className="h-full w-full"
            >
              <svg id="wordCloud" width="800" height="400"></svg>
            </div>
            <Button
              onClick={() => handleDownload()}
              loading={isDownloadLoading}
              variant={"ghost"}
              className="mt-8 h-fit w-[180px] gap-2 border text-sm"
            >
              <CloudDownloadIcon strokeWidth={1.5} />
              Download Graph
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default WordCloud
