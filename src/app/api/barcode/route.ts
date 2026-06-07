import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const barcode = request.nextUrl.searchParams.get("barcode");
  if (!barcode) return NextResponse.json({ error: "barcode required" }, { status: 400 });

  // Check local DB first
  const local = await prisma.product.findUnique({ where: { barcode } });
  if (local) return NextResponse.json({ source: "local", product: local });

  // Fallback to Open Food Facts (German locale)
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,product_name_de,nutriments,serving_size`,
    { headers: { "User-Agent": "food-central/1.0" } }
  );
  if (!res.ok) return NextResponse.json({ error: "not found" }, { status: 404 });

  const data = await res.json();
  if (data.status !== 1) return NextResponse.json({ error: "not found" }, { status: 404 });

  const p = data.product;
  const n = p.nutriments ?? {};

  const product = {
    barcode,
    name_de: p.product_name_de || p.product_name || "Unknown",
    name_en: p.product_name || p.product_name_de || "Unknown",
    calories: n["energy-kcal_100g"] ?? n["energy-kcal"] ?? 0,
    protein: n.proteins_100g ?? 0,
    carbs: n.carbohydrates_100g ?? 0,
    fat: n.fat_100g ?? 0,
    serving_size: parseFloat(p.serving_size) || null,
    serving_unit: "g",
    source: "open_food_facts" as const,
  };

  return NextResponse.json({ source: "open_food_facts", product });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { barcode, name_de, name_en, calories, protein, carbs, fat, serving_size, serving_unit } = body;

  const product = await prisma.product.upsert({
    where: { barcode },
    create: { barcode, name_de, name_en, calories, protein, carbs, fat, serving_size, serving_unit, source: "custom" },
    update: { name_de, name_en, calories, protein, carbs, fat, serving_size, serving_unit },
  });

  return NextResponse.json(product);
}
