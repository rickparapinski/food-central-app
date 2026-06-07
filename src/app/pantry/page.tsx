"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Scan, Trash2 } from "lucide-react";
import AddProductSheet from "@/components/add-product-sheet";
import OcrSheet from "@/components/ocr-sheet";
import type { PantryItem, Product } from "@/lib/types";

const BarcodeScanner = dynamic(() => import("@/components/barcode-scanner"), { ssr: false });

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/pantry");
    setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleBarcode = useCallback(async (barcode: string) => {
    setScannerOpen(false);
    const res = await fetch(`/api/barcode?barcode=${encodeURIComponent(barcode)}`);
    if (res.ok) {
      const { product } = await res.json();
      setFoundProduct(product);
    } else {
      setUnknownBarcode(barcode);
    }
  }, []);

  const handleAdd = async (productId: string, quantity: number, unit: string) => {
    await fetch("/api/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, quantity, unit }),
    });
    setFoundProduct(null);
    setUnknownBarcode(null);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/pantry", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Pantry</h1>
        <Button size="sm" onClick={() => setScannerOpen(true)}>
          <Scan size={15} className="mr-1.5" />
          Scan
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Scan size={40} className="text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Your pantry is empty.</p>
          <p className="text-xs text-muted-foreground mt-1">Tap Scan to add items.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-tight truncate">{item.product.name_en}</p>
                <p className="text-xs text-muted-foreground truncate">{item.product.name_de}</p>
                <div className="flex gap-2 mt-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{item.quantity}{item.unit}</span>
                  <span>·</span>
                  <span>{item.product.calories} kcal</span>
                  <span>·</span>
                  <span>P {item.product.protein}g</span>
                  <span>C {item.product.carbs}g</span>
                  <span>F {item.product.fat}g</span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive shrink-0 rounded-lg hover:bg-muted transition-colors"
                aria-label="Remove"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Barcode scanner sheet */}
      <Sheet open={scannerOpen} onOpenChange={setScannerOpen}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader className="text-left mb-4">
            <SheetTitle>Scan Barcode</SheetTitle>
          </SheetHeader>
          <div className="relative rounded-xl overflow-hidden bg-black" style={{ height: "calc(80vh - 140px)" }}>
            {scannerOpen && <BarcodeScanner onDetected={handleBarcode} />}
            {/* targeting guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 border-2 border-primary/60 rounded-lg aspect-[3/1]" />
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-3">
            Point camera at a barcode
          </p>
        </SheetContent>
      </Sheet>

      {foundProduct && (
        <AddProductSheet
          product={foundProduct}
          onAdd={handleAdd}
          onClose={() => setFoundProduct(null)}
        />
      )}

      {unknownBarcode && (
        <OcrSheet
          barcode={unknownBarcode}
          onAdd={handleAdd}
          onClose={() => setUnknownBarcode(null)}
        />
      )}
    </div>
  );
}
