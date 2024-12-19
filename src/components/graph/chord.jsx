import FileSaver from "file-saver";
import { useRef, useEffect, useId, useCallback } from "react";
import * as d3 from "d3";
import GraphSkeleton from "../skeletons/graph-skeleton";
import { Card, CardContent } from "../ui/card";
import { useGenerateImage } from "recharts-to-png";
import { Button } from "../ui/button";
import { CloudDownloadIcon } from "lucide-react";

const Chord = ({ data, isLoading, error }) => {
  const dimensions = { width: 800, height: 800 };

  const svgContainerRef = useRef(null);
  const legendContainerRef = useRef(null);

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
    if (!data || !data.matrix || !data.countries || !svgContainerRef.current) {
      return;
    }

    // Clear previous SVG and legend
    d3.select(svgContainerRef.current).selectAll("*").remove();
    d3.select(legendContainerRef.current).selectAll("*").remove();

    // Define regions data
    const regions = {
      "NORTH AMERICA": [
        "UNITED STATES",
        "CANADA",
        "MEXICO",
        "GREENLAND",
        "CUBA",
        "HAITI",
        "DOMINICAN REPUBLIC",
        "JAMAICA",
        "PUERTO RICO",
      ],
      "SOUTH AMERICA": [
        "BRAZIL",
        "ARGENTINA",
        "CHILE",
        "PERU",
        "COLOMBIA",
        "VENEZUELA",
        "ECUADOR",
        "BOLIVIA",
        "PARAGUAY",
        "URUGUAY",
        "GUYANA",
        "SURINAME",
      ],
      EUROPE: [
        "UNITED KINGDOM",
        "GERMANY",
        "FRANCE",
        "ITALY",
        "SPAIN",
        "SWEDEN",
        "NETHERLANDS",
        "BELGIUM",
        "NORWAY",
        "DENMARK",
        "FINLAND",
        "IRELAND",
        "PORTUGAL",
        "POLAND",
        "AUSTRIA",
        "SWITZERLAND",
        "CZECH REPUBLIC",
        "HUNGARY",
        "GREECE",
        "ICELAND",
        "LUXEMBOURG",
        "MONACO",
        "SLOVAKIA",
        "SLOVENIA",
        "BOSNIA AND HERZEGOVINA",
        "CROATIA",
        "SERBIA",
        "MONTENEGRO",
        "NORTH MACEDONIA",
        "BULGARIA",
        "ROMANIA",
        "ALBANIA",
        "ESTONIA",
        "LATVIA",
        "LITHUANIA",
        "BELARUS",
        "RUSSIA",
        "UKRAINE",
        "MOLDOVA",
        "KOSOVO",
        "MALTA",
        "CYPRUS",
      ],
      ASIA: [
        "CHINA",
        "JAPAN",
        "INDIA",
        "SAUDI ARABIA",
        "SOUTH KOREA",
        "NORTH KOREA",
        "VIETNAM",
        "THAILAND",
        "PHILIPPINES",
        "INDONESIA",
        "MALAYSIA",
        "SINGAPORE",
        "MYANMAR",
        "LAOS",
        "CAMBODIA",
        "NEPAL",
        "BHUTAN",
        "BANGLADESH",
        "SRI LANKA",
        "MALDIVES",
        "PAKISTAN",
        "AFGHANISTAN",
        "IRAN",
        "IRAQ",
        "SYRIA",
        "LEBANON",
        "ISRAEL",
        "JORDAN",
        "YEMEN",
        "OMAN",
        "UNITED ARAB EMIRATES",
        "KUWAIT",
        "QATAR",
        "BAHRAIN",
        "TAIWAN",
        "MONGOLIA",
        "KAZAKHSTAN",
        "UZBEKISTAN",
        "TURKMENISTAN",
        "KYRGYZSTAN",
        "TAJIKISTAN",
        "ARMENIA",
        "AZERBAIJAN",
        "GEORGIA",
      ],
      OCEANIA: [
        "AUSTRALIA",
        "NEW ZEALAND",
        "FIJI",
        "PAPUA NEW GUINEA",
        "SOLOMON ISLANDS",
        "VANUATU",
        "SAMOA",
        "TONGA",
        "KIRIBATI",
        "TUVALU",
        "NAURU",
        "PALAU",
        "MARSHALL ISLANDS",
        "MICRONESIA",
      ],
      "NORTHERN AFRICA": [
        "MOROCCO",
        "EGYPT",
        "TUNISIA",
        "ALGERIA",
        "LIBYA",
        "SUDAN",
      ],
      "EASTERN AFRICA": [
        "KENYA",
        "UGANDA",
        "RWANDA",
        "SEYCHELLES",
        "TANZANIA",
        "SOMALIA",
        "ETHIOPIA",
        "ERITREA",
        "DJIBOUTI",
        "MADAGASCAR",
        "MAURITIUS",
        "COMOROS",
      ],
      "MIDDLE AFRICA": [
        "CENTRAL AFRICAN REPUBLIC",
        "DEMOCRATIC REPUBLIC OF THE CONGO",
        "GABON",
        "CONGO",
        "CHAD",
        "EQUATORIAL GUINEA",
        "SÃO TOMÉ AND PRÍNCIPE",
        "ANGOLA",
      ],
      "WESTERN AFRICA": [
        "GHANA",
        "NIGERIA",
        "SENEGAL",
        "MALI",
        "BENIN",
        "TOGO",
        "NIGER",
        "BURKINA FASO",
        "GUINEA",
        "SIERRA LEONE",
        "LIBERIA",
        "IVORY COAST",
        "CAPE VERDE",
        "GAMBIA",
        "GUINEA-BISSAU",
        "MAURITANIA",
      ],
      "SOUTHERN AFRICA": [
        "SOUTH AFRICA",
        "NAMIBIA",
        "BOTSWANA",
        "ZIMBABWE",
        "ZAMBIA",
        "MALAWI",
        "MOZAMBIQUE",
        "LESOTHO",
        "ESWATINI",
      ],
    };

    const africanRegions = [
      "NORTHERN AFRICA",
      "EASTERN AFRICA",
      "MIDDLE AFRICA",
      "WESTERN AFRICA",
      "SOUTHERN AFRICA",
    ];

    const customColors = [
      "#17becf",
      "#8c564b",
      "#e377c2",
      "#7f7f7f",
      "#bcbd22",
      "#9467bd",
      "#ff7f0e",
      "#1f77b4",
      "#d62728",
      "#2ca02c",
    ];

    const regionColors = d3
      .scaleOrdinal()
      .domain(Object.keys(regions))
      .range(customColors);

    const countryToRegion = {};
    Object.entries(regions).forEach(([region, countries]) => {
      countries.forEach((country) => {
        countryToRegion[country] = region;
      });
    });

    let matrix = data.matrix;
    let countries = data.countries;

    if (!matrix.length) {
      d3.select(svgContainerRef.current).append("p").text("No data available");
      return;
    }

    // Sort countries based on regions
    const sortedCountries = [];
    Object.keys(regions).forEach((region) => {
      regions[region].forEach((country) => {
        if (countries.includes(country)) {
          sortedCountries.push(country);
        }
      });
    });

    const sortedMatrix = sortedCountries.map((_, i) =>
      sortedCountries.map(
        (_, j) =>
          matrix[countries.indexOf(sortedCountries[i])][
            countries.indexOf(sortedCountries[j])
          ]
      )
    );

    countries = sortedCountries;
    matrix = sortedMatrix;

    // Filter matrix for African regions
    const africaMatrix = matrix.map((row, i) =>
      row.map((value, j) => {
        const isAfricaI = africanRegions.includes(
          countryToRegion[countries[i]]
        );
        const isAfricaJ = africanRegions.includes(
          countryToRegion[countries[j]]
        );
        return isAfricaI && isAfricaJ
          ? value
          : isAfricaI || isAfricaJ
          ? value
          : 0;
      })
    );

    const reversedAfricaMatrix = africaMatrix.map((row, i) =>
      row.map((value, j) => {
        const isAfricaI = africanRegions.includes(
          countryToRegion[countries[i]]
        );
        return isAfricaI &&
          !africanRegions.includes(countryToRegion[countries[j]])
          ? africaMatrix[j][i]
          : value;
      })
    );

    const width = dimensions.width;
    const height = dimensions.height;
    const outerRadius = Math.min(width, height) / 2 - 100;
    const innerRadius = outerRadius - 1.5;

    // Create SVG
    const svg = d3
      .select(svgContainerRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr(
        "viewBox",
        "0 0 " + Math.min(width, height) + " " + Math.min(width, height)
      )
      .attr("preserveAspectRatio", "xMinYMin")
      .append("g")
      .attr(
        "transform",
        "translate(" +
          Math.min(width, height) / 2 +
          "," +
          Math.min(width, height) / 2 +
          ")"
      );

    const chord = d3.chord().padAngle(0.05).sortSubgroups(d3.descending);
    const chords = chord(reversedAfricaMatrix);
    const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
    const ribbon = d3.ribbon().radius(innerRadius - 5);

    // Draw groups
    const group = svg
      .append("g")
      .selectAll("g")
      .data(chords.groups)
      .enter()
      .append("g");

    group
      .append("path")
      .style("fill", (d) => regionColors(countryToRegion[countries[d.index]]))
      .style("stroke", (d) =>
        d3.rgb(regionColors(countryToRegion[countries[d.index]])).darker()
      )
      .attr("d", arc);

    group
      .append("text")
      .each(function (d) {
        d.angle = (d.startAngle + d.endAngle) / 2;
      })
      .attr("dy", ".35em")
      .attr(
        "transform",
        (d) => `
          rotate(${(d.angle * 180) / Math.PI - 90})
          translate(${outerRadius + 10})
          ${d.angle > Math.PI ? "rotate(180)" : ""}
        `
      )
      .style("text-anchor", (d) => (d.angle > Math.PI ? "end" : "start"))
      .text((d) => countries[d.index])
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .style("fill", "#000");

    // Draw ribbons
    svg
      .append("g")
      .selectAll("path")
      .data(chords)
      .enter()
      .append("path")
      .attr("d", ribbon)
      .style("fill", (d) =>
        regionColors(countryToRegion[countries[d.target.index]])
      )
      .style("stroke", (d) =>
        d3
          .rgb(regionColors(countryToRegion[countries[d.target.index]]))
          .darker()
      )
      .style("stroke-width", 0.1)
      .style("opacity", 0.6);

    // Draw Legend
    const legendData = Object.keys(regions);
    const legendHeight = legendData.length * 20;

    const legendSvg = d3
      .select(legendContainerRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", legendHeight);

    const legend = legendSvg
      .selectAll("g")
      .data(legendData)
      .enter()
      .append("g")
      .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 15)
      .attr("height", 15)
      .style("fill", (d) => regionColors(d));

    legend
      .append("text")
      .attr("x", 20)
      .attr("y", 12)
      .text((d) => d)
      .style("font-size", "12px")
      .style("alignment-baseline", "middle");
  }, [data, dimensions.width, dimensions.height]);

  return (
    <Card>
      <CardContent className="p-5">
        {isLoading ? (
          <GraphSkeleton />
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <>
            <div
              data-chart={chartId}
              ref={imageRef}
              className="flex flex-col-reverse lg:flex-row justify-between items-start"
            >
              <div
                ref={legendContainerRef}
                style={{ padding: "20px", flex: "0 0 200px" }}
                className="w-full lg:w-1/4"
              ></div>
              <div
                ref={svgContainerRef}
                style={{ flex: "1 1 auto", minHeight: "500px" }}
                className="w-full lg:w-3/4"
              ></div>
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

export default Chord;
