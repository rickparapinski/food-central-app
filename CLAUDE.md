# food-central — Development Guide

## What this app is
A mobile-first PWA for weekly meal planning, pantry management, barcode scanning, and macro tracking. Solo user, self-hosted on a homeserver, accessed from phone via Cloudflare Tunnel.

---

## Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** SQLite via Prisma 7 + `@prisma/adapter-better-sqlite3`
- **UI:** Tailwind CSS + shadcn/ui (mobile-first, bottom nav)
- **AI:** Claude Haiku (`claude-haiku-4-5-20251001`) — server-side only, never exposed to browser
- **Barcode scanning:** `@zxing/browser` — runs in browser, dynamically imported (no SSR)
- **Barcode lookup:** Open Food Facts API (good German product coverage)
- **OCR:** Claude Vision (Haiku) — extracts macros from photographed German nutrition labels

---

## Hosting
- **GitHub:** `https://github.com/rickparapinski/food-central-app` (branch: `main`)
- **LXC container IP:** `192.168.178.20`, port 3000
- **App user/path:** `foodcentral` / `/home/foodcentral/app`
- **Public URL:** `https://food.janna-montanna.uk`
- **Cloudflare Tunnel:** locally managed via config.yml on a separate `finance-app` container; tunnel ID `42894c9b-56d7-4b2e-aa8f-4c0b68072e82`
- **systemd service:** `food-central` (enabled, auto-starts on reboot)
- **Production data:** `/data/food-central/food-central.db` (SQLite), `/data/food-central/photos/`
- No auth (solo user)

---

## File structure

```
food-central/
├── prisma/
│   ├── schema.prisma          # DB models
│   ├── migrations/            # SQL migration history
│   └── prisma.config.ts       # Datasource URL config (Prisma 7 style)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout: wraps pages in <main> + <BottomNav>
│   │   ├── globals.css        # CSS vars (light/dark), scrollbar-hide utility
│   │   ├── page.tsx           # Redirects / → /pantry
│   │   ├── pantry/page.tsx    # Barcode scan, pantry list, add/delete items
│   │   ├── planner/page.tsx   # Generate/view 7-day meal plan, grocery list CTA
│   │   ├── grocery/page.tsx   # Tap-to-check grocery list
│   │   ├── tracker/page.tsx   # Daily macro logging and progress bars
│   │   ├── profile/page.tsx   # Macro targets, diet style, allergies, dislikes
│   │   └── api/
│   │       ├── barcode/       # GET: lookup barcode (local → OFF fallback). POST: save custom product
│   │       ├── ocr/           # POST: image → Claude Vision → macro JSON
│   │       ├── pantry/        # GET/POST/DELETE pantry items
│   │       ├── meal-plan/     # GET: recent plans. POST: generate via Claude Haiku
│   │       ├── grocery/       # GET/POST grocery list. PATCH: update checked items
│   │       ├── log/           # GET/POST/DELETE macro log entries (by date)
│   │       └── profile/       # GET/POST user profile + preferences
│   ├── components/
│   │   ├── bottom-nav.tsx     # Fixed bottom nav: Pantry / Planner / Grocery / Tracker / Profile
│   │   ├── barcode-scanner.tsx   # Camera feed via @zxing/browser; fires onDetected once per scan
│   │   ├── add-product-sheet.tsx # Bottom sheet: confirm adding known product to pantry
│   │   ├── ocr-sheet.tsx      # Bottom sheet: unknown barcode → photo → OCR → save custom product
│   │   └── ui/                # shadcn/ui components (button, card, sheet, drawer, input, etc.)
│   ├── generated/
│   │   └── prisma/            # Auto-generated Prisma client (gitignored, run `npx prisma generate`)
│   └── lib/
│       ├── prisma.ts          # Prisma singleton with PrismaBetterSqlite3 adapter
│       ├── claude.ts          # Anthropic client + HAIKU model constant
│       ├── prompts.ts         # MEAL_PLAN_SYSTEM, mealPlanPrompt(), OCR_SYSTEM, OCR_PROMPT
│       ├── types.ts           # Shared TS interfaces: Product, PantryItem, MealPlan, etc.
│       └── utils.ts           # cn(), todayISO(), weekStartISO()
```

---

## Data flow

### Pantry — adding an item
1. User taps Scan → `BarcodeScanner` (camera, `@zxing/browser`) fires `onDetected(barcode)`
2. `GET /api/barcode?barcode=X` — checks local DB first, then Open Food Facts
3. **Found** → `AddProductSheet` — user sets quantity → `POST /api/pantry`
4. **Not found** → `OcrSheet` — user photographs Nährwertangaben label →
   `POST /api/ocr` (image → Claude Vision → macros JSON) →
   user fills in product names → `POST /api/barcode` (saves custom Product) →
   `POST /api/pantry`

### Meal planning
1. User taps "Plan Week" → `POST /api/meal-plan`
2. API fetches pantry items + user profile, builds prompt via `mealPlanPrompt()`
3. Claude Haiku returns structured JSON: 7 days × { breakfast, lunch, dinner, snack }
   each with `{ name, ingredients[], macros, recipe }`
4. Saved to `MealPlan` table, returned to client
5. User navigates days via pill tabs, expands meal cards to see recipe + ingredients

### Grocery list
1. From planner: "Generate Grocery List" → deduplicates all ingredients across 7 days →
   `POST /api/grocery` with `meal_plan_id` + items array
2. `/grocery` page loads list for latest meal plan
3. Tap items to check/uncheck → `PATCH /api/grocery`

### Macro tracker
1. `/tracker` loads today's logs (`GET /api/log?date=YYYY-MM-DD`) + profile + pantry
2. Shows 4 macro progress bars (calories/protein/carbs/fat) vs. profile targets
3. Per-meal "+ Add" → `AddLogSheet` (select from pantry, set quantity) → `POST /api/log`
4. Macros are calculated client-side: `quantity / 100 × product.macros`

---

## Database models (Prisma 7, SQLite)

```
Product       id, barcode*, name_de, name_en, calories, protein, carbs, fat,
              serving_size?, serving_unit?, source, photo_path?, created_at
PantryItem    id, product_id→Product, quantity, unit, added_at
UserProfile   id, calories, protein, carbs, fat, preferences(JSON str), updated_at
MealPlan      id, week_start, plan(JSON str), generated_at
GroceryList   id, meal_plan_id*→MealPlan, items(JSON str), checked_items(JSON str), created_at
MacroLog      id, date(YYYY-MM-DD), meal_name, product_id→Product, quantity, logged_at
```

**Prisma 7 quirks:**
- Generator is `prisma-client` (not `prisma-client-js`); outputs to `src/generated/prisma/`
- Import as: `import { PrismaClient } from "@/generated/prisma/client"` (not the directory root)
- Requires driver adapter — `new PrismaClient({ adapter })` where adapter is `PrismaBetterSqlite3`
- Datasource URL is in `prisma.config.ts`, not in `schema.prisma`
- After any schema change: `npx prisma migrate dev --name <desc>` then `npx prisma generate`

---

## AI usage (Claude Haiku)

All AI calls are server-side in `src/app/api/` routes. Prompts live in `src/lib/prompts.ts`.

| Route | What it does |
|---|---|
| `POST /api/meal-plan` | Sends pantry + profile to Claude, gets 7-day JSON plan |
| `POST /api/ocr` | Sends base64 nutrition label image, gets `{calories, protein, carbs, fat, serving_size, serving_unit}` |

Claude Haiku is used for both — it's 20× cheaper than Sonnet and sufficient for structured JSON tasks.
The OCR prompt is designed for German labels (Nährwertangaben, Eiweiß, Kohlenhydrate, Fette).

---

## Key product decisions
- **Language:** Product `name_de` stores German name as-is; `name_en` stores English translation. UI is English.
- **Macro math:** All macros stored per 100g/ml. Client multiplies by `quantity / 100` to get actual values.
- **JSON in SQLite:** `MealPlan.plan`, `GroceryList.items`, `UserProfile.preferences` are stored as JSON strings — parse them after fetching.
- **No auth:** Solo user, skip entirely.
- **No Docker/multi-container:** Single LXC, single `npm start` process.

---

## Environment variables

```
DATABASE_URL=file:/data/food-central.db   # prod path; dev uses file:./dev.db
CLAUDE_API_KEY=                           # Anthropic API key
PHOTO_STORAGE_PATH=/data/photos           # not yet wired — reserved for label photo storage
```

---

## Common commands

```bash
# Dev
npm run dev                              # dev server (Turbopack, port 3000)
npx tsc --noEmit                         # type-check (always run before pushing — build skips this on server)
npm run build                            # production build

# Prisma
npx prisma migrate dev --name <name>     # create + apply new migration (dev only)
npx prisma migrate deploy                # apply pending migrations (prod)
npx prisma generate                      # regenerate client after schema change
npx prisma studio                        # DB browser UI
```

---

## Deploying updates to production

### Code-only change (no schema change)
```bash
# 1. local — push to GitHub
git push

# 2. on container (as foodcentral)
cd ~/app
git pull
npm ci                        # only needed if package.json changed; safe to always run
npm run build
sudo systemctl restart food-central
```

### Schema change (new migration)
```bash
# 1. local — create and test the migration
npx prisma migrate dev --name <description>   # creates migration SQL + updates local dev.db
npx tsc --noEmit                              # verify types still pass
git add prisma/migrations prisma/schema.prisma
git commit -m "feat: <description>"
git push

# 2. on container (as foodcentral)
cd ~/app
git pull
npm ci
npx prisma migrate deploy     # applies new migration to /data/food-central/food-central.db
npx prisma generate           # regenerates client from new schema
npm run build
sudo systemctl restart food-central
```

> **Important:** Never edit migration SQL files after they've been committed — Prisma tracks their checksums.
> If you need to fix a migration, create a new one instead.

### Checking the service after deploy
```bash
sudo systemctl status food-central
journalctl -u food-central -n 30 --no-pager
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000   # should return 200
```

### DB backup (run on container as root)
```bash
sqlite3 /data/food-central/food-central.db ".backup /data/food-central/backups/food-central-$(date +%F).db"
```

### Build note
`next.config.ts` has `typescript.ignoreBuildErrors: true` — the server doesn't have enough RAM for the TS build worker. Always run `npx tsc --noEmit` locally before pushing to catch type errors.

---

## What to avoid
- No client-side AI calls — always through API routes
- No auth system — skip it
- No Docker Compose or multi-container — single LXC process
- Don't add a Recipe model — meal plan JSON stored in `MealPlan.plan` is sufficient
- Don't re-read files you just edited to verify — trust the tool's success response
