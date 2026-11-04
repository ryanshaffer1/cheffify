import type { GroceryItem, Recipe, RecipeIngredient } from '../types/recipe'
import { normalizeDisplayName, toTitleCase } from './text'

const BACKEND_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '')

type UnitForms = { normalized: string; singular: string; plural: string }

const UNIT_FORMS: Record<string, UnitForms> = {
  cup: { normalized: 'cup', singular: 'cup', plural: 'cups' },
  cups: { normalized: 'cup', singular: 'cup', plural: 'cups' },
  tablespoon: { normalized: 'tablespoon', singular: 'tablespoon', plural: 'tablespoons' },
  tablespoons: { normalized: 'tablespoon', singular: 'tablespoon', plural: 'tablespoons' },
  tbsp: { normalized: 'tbsp', singular: 'tbsp', plural: 'tbsp' },
  teaspoon: { normalized: 'teaspoon', singular: 'teaspoon', plural: 'teaspoons' },
  teaspoons: { normalized: 'teaspoon', singular: 'teaspoon', plural: 'teaspoons' },
  tsp: { normalized: 'tsp', singular: 'tsp', plural: 'tsp' },
  ounce: { normalized: 'oz', singular: 'oz', plural: 'oz' },
  ounces: { normalized: 'oz', singular: 'oz', plural: 'oz' },
  oz: { normalized: 'oz', singular: 'oz', plural: 'oz' },
  pound: { normalized: 'lb', singular: 'lb', plural: 'lb' },
  pounds: { normalized: 'lb', singular: 'lb', plural: 'lb' },
  lb: { normalized: 'lb', singular: 'lb', plural: 'lb' },
  lbs: { normalized: 'lb', singular: 'lb', plural: 'lb' },
  whole: { normalized: 'whole', singular: 'whole', plural: 'whole' },
  piece: { normalized: 'piece', singular: 'piece', plural: 'pieces' },
  pieces: { normalized: 'piece', singular: 'piece', plural: 'pieces' },
  slice: { normalized: 'slice', singular: 'slice', plural: 'slices' },
  slices: { normalized: 'slice', singular: 'slice', plural: 'slices' },
  clove: { normalized: 'clove', singular: 'clove', plural: 'cloves' },
  cloves: { normalized: 'clove', singular: 'clove', plural: 'cloves' },
  head: { normalized: 'head', singular: 'head', plural: 'heads' },
  heads: { normalized: 'head', singular: 'head', plural: 'heads' },
  can: { normalized: 'can', singular: 'can', plural: 'cans' },
  cans: { normalized: 'can', singular: 'can', plural: 'cans' },
  bunch: { normalized: 'bunch', singular: 'bunch', plural: 'bunches' },
  bunches: { normalized: 'bunch', singular: 'bunch', plural: 'bunches' },
  sprig: { normalized: 'sprig', singular: 'sprig', plural: 'sprigs' },
  sprigs: { normalized: 'sprig', singular: 'sprig', plural: 'sprigs' },
  gram: { normalized: 'g', singular: 'g', plural: 'g' },
  grams: { normalized: 'g', singular: 'g', plural: 'g' },
  g: { normalized: 'g', singular: 'g', plural: 'g' },
  litre: { normalized: 'l', singular: 'l', plural: 'l' },
  liter: { normalized: 'l', singular: 'l', plural: 'l' },
  liters: { normalized: 'l', singular: 'l', plural: 'l' },
  litres: { normalized: 'l', singular: 'l', plural: 'l' },
  l: { normalized: 'l', singular: 'l', plural: 'l' },
  milliliter: { normalized: 'ml', singular: 'ml', plural: 'ml' },
  milliliters: { normalized: 'ml', singular: 'ml', plural: 'ml' },
  ml: { normalized: 'ml', singular: 'ml', plural: 'ml' },
}

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
  return UNIT_FORMS[normalized]?.normalized ?? normalized
}

export const resolveImageUrl = (imageUrl?: string | null): string | null => {
  if (!imageUrl) return null
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl
  if (imageUrl.startsWith('/')) return `${BACKEND_BASE_URL}${imageUrl}`
  return `${BACKEND_BASE_URL}/${imageUrl}`
}

const formatQuantityForDisplay = (quantity: number): string => {
  const numeric = Number(quantity)
  return Number.isInteger(numeric) ? String(numeric) : numeric.toString()
}

const formatUnitForDisplay = (unit: string, quantity: number): string => {
  const normalized = normalizeIngredientUnit(unit).toLowerCase()
  if (!normalized) return ''

  const forms = UNIT_FORMS[normalized]
  if (forms) return Number(quantity) === 1 ? forms.singular : forms.plural
  return Number(quantity) === 1 || normalized.endsWith('s') ? normalized : `${normalized}s`
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
  item: GroceryItem | { name: string; checked: boolean; aisle?: string; source?: string[]; quantity?: number; unit?: string | null },
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