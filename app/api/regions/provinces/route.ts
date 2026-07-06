import { NextResponse } from "next/server";

const SOURCE_URL = "https://raw.githubusercontent.com/ibnux/data-indonesia/master/provinsi.json";
const CACHE_SECONDS = 21 * 24 * 60 * 60;

const FALLBACK_PROVINCES = [
  { id: "11", nama: "Aceh" },
  { id: "12", nama: "Sumatera Utara" },
  { id: "13", nama: "Sumatera Barat" },
  { id: "14", nama: "Riau" },
  { id: "15", nama: "Jambi" },
  { id: "16", nama: "Sumatera Selatan" },
  { id: "17", nama: "Bengkulu" },
  { id: "18", nama: "Lampung" },
  { id: "19", nama: "Kepulauan Bangka Belitung" },
  { id: "21", nama: "Kepulauan Riau" },
  { id: "31", nama: "DKI Jakarta" },
  { id: "32", nama: "Jawa Barat" },
  { id: "33", nama: "Jawa Tengah" },
  { id: "34", nama: "DI Yogyakarta" },
  { id: "35", nama: "Jawa Timur" },
  { id: "36", nama: "Banten" },
  { id: "51", nama: "Bali" },
  { id: "52", nama: "Nusa Tenggara Barat" },
  { id: "53", nama: "Nusa Tenggara Timur" },
  { id: "61", nama: "Kalimantan Barat" },
  { id: "62", nama: "Kalimantan Tengah" },
  { id: "63", nama: "Kalimantan Selatan" },
  { id: "64", nama: "Kalimantan Timur" },
  { id: "65", nama: "Kalimantan Utara" },
  { id: "71", nama: "Sulawesi Utara" },
  { id: "72", nama: "Sulawesi Tengah" },
  { id: "73", nama: "Sulawesi Selatan" },
  { id: "74", nama: "Sulawesi Tenggara" },
  { id: "75", nama: "Gorontalo" },
  { id: "76", nama: "Sulawesi Barat" },
  { id: "81", nama: "Maluku" },
  { id: "82", nama: "Maluku Utara" },
  { id: "91", nama: "Papua Barat" },
  { id: "94", nama: "Papua" },
];

function cachedJson(data: unknown) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
    },
  });
}

export async function GET() {
  try {
    const response = await fetch(SOURCE_URL, {
      next: { revalidate: CACHE_SECONDS },
    });

    if (!response.ok) {
      return cachedJson(FALLBACK_PROVINCES);
    }

    const data = await response.json();

    return cachedJson(data);
  } catch {
    return cachedJson(FALLBACK_PROVINCES);
  }
}
