"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import type { MealPlan, Meal } from "@/lib/types";

const MEAL_KEYS = ["breakfast", "lunch", "dinner", "snack"] as const;

export default function PlannerPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    const res = await fetch("/api/meal-plan");
    const plans: MealPlan[] = await res.json();
    if (plans.length > 0) setPlan(plans[0]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLatest(); }, [fetchLatest]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    const res = await fetch("/api/meal-plan", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setPlan(data);
      setSelectedDay(0);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to generate plan. Make sure your profile is set up.");
    }
    setGenerating(false);
  };

  const handleGroceryList = async () => {
    if (!plan) return;
    setGroceryLoading(true);

    // Deduplicate ingredients across the whole week
    const seen = new Map<string, { name: string; quantity: number; unit: string }>();
    plan.plan.days.forEach((day) => {
      MEAL_KEYS.forEach((key) => {
        day[key]?.ingredients?.forEach((ing) => {
          const k = ing.name.toLowerCase();
          if (seen.has(k)) {
            seen.get(k)!.quantity += ing.quantity;
          } else {
            seen.set(k, { ...ing });
          }
        });
      });
    });

    await fetch("/api/grocery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meal_plan_id: plan.id,
        items: Array.from(seen.values()).map((i) => ({ ...i, category: "general" })),
      }),
    });

    setGroceryLoading(false);
    router.push("/grocery");
  };

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;

  const currentDay = plan?.plan.days[selectedDay];

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Meal Planner</h1>
        <Button size="sm" onClick={handleGenerate} disabled={generating || groceryLoading}>
          {generating ? (
            <><Loader2 size={15} className="mr-1.5 animate-spin" />Generating…</>
          ) : (
            <><Sparkles size={15} className="mr-1.5" />{plan ? "Regenerate" : "Plan Week"}</>
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 text-red-600 text-sm p-3 mb-4 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Generating state */}
      {generating && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 size={36} className="text-muted-foreground/40 animate-spin mb-4" />
          <p className="text-sm font-medium">Claude is planning your week…</p>
          <p className="text-xs text-muted-foreground mt-1">Takes about 15–20 seconds</p>
        </div>
      )}

      {/* Empty state */}
      {!generating && !plan && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Sparkles size={40} className="text-muted-foreground/30 mb-4" />
          <p className="text-sm font-medium mb-1">No plan yet</p>
          <p className="text-xs text-muted-foreground max-w-56">
            Add items to your pantry, set your macro targets in Profile, then tap Plan Week.
          </p>
        </div>
      )}

      {/* Plan view */}
      {!generating && plan && (
        <>
          <p className="text-xs text-muted-foreground mb-3">
            Week of{" "}
            {new Date(plan.week_start).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>

          {/* Day selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 scrollbar-hide">
            {plan.plan.days.map((day, i) => (
              <button
                key={day.day}
                onClick={() => setSelectedDay(i)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedDay === i
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:border-foreground"
                }`}
              >
                {day.day.slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Meals for selected day */}
          {currentDay && (
            <div className="space-y-3">
              {MEAL_KEYS.map((key) => (
                <MealCard key={key} label={key} meal={currentDay[key]} />
              ))}
            </div>
          )}

          {/* Grocery CTA */}
          <Button
            variant="outline"
            className="w-full mt-6 h-12"
            onClick={handleGroceryList}
            disabled={groceryLoading}
          >
            {groceryLoading ? (
              <><Loader2 size={16} className="mr-2 animate-spin" />Building list…</>
            ) : (
              <><ShoppingCart size={16} className="mr-2" />Generate Grocery List</>
            )}
          </Button>
        </>
      )}
    </div>
  );
}

function MealCard({ label, meal }: { label: string; meal: Meal }) {
  const [expanded, setExpanded] = useState(false);

  if (!meal) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        className="w-full text-left p-3 flex items-start gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
            {label}
          </p>
          <p className="font-medium text-sm leading-snug">{meal.name}</p>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
            <span className="text-foreground font-medium">{meal.macros?.calories ?? 0} kcal</span>
            <span>P {meal.macros?.protein ?? 0}g</span>
            <span>C {meal.macros?.carbs ?? 0}g</span>
            <span>F {meal.macros?.fat ?? 0}g</span>
          </div>
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-muted-foreground shrink-0 mt-1" />
          : <ChevronDown size={16} className="text-muted-foreground shrink-0 mt-1" />
        }
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-2 border-t border-border space-y-3">
          {meal.ingredients?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Ingredients
              </p>
              <ul className="space-y-1">
                {meal.ingredients.map((ing, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-muted-foreground w-14 shrink-0 tabular-nums">
                      {ing.quantity}{ing.unit}
                    </span>
                    <span>{ing.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {meal.recipe && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Recipe
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {meal.recipe}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
