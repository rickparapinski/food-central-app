"use client";

import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2 } from "lucide-react";

interface Props {
  barcode: string;
  onAdd: (productId: string, quantity: number, unit: string) => Promise<void>;
  onClose: () => void;
}

type Step = "capture" | "review";

const INITIAL_FORM = {
  name_en: "",
  name_de: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  serving_size: "100",
  serving_unit: "g",
  quantity: "100",
  unit: "g",
};

export default function OcrSheet({ barcode, onAdd, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("capture");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoPreview(URL.createObjectURL(file));
    setOcrLoading(true);
    setStep("review");

    const body = new FormData();
    body.append("image", file);

    try {
      const res = await fetch("/api/ocr", { method: "POST", body });
      if (res.ok) {
        const data = await res.json();
        setForm((f) => ({
          ...f,
          calories: String(data.calories ?? ""),
          protein: String(data.protein ?? ""),
          carbs: String(data.carbs ?? ""),
          fat: String(data.fat ?? ""),
          serving_size: String(data.serving_size ?? "100"),
          serving_unit: data.serving_unit ?? "g",
        }));
      }
    } catch {
      // OCR failed — user fills manually
    }

    setOcrLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/barcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barcode,
        name_en: form.name_en || form.name_de || "Unknown",
        name_de: form.name_de || form.name_en || "Unknown",
        calories: Number(form.calories) || 0,
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fat: Number(form.fat) || 0,
        serving_size: Number(form.serving_size) || 100,
        serving_unit: form.serving_unit || "g",
      }),
    });

    if (res.ok) {
      const product = await res.json();
      await onAdd(product.id, Number(form.quantity) || 100, form.unit || "g");
    }

    setSaving(false);
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto pb-safe">
        <SheetHeader className="text-left mb-4">
          <SheetTitle>Unknown Barcode</SheetTitle>
          <p className="text-xs font-mono text-muted-foreground">{barcode}</p>
        </SheetHeader>

        {step === "capture" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No data found. Photograph the nutrition label (Nährwertangaben) to extract macros automatically, or enter manually.
            </p>

            <Button className="w-full h-12" onClick={() => fileInputRef.current?.click()}>
              <Camera size={16} className="mr-2" />
              Take Photo of Label
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhoto}
            />

            <Button variant="outline" className="w-full" onClick={() => setStep("review")}>
              Enter Manually
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {ocrLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                Extracting nutrition data…
              </div>
            )}

            {photoPreview && (
              <img
                src={photoPreview}
                alt="Nutrition label"
                className="w-full rounded-lg max-h-36 object-contain bg-muted"
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name (English)</Label>
                <Input className="mt-1" placeholder="Whole Milk" value={form.name_en} onChange={set("name_en")} />
              </div>
              <div>
                <Label className="text-xs">Name (Deutsch)</Label>
                <Input className="mt-1" placeholder="Vollmilch" value={form.name_de} onChange={set("name_de")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Calories (kcal)</Label>
                <Input className="mt-1" type="number" inputMode="decimal" value={form.calories} onChange={set("calories")} />
              </div>
              <div>
                <Label className="text-xs">Protein (g)</Label>
                <Input className="mt-1" type="number" inputMode="decimal" value={form.protein} onChange={set("protein")} />
              </div>
              <div>
                <Label className="text-xs">Carbs (g)</Label>
                <Input className="mt-1" type="number" inputMode="decimal" value={form.carbs} onChange={set("carbs")} />
              </div>
              <div>
                <Label className="text-xs">Fat (g)</Label>
                <Input className="mt-1" type="number" inputMode="decimal" value={form.fat} onChange={set("fat")} />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs">Serving size</Label>
                <Input className="mt-1" type="number" inputMode="decimal" value={form.serving_size} onChange={set("serving_size")} />
              </div>
              <div className="w-20">
                <Label className="text-xs">Unit</Label>
                <Input className="mt-1" value={form.serving_unit} onChange={set("serving_unit")} />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs">Add quantity</Label>
                <Input className="mt-1" type="number" inputMode="decimal" value={form.quantity} onChange={set("quantity")} />
              </div>
              <div className="w-20">
                <Label className="text-xs">Unit</Label>
                <Input className="mt-1" value={form.unit} onChange={set("unit")} />
              </div>
            </div>

            <div className="flex gap-2 pt-1 pb-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || ocrLoading}>
                {saving ? "Saving…" : "Save & Add"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
