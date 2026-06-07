"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Check, X, Plus } from "lucide-react";
import type { UserProfile } from "@/lib/types";

const DIET_STYLES = ["None", "Vegetarian", "Vegan", "Pescatarian", "Keto", "Low-carb"];
const COMMON_ALLERGIES = ["Gluten", "Lactose", "Nuts", "Eggs", "Soy", "Shellfish", "Fish"];

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [calories, setCalories] = useState("2000");
  const [protein, setProtein] = useState("150");
  const [carbs, setCarbs] = useState("200");
  const [fat, setFat] = useState("70");

  const [dietStyle, setDietStyle] = useState("None");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [dislikeInput, setDislikeInput] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((profile: UserProfile | null) => {
        if (profile) {
          setCalories(String(profile.calories));
          setProtein(String(profile.protein));
          setCarbs(String(profile.carbs));
          setFat(String(profile.fat));
          setDietStyle(profile.preferences.diet_style ?? "None");
          setAllergies(profile.preferences.allergies ?? []);
          setDislikes(profile.preferences.dislikes ?? []);
        }
        setLoading(false);
      });
  }, []);

  const addDislike = () => {
    const val = dislikeInput.trim().replace(/,$/, "");
    if (val && !dislikes.includes(val)) {
      setDislikes((prev) => [...prev, val]);
    }
    setDislikeInput("");
  };

  const toggleAllergy = (a: string) =>
    setAllergies((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calories: Number(calories),
        protein: Number(protein),
        carbs: Number(carbs),
        fat: Number(fat),
        preferences: {
          diet_style: dietStyle === "None" ? undefined : dietStyle,
          allergies,
          dislikes,
        },
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-4 space-y-6 pb-8">
      <h1 className="text-xl font-semibold">Profile</h1>

      {/* ── Macro targets ─────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Daily Targets
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Calories (kcal)</Label>
            <Input
              className="mt-1"
              type="number"
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Protein (g)</Label>
            <Input
              className="mt-1"
              type="number"
              inputMode="numeric"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Carbs (g)</Label>
            <Input
              className="mt-1"
              type="number"
              inputMode="numeric"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Fat (g)</Label>
            <Input
              className="mt-1"
              type="number"
              inputMode="numeric"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
            />
          </div>
        </div>
        <MacroRatioBar
          protein={Number(protein)}
          carbs={Number(carbs)}
          fat={Number(fat)}
        />
      </section>

      <Separator />

      {/* ── Diet style ────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Diet Style
        </h2>
        <div className="flex flex-wrap gap-2">
          {DIET_STYLES.map((s) => (
            <button
              key={s}
              onClick={() => setDietStyle(s)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                dietStyle === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Allergies ─────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Allergies &amp; Intolerances
        </h2>
        <div className="flex flex-wrap gap-2">
          {COMMON_ALLERGIES.map((a) => {
            const active = allergies.includes(a);
            return (
              <button
                key={a}
                onClick={() => toggleAllergy(a)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  active
                    ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
                    : "border-border text-muted-foreground hover:border-foreground"
                }`}
              >
                {active && <span className="mr-1 text-xs">✕</span>}
                {a}
              </button>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* ── Dislikes ──────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Food Dislikes
        </h2>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="e.g. mushrooms, olives…"
            value={dislikeInput}
            onChange={(e) => setDislikeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addDislike();
              }
            }}
          />
          <Button size="icon" variant="outline" onClick={addDislike} aria-label="Add">
            <Plus size={16} />
          </Button>
        </div>
        {dislikes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {dislikes.map((d) => (
              <span
                key={d}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-sm"
              >
                {d}
                <button
                  onClick={() => setDislikes((prev) => prev.filter((x) => x !== d))}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${d}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      <Button className="w-full h-12" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : saved ? (
          <span className="flex items-center gap-2">
            <Check size={16} /> Saved
          </span>
        ) : "Save Profile"}
      </Button>
    </div>
  );
}

function MacroRatioBar({
  protein,
  carbs,
  fat,
}: {
  protein: number;
  carbs: number;
  fat: number;
}) {
  const pCal = protein * 4;
  const cCal = carbs * 4;
  const fCal = fat * 9;
  const total = pCal + cCal + fCal;
  if (!total) return null;

  const pPct = Math.round((pCal / total) * 100);
  const cPct = Math.round((cCal / total) * 100);
  const fPct = 100 - pPct - cPct;

  return (
    <div className="mt-4">
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        <div className="bg-blue-400 rounded-l-full" style={{ width: `${pPct}%` }} />
        <div className="bg-amber-400" style={{ width: `${cPct}%` }} />
        <div className="bg-rose-400 rounded-r-full" style={{ width: `${fPct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
          Protein {pPct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
          Carbs {cPct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-rose-400" />
          Fat {fPct}%
        </span>
      </div>
    </div>
  );
}
