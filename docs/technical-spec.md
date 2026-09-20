# Technical Specification

## 1. Product goal

Cheff is a mobile-first meal-planning and grocery-list application designed to replace the core workflow of Mealime while staying lightweight, offline-capable, and easy to self-host.

The MVP targets a single-user scenario, with a clear architectural path toward future household collaboration.

---

## 2. Core user experience

The primary workflow is:

1. User searches for recipes or uploads a custom one.
2. User chooses recipes for a meal plan.
3. User selects servings for each recipe.
4. App calculates required grocery ingredients.
5. User reviews aggregated grocery list.
6. User adds manual items if needed.
7. User checks off items while shopping.
8. Offline grocery actions remain available and sync when back online.

---

## 3. Functional requirements

### 3.1 Recipe management

A recipe contains:

- title
- description or summary
- servings minimum and maximum
- default serving count
- image
- ingredients
- cookware/tools
- instructions
- manual nutrition facts
- keywords / tags
- source type: built-in or custom
- created date / modified date

A recipe must support:

- create
- read
- update
- delete
- duplicate
- scale to a selected serving count

### 3.2 Ingredient model

Each ingredient entry includes:

- recipe_id
- ingredient name
- quantity
- unit
- optional note
- display order

Ingredient normalization is required for grocery aggregation. At minimum, the model should support:

- canonical ingredient name
- normalized alias or synonym mapping
- unit normalization where practical

The grocery list should aggregate by normalized ingredient name and unit. Example:

- multiple recipes containing tomatoes should combine into one grocery line
- total quantity equals the sum across the selected meal plan
- the list should retain traceability to originating recipes

### 3.3 Meal plan model

A meal plan contains:

- user_id
- name
- created date
- list of assigned recipes
- chosen servings per recipe
- optional meal type categories

Meal plan recipe entries include:

- meal_plan_id
- recipe_id
- servings
- meal type (optional in MVP)
- notes if needed

### 3.4 Grocery list model

A grocery list includes:

- user_id
- generated items from meal plan recipes
- manual items added by the user
- item quantity
- unit
- checked_off or unchecked state
- ingredient/recipe provenance
- created and modified timestamps

The behavior is:

- user can add extra items beyond meal-plan ingredients
- each item can be checked off individually
- if a generated item is adjusted manually, the app should keep a record of whether it is derived from a recipe or user-entered

### 3.5 Nutrition model

Each recipe includes nutrition values manually entered at the recipe level, for example:

- calories
- protein
- carbs
- fat
- fiber

Missing nutrition data should be handled gracefully:

- display as “Not available” or omit the field
- do not block recipe creation or meal plan behavior

### 3.6 Search requirements

Users can search by:

- recipe title
- keywords/tags
- ingredient names
- recipe text snippets (optional in MVP)

Search should support at least:

- contains-based title matching
- ingredient-aware filtering
- keyword tags

### 3.7 Custom recipe upload

Custom recipe upload supports:

- image upload from camera or photo library
- OCR-assisted extraction
- parsed recipe draft review
- user-approved save

The app should allow the user to edit the extracted result before saving.

---

## 4. Non-functional requirements

### 4.1 Mobile and accessibility

- app works reliably on iPhone-sized screens
- touch-friendly controls for recipe browsing and grocery editing
- fast page loads and simple navigation
- PWA should be installable and usable in Safari

### 4.2 Offline support

Offline functionality is required at least for:

- viewing grocery list
- adding new grocery items
- checking off items
- editing local grocery states

The app does not need full offline recipe editing in the MVP, but local caching of recently viewed recipes is a good enhancement.

### 4.3 Reliability

- grocery list mutation must persist even without connectivity
- sync logic should be queued and retried
- app must not lose user edits when offline

### 4.4 Performance

- recipe list should feel responsive on mobile
- grocery list aggregation should be quick for a modest recipe count
- image upload should not block essential flows

---

## 5. Architecture overview

### 5.1 Client-side app

Recommended stack:

- React + TypeScript
- Vite for app build tooling
- PWA features with service workers
- IndexedDB for offline grocery data

Responsibilities:

- recipe browsing and search
- recipe detail display
- meal-plan builder
- grocery list rendering and editing
- custom recipe upload UI
- local queue management for offline actions

### 5.2 API layer

Recommended stack:

- Python
- FastAPI
- Pydantic for request validation
- SQLAlchemy or SQLModel for database access

Responsibilities:

- recipe operations
- meal plan storage
- grocery generation
- user auth (future)
- image upload processing
- OCR orchestration

### 5.3 Data layer

Recommended database:

- PostgreSQL

Primary entities:

- recipes
- ingredients
- tools
- instructions
- nutrition facts
- meal plans
- meal plan recipe links
- grocery lists
- grocery list items
- uploads
- users (future)

### 5.4 Offline-first storage

The app uses a local-first pattern:

- app shell is cached by service worker
- grocery data persists in IndexedDB
- user actions are captured locally and queued for sync
- online mode sends queued changes to backend

This ensures shopping tasks remain usable offline.

---

## 6. Data model details

### 6.1 Recipe table

Fields:

- id
- title
- description
- default_servings
- servings_min
- servings_max
- image_url
- source_type
- created_by
- created_at
- updated_at

### 6.2 Ingredient table

Fields:

- id
- recipe_id
- normalized_name
- display_name
- quantity
- unit
- is_optional
- sort_order
- notes

### 6.3 Tool table

Fields:

- id
- recipe_id
- name

### 6.4 Instruction table

Fields:

- id
- recipe_id
- step_number
- text

### 6.5 Nutrition table

Fields:

- id
- recipe_id
- calories
- protein_g
- carbs_g
- fat_g
- fiber_g
- notes

### 6.6 MealPlan table

Fields:

- id
- user_id
- name
- created_at
- updated_at

### 6.7 MealPlanRecipe table

Fields:

- id
- meal_plan_id
- recipe_id
- servings
- meal_type
-
### 6.8 GroceryList table

Fields:

- id
- user_id
- name
- created_at
- updated_at

### 6.9 GroceryListItem table

Fields:

- id
- grocery_list_id
- normalized_name
- display_name
- quantity
- unit
- checked_off
- source_type (recipe_generated or manual)
- source_recipe_id (nullable)
- source_recipe_name (nullable)
- created_at
- updated_at

This preserves both aggregation and provenance.

---

## 7. Grocery aggregation design

This is a core requirement.

### Behavior

If multiple Meal Plan recipes include tomatoes, then the grocery list should show a single tomatoes row with the total quantity across all recipes.

Implementation approach:

1. For each selected recipe and serving amount, compute ingredient quantities.
2. Normalize ingredient names to a canonical value.
3. Group by canonical ingredient + unit.
4. Sum quantities.
5. Preserve a list of source recipes that contributed to the item.
6. Render a single grocery item with aggregated total.

Example:

- Recipe A: tomatoes 2 cups
- Recipe B: tomatoes 1.5 cups
- Grocery item: tomatoes 3.5 cups
- Sources: Recipe A, Recipe B

### Normalization rules

Normalization should happen at recipe-creation time where possible:

- “cherry tomatoes” and “tomatoes” may map to same canonical ingredient
- “garlic clove” vs “garlic” may be either merged or kept distinct depending on business rules
- the system should avoid over-merging ingredients that are not actually interchangeable

A safe default is to merge only when the ingredient is effectively the same item in a grocery shopping context.

---

## 8. Recipe scaling algorithm

Each recipe stores:

- default_servings
- servings_min
- servings_max

When scaling a recipe to a target servings count:

- compute scale_factor = target_servings / default_servings
- multiply each ingredient quantity by scale_factor
- multiply recipe nutrition totals by scale_factor
- leave instructions and cookware unchanged

Example:

- default_servings = 4
- target_servings = 6
- scale_factor = 1.5

### Behavior for edge cases

- if target_servings is outside the allowed range, reject or warn the user
- if quantities include fractions, round to a display-friendly precision
- avoid introducing extremely long decimals; round to 1/4, 1/3, 1/2, or 1 decimal depending on ingredients

---

## 9. Search system design

### Search indexes

Search should operate against:

- recipe title
- keywords/tags
- ingredient names
- normalized ingredient names

### MVP search logic

- exact or fuzzy match on title
- ingredient-based filter using normalized names
- keyword lookup by tags or manual keywords
- recipe listings can be sorted by relevance and newest

### Example queries

- “chicken pasta”
- ingredients containing “tomato” and “basil”
- keywords: “quick”, “dinner”, “family"

### Data structure recommendation

Use PostgreSQL full-text search or a simple case-insensitive text search for the MVP. A dedicated search engine is not required yet.

---

## 10. Custom recipe upload and OCR workflow

### 10.1 Upload flow

1. User taps “Add Recipe”.
2. User chooses camera or photo library.
3. App uploads the image to backend.
4. Backend runs OCR processing.
5. Extracted text is converted into a recipe draft.
6. User reviews and edits the parsed data.
7. User saves the final recipe.

### 10.2 OCR provider options

Recommended options:

- Azure AI Vision
- Google Cloud Vision
- Tesseract for self-hosted fallback

### 10.3 Parsing strategy

The system should parse text into:

- title
- servings
- ingredients list
- instructions
- optional cookware list

It should not assume the OCR result is perfectly accurate. A manual review step is mandatory before save.

### 10.4 Implementation considerations

- store raw uploaded image securely
- store extracted text as draft metadata
- keep OCR processing asynchronous if volume grows
- allow user to re-run extraction if the result is poor

---

## 11. Offline sync strategy

### Goal

Only grocery list editing is required offline in the MVP.

### Local behavior

- Grocery list items are stored in IndexedDB
- modifications are written immediately
- sync queue tracks pending create/update/delete actions

### Sync sequence

When connection is restored:

1. app detects online status
2. sends queued operations to backend API
3. backend applies operations and confirms success
4. local queue is cleared
5. if conflict arises, it is resolved using a simple merge strategy

### Conflict handling

Recommended conflict rules for MVP:

- last-write-wins for single-item fields
- grocery item ownership is user-specific
- no complex multi-user merge logic required for single-user MVP

---

## 12. Cloud hosting model

The product can be hosted in a cloud environment, or fully self-hosted. The cloud model is useful for easier scaling, backups, and less local maintenance.

### 12.1 Recommended cloud approach

Use a managed platform with four major services:

1. frontend hosting for the web app
2. backend API hosting
3. managed PostgreSQL database
4. object storage for uploaded recipe images

### 12.2 Example hosting layout

- Frontend: Vercel, Netlify, or static hosting with CDN
- Backend: Render, Railway, Fly.io, Azure App Service, or DigitalOcean App Platform
- Database: managed PostgreSQL on Render, Supabase, DigitalOcean, or Azure Database
- Image storage: S3-compatible storage or Azure Blob Storage
- OCR pipeline: separate worker service or cloud vision API

### 12.3 Process to deploy to cloud

1. Build the frontend and backend as separate deployable units.
2. Set up environment variables for database connection, secret keys, and cloud credentials.
3. Provision PostgreSQL with regular backups.
4. Configure a production image bucket.
5. Set up a reverse proxy and HTTPS termination if self-hosted.
6. Deploy backend API and connect it to the database.
7. Deploy frontend against the API base URL.
8. Configure CI/CD for automated deployment.
9. Set up health checks and error monitoring.
10. Add a staging environment before production release.

### 12.4 Estimated cloud costs

Costs vary by provider and usage, but a realistic MVP cloud estimate is:

- managed PostgreSQL: $10–40/month
- backend hosting: $10–30/month
- static frontend hosting: $0–20/month
- object storage: $5–20/month depending on image volume
- OCR processing: highly variable; usually $0–50+/month for light usage, higher with heavy photo uploads
- monitoring and backups: $5–20/month

A realistic MVP cloud budget is often in the range of:

- low usage: $30–100/month
- moderate usage: $100–250/month

This range assumes a small application with modest data volume and limited OCR use.

### 12.5 Self-hosted alternative

For local-first use, the app can run on a Raspberry Pi or small home server:

- backend and database on the same device
- local network access from a phone or browser
- optional cloud-only backup or remote access if needed

Advantages:

- lower recurring cloud cost
- easier privacy control
- good fit for local household use

Trade-offs:

- requires maintenance
- uptime and reliability depend on local hardware
- remote access must be handled carefully

### 12.6 Recommendation

For the MVP, a hybrid model is best:

- keep the app architecture cloud-ready
- allow either self-hosted local deployment or cloud deployment
- implement the code so the backend is portable between environments

This reduces lock-in and gives flexibility as the project grows.

---

## 13. Security and privacy

### Requirements

- store user-specific recipes and grocery data under a user ownership model
- restrict access to recipe uploads and meal plans to their creator by default
- encrypt or protect local image uploads before storage
- ensure secure API authentication later when multi-user support is added

### MVP privacy posture

Because the app starts as a personal tool, a single-user model can keep this simpler. The architecture should still be prepared for user accounts and access control.

---

## 14. Future-readiness

The system should be structured so future features are possible without redesign:

- user accounts and household collaboration
- normalized ingredient catalog
- recipe import from public or shared sources
- pantry and leftovers features
- recommendation logic
- meal-planning with dietary preferences

The API and database schema should remain extensible.

---

## 15. MVP backlog summary

### Must-have

- recipe database with scaling
- custom recipe upload with review
- search by title, keyword, ingredient
- meal plan builder
- aggregated grocery list generation
- manual grocery item support
- offline grocery check-off

### Should-have

- ingredient normalization helpers
- recipe provenance tracking in grocery items
- image gallery support
- basic nutrition display

### Nice-to-have

- advanced tag filters
- store aisle grouping
- recipe import from external source URLs

---

## 16. Recommended implementation order

1. Backend foundation and recipe data model
2. Search and recipe details
3. Meal plan creation
4. Grocery generation logic
5. Offline grocery editing and sync
6. Custom recipe upload with review
7. Production deployment and stabilization

This order delivers the highest-value workflow first and minimizes risk.
