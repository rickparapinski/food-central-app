"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, BarChart2 } from "lucide-react";
import { todayISO } from "@/lib/utils";
import type { MacroLog, UserProfile, PantryItem } from "@/lib/types";

const MEAL_KEYS = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealKey = (typeof MEAL_KEYS)[number];

export default function TrackerPage() {
  const [logs, setLogs] = useState<MacroLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addSheet, setAddSheet] = useState<MealKey | null>(null);

  const today = todayISO();

  const fetchAll = useCallback(async () => {
    const [logsRes, profileRes, pantryRes] = await Promise.all([
      fetch(`/api/log?date=${today}`),
      fetch("/api/profile"),
      fetch("/api/pantry"),
    ]);
    setLogs(await logsRes.json());
    setProfile(await profileRes.json());
    setPantry(await pantryRes.json());
    setLoading(false);
  }, [today]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLog = async (productId: string, quantity: number, mealName: MealKey) => {
    const res = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, quantity, meal_name: mealName, date: today }),
    });
    if (res.ok) {
      const newLog = await res.json();
      setLogs((prev) => [...prev, newLog]);
    }
    setAddSheet(null);
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/log", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  // Totals
  const totals = logs.reduce(
    (acc, log) => {
      const factor = log.quantity / 100;
      return {
        calories: acc.calories + log.product.calories * factor,
        protein: acc.protein + log.product.protein * factor,
        carbs: acc.carbs + log.product.carbs * factor,
        fat: acc.fat + log.product.fat * factor,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const targets = profile ?? { calories: 2000, protein: 150, carbs: 200, fat: 70 };

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">
        Tracker — {new Date(today).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
      </h1>

      {/* Macro summary */}
      <div className="rounded-xl border border-border p-4 mb-5 space-y-3">
        <MacroRow
          label="Calories"
          current={Math.round(totals.calories)}
          target={targets.calories}
          unit="kcal"
          color="bg-primary"
        />
        <MacroRow
          label="Protein"
          current={Math.round(totals.protein)}
          target={targets.protein}
          unit="g"
          color="bg-blue-400"
        />
        <MacroRow
          label="Carbs"
          current={Math.round(totals.carbs)}
          target={targets.carbs}
          unit="g"
          color="bg-amber-400"
        />
        <MacroRow
          label="Fat"
          current={Math.round(totals.fat)}
          target={targets.fat}
          unit="g"
          color="bg-rose-400"
        />
      </div>

      {/* Meals */}
      {MEAL_KEYS.map((meal) => {
        const mealLogs = logs.filter((l) => l.meal_name === meal);
        return (
          <div key={meal} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold capitalize">{meal}</h2>
              <button
                onClick={() => setAddSheet(meal)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus size={13} /> Add
              </button>
            </div>

            {mealLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-0.5">Nothing logged yet</p>
            ) : (
              <ul className="space-y-1.5">
                {mealLogs.map((log) => {
                  const factor = log.quantity / 100;
                  return (
                    <li key={log.id} className="flex items-center gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="truncate">{log.product.name_en}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {log.quantity}g · {Math.round(log.product.calories * factor)} kcal
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}

      {logs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <BarChart2 size={36} className="text-muted-foreground/30 mb-3" />
          <p className="text-xs text-muted-foreground">Tap + Add under any meal to start logging.</p>
        </div>
      )}

      {/* Add log sheet */}
      {addSheet && (
        <AddLogSheet
          meal={addSheet}
          pantry={pantry}
          onAdd={handleLog}
          onClose={() => setAddSheet(null)}
        />
      )}
    </div>
  );
}

function MacroRow({
  label,
  current,
  target,
  unit,
  color,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}) {
  const pct = Math.min((current / target) * 100, 100);
  const over = current > target;

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium">{label}</span>
        <span className={over ? "text-red-500" : "text-muted-foreground"}>
          {current} / {target} {unit}
          {over && " ↑"}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-red-400" : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AddLogSheet({
  meal,
  pantry,
  onAdd,
  onClose,
}: {
  meal: MealKey;
  pantry: PantryItem[];
  onAdd: (productId: string, quantity: number, meal: MealKey) => Promise<void>;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState(pantry[0]?.product.id ?? "");
  const [quantity, setQuantity] = useState("100");
  const [adding, setAdding] = useState(false);

  const selected = pantry.find((p) => p.product.id === selectedId);

  const handleAdd = async () => {
    if (!selectedId || !quantity) return;
    setAdding(true);
    await onAdd(selectedId, Number(quantity), meal);
    setAdding(false);
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="pb-safe">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="capitalize">Add to {meal}</SheetTitle>
        </SheetHeader>

        {pantry.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Your pantry is empty. Add items in the Pantry tab first.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Food</Label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {pantry.map((item) => (
                  <option key={item.product.id} value={item.product.id}>
                    {item.product.name_en}
                  </option>
                ))}
              </select>
            </div>

            {selected && (
              <div className="flex gap-2 text-xs text-muted-foreground bg-muted rounded-lg p-2">
                <span>{selected.product.calories} kcal</span>
                <span>·</span>
                <span>P {selected.product.protein}g</span>
                <span>C {selected.product.carbs}g</span>
                <span>F {selected.product.fat}g</span>
                <span className="text-muted-foreground/60">per 100g</span>
              </div>
            )}

            <div>
              <Label className="text-xs">Quantity (g)</Label>
              <Input
                className="mt-1"
                type="number"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleAdd} disabled={adding}>
                {adding ? "Adding…" : "Add"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
