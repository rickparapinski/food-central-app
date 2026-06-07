"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@/lib/types";

const UNITS = ["g", "ml", "piece", "serving", "kg", "l"];

interface Props {
  product: Product;
  onAdd: (productId: string, quantity: number, unit: string) => Promise<void>;
  onClose: () => void;
}

export default function AddProductSheet({ product, onAdd, onClose }: Props) {
  const defaultQty = product.serving_size ? String(product.serving_size) : "100";
  const defaultUnit = product.serving_unit ?? "g";

  const [quantity, setQuantity] = useState(defaultQty);
  const [unit, setUnit] = useState(defaultUnit);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!quantity || Number(quantity) <= 0) return;
    setAdding(true);
    await onAdd(product.id, Number(quantity), unit);
    setAdding(false);
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="pb-safe">
        <SheetHeader className="text-left mb-4">
          <SheetTitle>{product.name_en}</SheetTitle>
          <p className="text-sm text-muted-foreground">{product.name_de}</p>
        </SheetHeader>

        <div className="grid grid-cols-4 gap-2 text-center mb-4">
          {[
            { label: "kcal", value: product.calories },
            { label: "protein", value: `${product.protein}g` },
            { label: "carbs", value: `${product.carbs}g` },
            { label: "fat", value: `${product.fat}g` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-muted p-2">
              <div className="text-sm font-semibold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mb-4">
          Per 100{product.serving_unit ?? "g"}
        </p>

        <div className="flex gap-2 mb-4">
          <Input
            type="number"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="flex-1"
            placeholder="Quantity"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[72px]"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleAdd} disabled={adding}>
            {adding ? "Adding…" : "Add to Pantry"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
