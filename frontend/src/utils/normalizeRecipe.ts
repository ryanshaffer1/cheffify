import type { Recipe } from '../types/recipe'

export const normalizeRecipe = (item: any): Recipe => {
  const defaultServings = Number(item.default_servings ?? item.servings ?? 2) || 2
  const servingsMin = item.servings_min == null ? null : Number(item.servings_min) || 1
  const servingsMax = item.servings_max == null ? null : Number(item.servings_max) || defaultServings

  return {
    id: Number(item.id),
    title: item.title || 'Untitled recipe',
    description: item.description || 'Custom recipe',
    servings: defaultServings,
    defaultServings,
    servingsMin,
    servingsMax,
    imageUrl: item.image_url ?? item.imageUrl ?? null,
    source: typeof item.source === 'string' ? item.source : null,
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
    ingredients: Array.isArray(item.ingredients)
      ? item.ingredients.map((ingredient: any) => ({
          id: Number.isInteger(ingredient.id) ? Number(ingredient.id) : undefined,
          display_name: ingredient.display_name || ingredient.normalized_name || 'Ingredient',
          normalized_name: ingredient.normalized_name || ingredient.display_name || 'ingredient',
          quantity: Number(ingredient.quantity ?? 1),
          unit: ingredient.unit || 'item',
          notes: ingredient.notes ?? null,
          is_optional: Boolean(ingredient.is_optional),
        }))
      : [],
    instructions: Array.isArray(item.instructions)
      ? item.instructions
          .map((instruction: any, index: number) => {
            const ingredientIds: number[] = Array.isArray(instruction.ingredient_ids)
              ? instruction.ingredient_ids.filter((id: unknown): id is number => Number.isInteger(id))
              : []
            const ingredientNames = Array.isArray(instruction.ingredient_names)
              ? instruction.ingredient_names.map((name: unknown) => String(name).trim()).filter(Boolean)
              : []
            const ingredientNameById = new Map<number, string>()
            item.ingredients
              .filter((ingredient: any) => Number.isInteger(ingredient.id))
              .forEach((ingredient: any) => {
                ingredientNameById.set(Number(ingredient.id), String(ingredient.display_name || ingredient.normalized_name || '').trim())
              })

            return {
              step_number: Number(instruction.step_number ?? index + 1),
              instruction: String(instruction.instruction ?? '').trim(),
              ingredient_ids: ingredientIds,
              ingredient_names: ingredientNames.length
                ? ingredientNames
                : ingredientIds
                    .map((id: number): string | undefined => ingredientNameById.get(id))
                    .filter((name): name is string => Boolean(name)),
            }
          })
          .filter((instruction: { instruction: string }) => instruction.instruction)
      : [],
    tools: Array.isArray(item.tools)
      ? item.tools.map((tool: string) => String(tool).trim()).filter(Boolean)
      : [],
    nutrition: item.nutrition
      ? {
          calories: item.nutrition.calories == null ? null : Number(item.nutrition.calories),
          protein_g: item.nutrition.protein_g == null ? null : Number(item.nutrition.protein_g),
          carbs_g: item.nutrition.carbs_g == null ? null : Number(item.nutrition.carbs_g),
          fat_g: item.nutrition.fat_g == null ? null : Number(item.nutrition.fat_g),
          fiber_g: item.nutrition.fiber_g == null ? null : Number(item.nutrition.fiber_g),
          notes: item.nutrition.notes ?? null,
        }
      : null,
  }
}