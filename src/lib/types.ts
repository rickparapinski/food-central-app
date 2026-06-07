export interface Product {
  id: string;
  barcode: string;
  name_de: string;
  name_en: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: number | null;
  serving_unit: string | null;
  source: "open_food_facts" | "custom";
  photo_path: string | null;
}

export interface PantryItem {
  id: string;
  product_id: string;
  quantity: number;
  unit: string;
  added_at: string;
  product: Product;
}

export interface MacroLog {
  id: string;
  date: string;
  meal_name: string;
  product_id: string;
  quantity: number;
  logged_at: string;
  product: Product;
}

export interface UserProfile {
  id: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  preferences: {
    dislikes?: string[];
    allergies?: string[];
    diet_style?: string;
  };
}

export interface MealPlan {
  id: string;
  week_start: string;
  plan: WeekPlan;
  generated_at: string;
}

export interface WeekPlan {
  days: DayPlan[];
}

export interface DayPlan {
  day: string;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snack: Meal;
}

export interface Meal {
  name: string;
  ingredients: { name: string; quantity: number; unit: string }[];
  macros: { calories: number; protein: number; carbs: number; fat: number };
  recipe: string;
}
