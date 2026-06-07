import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { todayISO } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? todayISO();
  const logs = await prisma.macroLog.findMany({
    where: { date },
    include: { product: true },
    orderBy: { logged_at: "asc" },
  });
  return NextResponse.json(logs);
}

export async function POST(request: NextRequest) {
  const { product_id, quantity, meal_name, date } = await request.json();
  const log = await prisma.macroLog.create({
    data: { product_id, quantity: Number(quantity), meal_name, date: date ?? todayISO() },
    include: { product: true },
  });
  return NextResponse.json(log);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  await prisma.macroLog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
