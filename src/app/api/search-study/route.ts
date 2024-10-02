import axios from "axios";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req: NextRequest) {
    try {

        const searchParams = req.nextUrl.searchParams;


        const title = searchParams.get("title");
        const year = searchParams.get("year");
        const region = searchParams.get("research_regions");
        const disorder = searchParams.get("disorder");
        const article = searchParams.get("article_type");
        const pageNum = searchParams.get("page");


        const url = `https://algorithmxcomp.pythonanywhere.com/api/studies/?title=${title}&year=${year}&research_regions=${region}&disorder=${disorder}&article_type=${article}&page=${pageNum}`

        const response = await axios.get(url);

        return NextResponse.json(response.data);

    } catch (error) {
        return new Response("Error fetching search results", { status: 500 });
    }
}