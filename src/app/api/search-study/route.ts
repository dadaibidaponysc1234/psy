import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    const title = searchParams.get("title") || undefined;
    const journal_name = searchParams.get("journal_name") || undefined;
    const keyword = searchParams.get("keyword") || undefined;
    const impact_factor_min =
      searchParams.get("impact_factor_min") || undefined;
    const impact_factor_max =
      searchParams.get("impact_factor_max") || undefined;
    const year = searchParams.get("year") || undefined;
    const year_min = searchParams.get("year_min") || undefined;
    const year_max = searchParams.get("year_max") || undefined;
    const research_regions = searchParams.get("research_regions") || undefined;
    const disorder = searchParams.get("disorder") || undefined;
    const article_type = searchParams.get("article_type") || undefined;
    const biological_modalities =
      searchParams.get("biological_modalities") || undefined;
    const genetic_source_materials =
      searchParams.get("genetic_source_materials") || undefined;
    const exportSearch = searchParams.get("export") || undefined;
    const page = searchParams.get("page") || undefined;

    const url = `https://algorithmxcomp.pythonanywhere.com/api/studies`;

    const response = await axios.get(url, {
      params: {
        title,
        journal_name,
        keyword,
        impact_factor_min,
        impact_factor_max,
        year,
        year_min,
        year_max,
        research_regions,
        disorder,
        article_type,
        biological_modalities,
        genetic_source_materials,
        export: exportSearch,
        page,
      },
      responseType: exportSearch ? "blob" : "json",
    });
    const contentType = response.headers["content-type"];
    if (contentType === "text/csv") {
      const csvFileName = `exported_studies.csv`;
      return new NextResponse(response.data, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${csvFileName}"`,
        },
      });
    }

    return NextResponse.json(response.data);
  } catch (error) {
    return new Response("Error fetching search results", { status: 500 });
  }
}
