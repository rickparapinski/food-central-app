import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic, HAIKU } from "@/lib/claude";
import { MEAL_PLAN_SYSTEM, mealPlanPrompt } from "@/lib/prompts";
import { weekStartISO } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const weekStart = body.week_start ?? weekStartISO();

  const [pantryItems, profile] = await Promise.all([
    prisma.pantryItem.findMany({ include: { product: true } }),
    prisma.userProfile.findFirst(),
  ]);

  if (!profile) return NextResponse.json({ error: "profile not set up" }, { status: 400 });

  const pantry = pantryItems.map((item: { product: { name_en: string }; quantity: number; unit: string }) => ({
    name: item.product.name_en,
    quantity: item.quantity,
    unit: item.unit,
  }));

  const preferences = JSON.parse(profile.preferences ?? "{}");

  const message = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 4096,
    system: MEAL_PLAN_SYSTEM,
    messages: [
      {
        role: "user",
        content: mealPlanPrompt(pantry, { ...profile, preferences }, weekStart),
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const plan = JSON.parse(text);
    const saved = await prisma.mealPlan.create({
      data: { week_start: new Date(weekStart), plan: JSON.stringify(plan) },
    });
    return NextResponse.json({ id: saved.id, week_start: weekStart, plan });
  } catch {
    return NextResponse.json({ error: "failed to parse meal plan", raw: text }, { status: 422 });
  }
}

export async function GET() {
  const plans = await prisma.mealPlan.findMany({
    orderBy: { week_start: "desc" },
    take: 4,
  });
  return NextResponse.json(plans.map((p: { plan: string } & Record<string, unknown>) => ({ ...p, plan: JSON.parse(p.plan) })));
}
