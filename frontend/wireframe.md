# Frontend Wireframe

## 1. App shell

- Top navigation bar with title: Cheffify
- Bottom tab bar:
  - Recipes
  - Meal Plan
  - Grocery List
  - Upload

## 2. Recipes screen

- Search bar at top
- Filter chips:
  - All
  - Favorites
  - Quick
  - Vegetarian
  - High Protein
- Recipe cards in a scrollable list:
  - recipe image
  - title
  - short summary
  - servings label
  - nutrition summary (optional)
  - add to meal plan button

## 3. Recipe detail screen

- large recipe image
- title and short blurb
- servings selector
- ingredients list with checkboxes or quantity display
- tool list
- cooking instructions in numbered list
- nutrition panel with calories/protein/carbs/fat/fiber
- add to meal plan action

## 4. Meal plan screen

- list of selected recipes for current plan
- each card shows:
  - recipe title
  - servings count
  - remove button
- total grocery summary button
- create or reset meal plan action

## 5. Grocery list screen

- aggregate ingredient list with quantities
- each item has:
  - ingredient name
  - quantity + unit
  - source recipe badges
  - checkbox to mark checked off
- manual add item button
- offline status indicator
- sync status chip (online/offline)

## 6. Upload screen

- camera or photo library button
- selected image preview
- OCR extraction progress state
- parsed recipe draft form:
  - title
  - ingredients
  - instructions
  - servings
  - nutrition
- save custom recipe button

## 7. Offline handling

- grocery list remains editable while offline
- add custom item button remains available offline
- item check state persists locally
- sync icon indicates pending changes

## 8. Simple interaction flow

1. Search recipe
2. Open recipe
3. Adjust servings
4. Add to meal plan
5. View grocery list
6. Check off items while shopping
7. Add manual items as needed
8. Upload custom recipe from photo when desired

---

## Suggested screen hierarchy

- Splash or onboarding (optional)
- Recipes
  - Recipe Detail
- Meal Plan
- Grocery List
- Upload Recipe

This structure matches the MVP priority and keeps the app simple and mobile-friendly.
