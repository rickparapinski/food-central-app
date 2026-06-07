export const MEAL_PLAN_SYSTEM = `You are a meal planning assistant. Given a pantry inventory and user preferences, generate a practical 7-day meal plan.
Always respond with valid JSON only — no markdown, no explanation.`;

export function mealPlanPrompt(
  pantry: { name: string; quantity: number; unit: string }[],
  profile: { calories: number; protein: number; carbs: number; fat: number; preferences: Record<string, unknown> },
  weekStart: string
): string {
  return `Week starting: ${weekStart}

Pantry:
${pantry.map((i) => `- ${i.name}: ${i.quantity}${i.unit}`).join("\n")}

Daily targets: ${profile.calories} kcal, ${profile.protein}g protein, ${profile.carbs}g carbs, ${profile.fat}g fat
Preferences: ${JSON.stringify(profile.preferences)}

Return a JSON object with this shape:
{
  "days": [
    {
      "day": "Monday",
      "breakfast": { "name": "", "ingredients": [{"name":"","quantity":0,"unit":""}], "macros": {"calories":0,"protein":0,"carbs":0,"fat":0}, "recipe": "" },
      "lunch": { ... },
      "dinner": { ... },
      "snack": { ... }
    },
    ... (7 days total)
  ]
}`;
}

export const OCR_SYSTEM = `You are a nutrition label parser. Extract macro information from the provided image of a nutrition label (Nährwertangaben).
Always respond with valid JSON only — no markdown, no explanation.`;

export const OCR_PROMPT = `Extract the nutrition values per serving from this label. Return:
{
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "serving_size": 0,
  "serving_unit": "g"
}
All values as numbers. Use per-serving values, not per-100g.`;
