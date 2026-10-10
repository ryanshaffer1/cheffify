import type { GroceryItem, Recipe, RecipeIngredient } from '../types/recipe'
import { normalizeDisplayName } from './text'

const BACKEND_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '')

export const makeIngredient = (
  display_name: string,
  quantity: number,
  unit: string,
  notes: string | null = null,
  is_optional = false,
): RecipeIngredient => ({
  display_name,
  normalized_name: display_name.toLowerCase(),
  quantity,
  unit: unit && unit.toLowerCase() !== 'item' ? unit : '',
  notes,
  is_optional,
})

export const normalizeIngredientUnit = (unit: string): string => {
  const normalized = (unit || '').trim().toLowerCase()
  if (!normalized || normalized === 'item') return ''

  const singularMap: Record<string, string> = {
    cup: 'cup', cups: 'cup', tablespoon: 'tablespoon', tablespoons: 'tablespoon', tbsp: 'tbsp',
    teaspoon: 'teaspoon', teaspoons: 'teaspoon', tsp: 'tsp', ounce: 'oz', ounces: 'oz', oz: 'oz',
    pound: 'lb', pounds: 'lb', lb: 'lb', lbs: 'lb', whole: 'whole', piece: 'piece', pieces: 'piece',
    slice: 'slice', slices: 'slice', clove: 'clove', cloves: 'clove', head: 'head', heads: 'head',
    can: 'can', cans: 'can', bunch: 'bunch', bunches: 'bunch', sprig: 'sprig', sprigs: 'sprig',
    gram: 'g', grams: 'g', g: 'g', litre: 'l', liters: 'l', liter: 'l', litres: 'l', l: 'l',
    milliliter: 'ml', milliliters: 'ml', ml: 'ml',
  }

  return singularMap[normalized] ?? normalized
}

export const resolveImageUrl = (imageUrl?: string | null): string | null => {
  if (!imageUrl) return null
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl
  if (imageUrl.startsWith('/')) return `${BACKEND_BASE_URL}${imageUrl}`
  return `${BACKEND_BASE_URL}/${imageUrl}`
}

const toTitleCase = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLowerCase().split(' ')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : '')).join(' ')

const formatQuantityForDisplay = (quantity: number): string => {
  const numeric = Number(quantity)
  return Number.isInteger(numeric) ? String(numeric) : numeric.toString()
}

const formatUnitForDisplay = (unit: string, quantity: number): string => {
  const normalized = normalizeIngredientUnit(unit).toLowerCase()
  if (!normalized) return ''

  const singularMap: Record<string, string> = {
    cup: 'cup', cups: 'cup', tablespoon: 'tablespoon', tablespoons: 'tablespoon', tbsp: 'tbsp',
    teaspoon: 'teaspoon', teaspoons: 'teaspoon', tsp: 'tsp', oz: 'oz', lb: 'lb', lbs: 'lb',
    whole: 'whole', piece: 'piece', pieces: 'piece', slice: 'slice', slices: 'slice', clove: 'clove',
    cloves: 'clove', head: 'head', heads: 'head', can: 'can', cans: 'can', bunch: 'bunch',
    bunches: 'bunch', sprig: 'sprig', sprigs: 'sprig',
  }
  const singular = singularMap[normalized] ?? normalized
  if (Number(quantity) === 1) return singular

  const pluralMap: Record<string, string> = {
    cup: 'cups', tablespoon: 'tablespoons', tbsp: 'tbsp', teaspoon: 'teaspoons', tsp: 'tsp',
    oz: 'oz', lb: 'lb', whole: 'whole', piece: 'pieces', slice: 'slices', clove: 'cloves',
    head: 'heads', can: 'cans', bunch: 'bunches', sprig: 'sprigs',
  }
  return pluralMap[singular] ?? (singular.endsWith('s') ? singular : `${singular}s`)
}

export const formatIngredient = (ingredient: RecipeIngredient | null | undefined): string => {
  if (!ingredient) return 'Ingredient'
  const quantity = Number(ingredient.quantity)
  const unit = formatUnitForDisplay(ingredient.unit || '', quantity)
  const displayName = normalizeDisplayName(ingredient.display_name)
  const base = unit
    ? `${formatQuantityForDisplay(quantity)} ${unit} ${displayName}`
    : `${formatQuantityForDisplay(quantity)} ${displayName}`
  return base.trim()
}

export const getRecipeDefaultServings = (recipe: Pick<Recipe, 'servings' | 'defaultServings'>): number =>
  Number(recipe.defaultServings || recipe.servings || 1) || 1

export const getRecipeServingRangeText = (
  recipe: Pick<Recipe, 'servings' | 'defaultServings' | 'servingsMin' | 'servingsMax'>,
): string => {
  const defaultServings = getRecipeDefaultServings(recipe)
  const minServings = Number(recipe.servingsMin ?? defaultServings)
  const maxServings = Number(recipe.servingsMax ?? defaultServings)
  return minServings > 1 || maxServings > defaultServings
    ? `Serves ${minServings}-${maxServings}`
    : `Serves ${defaultServings}`
}

export const formatNutritionValue = (value: number | null | undefined, servings: number): string => {
  if (value == null || !Number.isFinite(value)) return '—'
  const perServingValue = servings > 0 ? value / servings : value
  return Number.isInteger(perServingValue) ? String(perServingValue) : perServingValue.toFixed(1)
}

export const formatGroceryItemText = (
  item: GroceryItem | { name: string; checked: boolean; source?: string[]; quantity?: number; unit?: string | null },
) => {
  const name = toTitleCase(item.name)
  const quantity = Number(item.quantity ?? 0)
  const unit = formatUnitForDisplay(item.unit || '', quantity)
  return {
    name,
    meta: item.quantity && item.unit && item.unit.toLowerCase() !== 'item'
      ? `${formatQuantityForDisplay(quantity)} ${unit}`
      : item.quantity ? formatQuantityForDisplay(quantity) : '',
  }
}