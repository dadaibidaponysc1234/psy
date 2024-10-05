// eslint

import React, { useEffect, useState } from "react";
import * as d3 from "d3";
import { Card, CardContent } from "../ui/card";
import GraphSkeleton from "../skeletons/graph-skeleton";

const Chord = () => {
  const [isLoading, setLoading] = useState(false);
  useEffect(() => {
    // console.log("Chord component is rendering");
    // Clear the svg container before rendering to prevent multiple renders
    d3.select("#svgContainer").selectAll("*").remove();
    d3.select("#legendContainer").selectAll("*").remove();

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

    // setLoading(true);

    fetch(
      "https://algorithmxcomp.pythonanywhere.com/api/country-collaboration/"
      // "http://127.0.0.1:8000/api/country-collaboration/"
    )
      .then((response) => response.json())
      .then((data) => {
        d3.select("#chart").selectAll("*").remove();
        let matrix = data.matrix;
        let countries = data.countries;

        if (!matrix.length) {
          document.getElementById("chart").innerHTML =
            "<p>No data available</p>";
          return;
        }

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

        const width = 700;
        const height = 700;
        const outerRadius = Math.min(width, height) / 2 - 200;
        const innerRadius = outerRadius - 1.5;

        const svg = d3
          .select("#svgContainer")
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .append("g")
          .attr("transform", `translate(${width / 2}, ${height / 2})`);

        const chord = d3.chord().padAngle(0.05).sortSubgroups(d3.descending);

        const chords = chord(reversedAfricaMatrix);

        const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

        const ribbon = d3.ribbon().radius(innerRadius - 5);

        const group = svg
          .append("g")
          .selectAll("g")
          .data(chords.groups)
          .enter()
          .append("g");

        group
          .append("path")
          .style("fill", (d) =>
            regionColors(countryToRegion[countries[d.index]])
          )
          .style("stroke", (d) =>
            d3.rgb(regionColors(countryToRegion[countries[d.index]])).darker()
          )
          .attr("d", arc);

        group
          .append("text")
          .each((d) => {
            d.angle = (d.startAngle + d.endAngle) / 2;
          })
          .attr("dy", ".35em")
          .attr(
            "transform",
            (d) => `
            rotate(${(d.angle * 180) / Math.PI - 90})
            translate(${outerRadius + 5})
            ${d.angle > Math.PI ? "rotate(180)" : ""}
          `
          )
          .style("text-anchor", (d) => (d.angle > Math.PI ? "end" : null))
          .text((d) => countries[d.index])
          .style("font-size", "10px")
          .style("fill", "#000");

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

        // Fix for the Legend
        const legendSvg = d3
          .select("#legendContainer")
          .append("svg")
          .attr("width", 200)
          .attr("height", Object.keys(regions).length * 20); // Set the height based on number of regions

        const legend = legendSvg
          .selectAll("g")
          .data(Object.keys(regions))
          .enter()
          .append("g")
          .attr("transform", (d, i) => `translate(0, ${i * 20})`);

        legend
          .append("rect")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", 15) // Set the width of the color box
          .attr("height", 15) // Set the height of the color box
          .style("fill", (d) => regionColors(d));

        legend
          .append("text")
          .attr("x", 20) // Set a larger x position for the text
          .attr("y", 12)
          .text((d) => d)
          .style("font-size", "12px"); // Adjust font size for better readability
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      })
      .finally(() => {
        // if (isLoading) setLoading(false);
      });
  }, []); // Empty dependency array ensures this effect runs only once on mount

  return (
    <Card>
      <CardContent className="p-5">
        {isLoading ? (
          <GraphSkeleton />
        ) : (
          <div className="flex justify-between lg:flex-row flex-col-reverse">
            <div id="legendContainer" style={{ padding: "20px" }}></div>
            <div id="svgContainer"></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Chord;
