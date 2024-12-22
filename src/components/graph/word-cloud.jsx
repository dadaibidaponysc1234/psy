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
    if (!data || data.length === 0) return

    const container = document.getElementById("wordCloudContainer")
    const width = container.offsetWidth || 400 // Default width
    const height = container.offsetHeight || 300 // Default height

    const words = data.map((item) => ({
      text: item.text,
      size: Math.max(item.size / 2, 10), // Ensure a minimum font size
    }))

    // Create word cloud layout
    const layout = d3.layout
      .cloud()
      .size([width, height])
      .words(words)
      .padding(5) // Space between words
      .rotate(0) // Remove rotation
      .fontSize((d) => d.size)
      .on("end", draw)

    layout.start()

    function draw(words) {
      d3.select("#wordCloud").selectAll("*").remove() // Clear previous content
      const svg = d3
        .select("#wordCloud")
        .attr("viewBox", `0 0 ${width} ${height}`) // Match dimensions
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`)

      svg
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
              className="min-h-0 w-full sm:min-h-80"
            >
              <svg id="wordCloud" className="h-full w-full"></svg>
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
