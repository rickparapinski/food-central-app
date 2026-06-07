import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const profile = await prisma.userProfile.findFirst();
  if (!profile) return NextResponse.json(null);
  return NextResponse.json({ ...profile, preferences: JSON.parse(profile.preferences) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { calories, protein, carbs, fat, preferences } = body;

  const existing = await prisma.userProfile.findFirst();
  const data = {
    calories: Number(calories),
    protein: Number(protein),
    carbs: Number(carbs),
    fat: Number(fat),
    preferences: JSON.stringify(preferences ?? {}),
  };

  const profile = existing
    ? await prisma.userProfile.update({ where: { id: existing.id }, data })
    : await prisma.userProfile.create({ data });

  return NextResponse.json({ ...profile, preferences: JSON.parse(profile.preferences) });
}
