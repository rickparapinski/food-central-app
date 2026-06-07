import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.pantryItem.findMany({
    include: { product: true },
    orderBy: { added_at: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const { product_id, quantity, unit } = await request.json();
  const item = await prisma.pantryItem.create({
    data: { product_id, quantity: Number(quantity), unit: unit ?? "g" },
    include: { product: true },
  });
  return NextResponse.json(item);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  await prisma.pantryItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
