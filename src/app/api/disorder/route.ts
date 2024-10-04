import axios from "axios";
import dynamic from "next/dynamic";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const url =
      "https://algorithmxcomp.pythonanywhere.com/api/disorder-study-count/";
    const response = await axios.get(url);

    const nextResponse = NextResponse.json(response.data);
    nextResponse.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    nextResponse.headers.set("Pragma", "no-cache");
    nextResponse.headers.set("Expires", "0");
    // console.log(response);

    return NextResponse.json(response.data);
  } catch (error) {
    console.log("Error fetching data");
    return new Response("Error fetching studying view list", { status: 500 });
  }
}
