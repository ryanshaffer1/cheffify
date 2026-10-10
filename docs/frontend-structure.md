# Frontend Structure and Responsibilities

The frontend is organized around **ownership**, not just file size. A component should render a focused part of the interface; a hook should own reusable UI state and behavior; a service should handle an external boundary such as an API request; shared types describe the data passed between those layers; and utilities hold stateless transformations.

`App.tsx` is the coordinator. It chooses the active view, connects application-level state, and passes data and callbacks between views. It should not become the default home for detailed form rendering, domain-specific state transitions, API parsing, or formatting logic. Keep logic in `App` when it genuinely coordinates multiple areas of the application.

## Directory Map

- `src/components/`: User-interface pieces and views. Start here to change how a screen or reusable visual element is rendered. The recipe form, recipe detail, meal-plan, and grocery views live here.
- `src/hooks/`: Stateful frontend workflows. Start here when changing state transitions or behavior tied to a view, such as recipe editor state, meal-plan actions, grocery editing, or import queue handling.
- `src/services/`: External operations and adapters. Start here for API requests, file extraction requests, or translating an external response into an application-facing result.
- `src/types/`: Shared TypeScript contracts. Start here when changing recipe, ingredient, grocery, editor-row, or form-field shapes used across modules.
- `src/utils/`: Stateless helpers. Start here for normalization, formatting, aggregation, and other transformations that do not need React state or perform I/O.
- `src/App.tsx`: Application composition and cross-view coordination, including choosing which view is active and connecting workflows to the recipe list.
- `src/App.css` and `src/index.css`: App-specific and global styling.

## Finding the Right Starting Point

- To change recipe detail rendering, begin with `components/RecipeDetailPanel.tsx`.
- To change edit/upload form fields or their shared layout, begin with `components/RecipeFormViews.tsx`.
- To change editor row behavior, imported values applied to the form, or edit-form state, begin with `hooks/useRecipeEditor.ts`.
- To change accepted import formats, file queue behavior, or recipe extraction requests, begin with `hooks/useRecipeImport.ts` and `services/recipeImport.ts`.
- To change recipe response normalization, begin with `utils/normalizeRecipe.ts`.
- To change meal-plan or grocery screens, begin with `components/MealPlanView.tsx` or `components/GroceryView.tsx`; their stateful behavior is in `hooks/useMealPlan.ts` or `hooks/useGroceries.ts`.
- To change serving, ingredient, or grocery formatting and normalization, begin with the relevant module in `utils/`.
- To change how views are selected or coordinated with the rest of the app, begin with `App.tsx`.

## Boundaries to Preserve

- Keep rendering concerns in components and stateful workflows in hooks. Components may own small, local presentation state, such as whether a confirmation dialog is open.
- Keep network and file-extraction work in services or workflow hooks, not inside display-only components.
- Keep shared data shapes in `types/`, rather than duplicating structurally similar contracts across components.
- Pass values into forms as state. Avoid querying rendered inputs to populate or update them; imported or loaded data should update the form state that controls those inputs.
- Prefer narrow props and clear ownership. If a component requires a long list of unrelated callbacks, consider whether a cohesive hook result or a smaller component boundary would make the responsibilities clearer.
- Preserve the existing API, local-first behavior, and import/save lifecycle when reorganizing files. A structural refactor should not silently change product behavior.
