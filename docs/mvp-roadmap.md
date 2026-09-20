# MVP Roadmap

## Goal

Launch a simple, dependable meal-planning app focused on the core workflow:

1. maintain a recipe database
2. create a meal plan
3. generate an aggregated grocery list
4. allow offline grocery checks while shopping
5. support custom recipe uploads with manual review

The MVP is intentionally scoped to a single-user experience, with structure in place for future household collaboration.

---

## Phase 0: Product definition and validation

### Scope

- confirm the core user workflow
- define recipe data structure
- define grocery list aggregation behavior
- decide whether recipe import OCR is required in the first release

### Deliverables

- approved recipe schema
- approved grocery-list behavior
- MVP feature list
- initial app naming shortlist

### Success criteria

- user can add a recipe and view it in a mobile-friendly format
- user can create a meal plan from recipes
- user can generate a grocery list with aggregated quantities
- user can edit the grocery list offline

---

## Phase 1: Core data model and backend foundation

### Features

- recipe CRUD API
- ingredient, tool, instruction, and nutrition storage
- basic recipe scaling by servings
- user profile and recipe ownership model
- meal plan creation and storage
- grocery list generation logic

### Technical work

- set up Python backend (FastAPI)
- configure PostgreSQL schema
- implement repository/service layer for recipes and meal plans
- create API contracts for recipe and grocery-list operations
- define ingredient normalization rules

### Success criteria

- API can create, read, update, and delete recipes
- recipe quantities can be scaled for selected servings
- grocery list can be generated from multiple recipes without duplicates

---

## Phase 2: Frontend and mobile UX

### Features

- mobile-first dashboard
- recipe search by title, keyword, and ingredient
- recipe detail view with ingredients, instructions, cookware, and nutrition
- meal plan builder with selected recipes
- grocery list view with check-off state

### Technical work

- build responsive PWA shell
- implement recipe search UI and filters
- implement meal-plan selection flow
- build grocery list rendering and aggregation UI
- design offline-first local storage layer for grocery actions

### Success criteria

- app is usable on an iPhone browser
- recipe browsing feels fast and clear
- grocery list can be edited without connectivity

---

## Phase 3: Offline grocery support

### Features

- local grocery list storage
- add custom grocery items
- check/uncheck state persistence
- sync queued changes when connection returns

### Technical work

- add IndexedDB local persistence
- implement service worker for app shell caching
- write sync queue for change tracking
- create conflict rules for offline edits

### Success criteria

- user can add an item to the grocery list while offline
- checked items persist across refreshes and restarts
- sync completes automatically when online

---

## Phase 4: Custom recipe upload and OCR-assisted import

### Features

- upload camera or gallery image
- OCR extraction of recipe text
- parse title, ingredients, instructions, and servings
- review-and-edit parsed recipe before save
- save user custom recipes

### Technical work

- add file upload endpoint
- integrate OCR provider
- build parsing and normalization layer
- design review UI for editing extracted recipe data

### Success criteria

- user can upload a recipe photo
- system produces a usable structured draft
- user can fix the draft before saving
- saved custom recipe participates in normal search and meal-plan flows

---

## Phase 5: Release readiness

### Features

- polish UI for recipe and meal plan flows
- test case coverage for recipe scaling, grocery aggregation, and offline behavior
- validation for image upload and OCR review flow
- documentation and onboarding

### Technical work

- end-to-end testing
- basic telemetry and error logging
- performance tuning
- deployment configuration

### Success criteria

- core user flow works reliably
- grocery list is stable offline
- user can complete a recipe-to-meal-plan-to-shopping workflow without issue

---

## Initial MVP acceptance criteria

The MVP is successful when a user can:

- create a recipe with name, ingredients, instructions, tools, servings range, nutrition, and image
- search by title, keywords, and ingredient
- create a meal plan from recipes
- generate a grocery list from those recipes with aggregated ingredient quantities
- manually add extra grocery items
- check off items while shopping in offline mode
- upload and save a custom recipe from a photo

---

## Out-of-scope for MVP

- multi-user household collaboration
- public recipe sharing
- calendar-based recurring meal plans
- pantry tracking
- nutrition calculation from raw ingredients
- AI meal recommendation
- advanced grocery store aisle grouping

---

## Recommended delivery order

1. recipe schema and backend
2. search and recipe detail UI
3. meal plan and grocery generation
4. offline grocery list editing
5. custom recipe upload
6. release polish and stabilization

This ordering reduces risk while delivering the most important user value early.
