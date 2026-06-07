import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const meal_plan_id = request.nextUrl.searchParams.get("meal_plan_id");
  if (!meal_plan_id) return NextResponse.json({ error: "meal_plan_id required" }, { status: 400 });

  const list = await prisma.groceryList.findUnique({ where: { meal_plan_id } });
  if (!list) return NextResponse.json(null);

  return NextResponse.json({ ...list, items: JSON.parse(list.items), checked_items: JSON.parse(list.checked_items) });
}

export async function POST(request: NextRequest) {
  const { meal_plan_id, items } = await request.json();

  const list = await prisma.groceryList.upsert({
    where: { meal_plan_id },
    create: { meal_plan_id, items: JSON.stringify(items), checked_items: "[]" },
    update: { items: JSON.stringify(items) },
  });

  return NextResponse.json({ ...list, items: JSON.parse(list.items), checked_items: JSON.parse(list.checked_items) });
}

export async function PATCH(request: NextRequest) {
  const { meal_plan_id, checked_items } = await request.json();
  const list = await prisma.groceryList.update({
    where: { meal_plan_id },
    data: { checked_items: JSON.stringify(checked_items) },
  });
  return NextResponse.json({ ...list, items: JSON.parse(list.items), checked_items: JSON.parse(list.checked_items) });
}
