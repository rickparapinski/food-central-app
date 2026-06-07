"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Check, ShoppingCart } from "lucide-react";

interface GroceryItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

interface GroceryList {
  id: string;
  meal_plan_id: string;
  items: GroceryItem[];
  checked_items: string[];
}

export default function GroceryPage() {
  const [list, setList] = useState<GroceryList | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(async () => {
    // Get latest meal plan id first
    const planRes = await fetch("/api/meal-plan");
    const plans = await planRes.json();
    if (!plans.length) { setLoading(false); return; }

    const res = await fetch(`/api/grocery?meal_plan_id=${plans[0].id}`);
    if (res.ok) {
      const data = await res.json();
      setList(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const toggleItem = async (itemName: string) => {
    if (!list) return;
    const checked = list.checked_items.includes(itemName)
      ? list.checked_items.filter((x) => x !== itemName)
      : [...list.checked_items, itemName];

    setList({ ...list, checked_items: checked });

    await fetch("/api/grocery", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meal_plan_id: list.meal_plan_id, checked_items: checked }),
    });
  };

  const clearChecked = async () => {
    if (!list) return;
    setList({ ...list, checked_items: [] });
    await fetch("/api/grocery", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meal_plan_id: list.meal_plan_id, checked_items: [] }),
    });
  };

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;

  const unchecked = list?.items.filter((i) => !list.checked_items.includes(i.name)) ?? [];
  const checked = list?.items.filter((i) => list.checked_items.includes(i.name)) ?? [];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Grocery List</h1>
        {checked.length > 0 && (
          <button onClick={clearChecked} className="text-xs text-muted-foreground hover:text-foreground">
            Clear checked
          </button>
        )}
      </div>

      {!list ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingCart size={40} className="text-muted-foreground/30 mb-4" />
          <p className="text-sm font-medium mb-1">No grocery list yet</p>
          <p className="text-xs text-muted-foreground max-w-56">
            Generate a meal plan first, then tap "Generate Grocery List."
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Unchecked items */}
          {unchecked.map((item) => (
            <GroceryRow
              key={item.name}
              item={item}
              checked={false}
              onToggle={() => toggleItem(item.name)}
            />
          ))}

          {/* Divider when mixed */}
          {unchecked.length > 0 && checked.length > 0 && (
            <div className="flex items-center gap-2 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{checked.length} done</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Checked items */}
          {checked.map((item) => (
            <GroceryRow
              key={item.name}
              item={item}
              checked
              onToggle={() => toggleItem(item.name)}
            />
          ))}

          {list.items.length > 0 && unchecked.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mb-3">
                <Check size={22} className="text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium">All done!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GroceryRow({
  item,
  checked,
  onToggle,
}: {
  item: GroceryItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
    >
      <div
        className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
          checked
            ? "bg-primary border-primary"
            : "border-border"
        }`}
      >
        {checked && <Check size={11} className="text-primary-foreground" />}
      </div>
      <span className={`flex-1 text-sm ${checked ? "line-through text-muted-foreground" : ""}`}>
        {item.name}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {item.quantity}{item.unit}
      </span>
    </button>
  );
}
