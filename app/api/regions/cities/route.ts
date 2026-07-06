import { NextRequest, NextResponse } from "next/server";

const SOURCE_BASE_URL = "https://raw.githubusercontent.com/ibnux/data-indonesia/master/kabupaten";
const CACHE_SECONDS = 21 * 24 * 60 * 60;

export async function GET(request: NextRequest) {
  const provinceId = request.nextUrl.searchParams.get("provinceId");

  if (!provinceId || !/^\d+$/.test(provinceId)) {
    return NextResponse.json(
      { success: false, message: "provinceId is required" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`${SOURCE_BASE_URL}/${provinceId}.json`, {
      next: { revalidate: CACHE_SECONDS },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to load cities" },
        { status: 502 },
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to load cities" },
      { status: 502 },
    );
  }
}
